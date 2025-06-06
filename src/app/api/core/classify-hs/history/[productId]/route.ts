import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { classificationEngine } from '@/lib/duty/classification-engine';

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = params;
    const { searchParams } = new URL(req.url);
    const includeMetadata = searchParams.get('includeMetadata') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, workspace_id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Get enhanced classification history
    const history = await getEnhancedClassificationHistory(productId, {
      includeMetadata,
      limit,
      offset,
      supabase
    });

    // Get additional audit information if requested
    let auditSummary = null;
    if (includeMetadata) {
      auditSummary = await getAuditSummary(productId, supabase);
    }
    
    return NextResponse.json({
      success: true,
      productId,
      history,
      auditSummary,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    });
    
  } catch (error) {
    console.error('Classification history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getEnhancedClassificationHistory(
  productId: string, 
  options: {
    includeMetadata: boolean
    limit: number
    offset: number
    supabase: any
  }
) {
  const { includeMetadata, limit, offset, supabase } = options;
  
  try {
    // Get base classification history from the existing engine
    const baseHistory = await classificationEngine.getClassificationHistory(productId, supabase);
    
    // Enhance with additional audit trail data
    const { data: auditLogs, error: auditError } = await supabase
      .from('job_logs')
      .select('*')
      .eq('classification_data->>product_id', productId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
      return baseHistory || [];
    }

    // Merge and enhance the data
    const enhancedHistory = baseHistory.map((item: any) => {
      // Find corresponding audit log
      const auditLog = auditLogs?.find(log => {
        const logData = log.classification_data;
        return (
          logData?.hs_code === item.hs8 || 
          logData?.hs_code === item.hs6 ||
          Math.abs(new Date(log.created_at).getTime() - new Date(item.created_at).getTime()) < 60000 // Within 1 minute
        );
      });

      const enhanced = {
        ...item,
        id: item.id || auditLog?.id || `hist_${Date.now()}_${Math.random()}`,
      };

      if (includeMetadata && auditLog) {
        enhanced.user_id = auditLog.user_id;
        enhanced.classification_data = auditLog.classification_data;
        enhanced.updated_at = auditLog.updated_at;
        
        // Extract change tracking information
        const logData = auditLog.classification_data;
        if (logData) {
          enhanced.change_reason = logData.change_reason || logData.reason;
          enhanced.previous_hs_code = logData.previous_hs_code || logData.old_hs_code;
          enhanced.validation_status = logData.validation_status;
          enhanced.override_reason = logData.override_reason;
          enhanced.approval_status = logData.approval_status;
          enhanced.approved_by = logData.approved_by;
          enhanced.approved_at = logData.approved_at;
        }
      }

      return enhanced;
    });

    // Add any audit logs that don't have corresponding history entries
    const orphanedLogs = auditLogs?.filter(log => {
      return !enhancedHistory.some(item => {
        const logData = log.classification_data;
        return (
          logData?.hs_code === item.hs8 || 
          logData?.hs_code === item.hs6 ||
          Math.abs(new Date(log.created_at).getTime() - new Date(item.created_at).getTime()) < 60000
        );
      });
    }) || [];

    // Convert orphaned logs to history format
    const orphanedHistoryItems = orphanedLogs.map(log => {
      const logData = log.classification_data || {};
      return {
        id: log.id,
        hs6: logData.hs6 || (logData.hs_code?.length === 6 ? logData.hs_code : undefined),
        hs8: logData.hs8 || (logData.hs_code?.length === 8 ? logData.hs_code : logData.hs_code),
        confidence_score: logData.confidence_score || logData.confidence,
        source: logData.source || 'audit_log',
        ruling_reference: logData.ruling_reference,
        is_active: false, // Audit logs are typically not active classifications
        created_at: log.created_at,
        updated_at: log.updated_at,
        user_id: log.user_id,
        classification_data: logData,
        change_reason: logData.change_reason || logData.reason,
        previous_hs_code: logData.previous_hs_code || logData.old_hs_code,
        validation_status: logData.validation_status,
        override_reason: logData.override_reason,
        approval_status: logData.approval_status,
        approved_by: logData.approved_by,
        approved_at: logData.approved_at
      };
    });

    // Combine and sort by creation date
    const combinedHistory = [...enhancedHistory, ...orphanedHistoryItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return combinedHistory;
  } catch (error) {
    console.error('Error getting enhanced classification history:', error);
    // Fallback to base history
    return await classificationEngine.getClassificationHistory(productId, supabase) || [];
  }
}

async function getAuditSummary(productId: string, supabase: any) {
  try {
    const { data: logs, error } = await supabase
      .from('job_logs')
      .select('user_id, created_at, classification_data')
      .eq('classification_data->>product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit summary:', error);
      return null;
    }

    const summary = {
      totalEntries: logs?.length || 0,
      uniqueUsers: new Set(logs?.map(log => log.user_id) || []).size,
      dateRange: {
        earliest: logs?.length > 0 ? logs[logs.length - 1].created_at : null,
        latest: logs?.length > 0 ? logs[0].created_at : null
      },
      changeTypes: {
        manual_override: 0,
        ai_classification: 0,
        validation: 0,
        correction: 0,
        other: 0
      },
      approvalStatus: {
        pending: 0,
        approved: 0,
        rejected: 0,
        not_required: 0
      }
    };

    // Analyze change types and approval status
    logs?.forEach(log => {
      const data = log.classification_data || {};
      
      // Categorize change type
      if (data.override_reason) {
        summary.changeTypes.manual_override++;
      } else if (data.source === 'manual') {
        summary.changeTypes.manual_override++;
      } else if (data.validation_status) {
        summary.changeTypes.validation++;
      } else if (data.change_reason?.includes('correction')) {
        summary.changeTypes.correction++;
      } else if (data.source && ['openai', 'anthropic', 'zonos'].includes(data.source)) {
        summary.changeTypes.ai_classification++;
      } else {
        summary.changeTypes.other++;
      }
      
      // Categorize approval status
      const approvalStatus = data.approval_status;
      if (approvalStatus === 'pending') {
        summary.approvalStatus.pending++;
      } else if (approvalStatus === 'approved') {
        summary.approvalStatus.approved++;
      } else if (approvalStatus === 'rejected') {
        summary.approvalStatus.rejected++;
      } else {
        summary.approvalStatus.not_required++;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error generating audit summary:', error);
    return null;
  }
}

// POST endpoint for creating new classification history entries
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = params;
    const body = await req.json();
    
    const {
      hs_code,
      confidence_score,
      source,
      ruling_reference,
      change_reason,
      previous_hs_code,
      validation_status,
      override_reason,
      approval_required = false
    } = body;

    // Verify user has access to this product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Create audit log entry
    const classificationData = {
      product_id: productId,
      hs_code,
      hs6: hs_code?.substring(0, 6),
      hs8: hs_code?.length === 8 ? hs_code : undefined,
      confidence_score,
      source,
      ruling_reference,
      change_reason,
      previous_hs_code,
      validation_status,
      override_reason,
      approval_status: approval_required ? 'pending' : 'not_required',
      user_name: session.user.email || session.user.id,
      timestamp: new Date().toISOString()
    };

    const { data: logEntry, error: logError } = await supabase
      .from('job_logs')
      .insert({
        job_id: `classification-${productId}-${Date.now()}`,
        message: `Classification updated for product ${productId}`,
        level: 'info',
        metadata: {
          user_id: session.user.id,
          classification_data: classificationData,
          product_id: productId
        }
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating audit log:', logError);
      return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      auditLog: logEntry,
      message: 'Classification history entry created successfully'
    });
  } catch (error) {
    console.error('Classification history creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}