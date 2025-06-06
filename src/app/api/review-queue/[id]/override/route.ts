import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    
    // Parse request body
    const body = await req.json();
    const { 
      newHsCode,
      justification,
      reasonCategory,
      reasonSubcategory,
      productCategory,
      requiresApproval = false,
      metadata = {}
    } = body;

    if (!newHsCode || !justification) {
      return NextResponse.json(
        { error: 'New HS code and justification are required' },
        { status: 400 }
      );
    }

    if (!reasonCategory || !reasonSubcategory) {
      return NextResponse.json(
        { error: 'Override reason category and subcategory are required' },
        { status: 400 }
      );
    }

    // Get user's workspace_id
    const { data: workspaceUser, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', session.user.id)
      .single();

    if (workspaceError || !workspaceUser) {
      return NextResponse.json(
        { error: 'User not associated with any workspace' },
        { status: 400 }
      );
    }

    // Get review queue item
    const { data: reviewItem, error: reviewError } = await supabase
      .from('review_queue')
      .select('id, product_id, classification_id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspaceUser.workspace_id)
      .single();

    if (reviewError || !reviewItem) {
      return NextResponse.json(
        { error: 'Review item not found or access denied', details: reviewError?.message },
        { status: 404 }
      );
    }

    // Get user profile for enhanced metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single();

    // Prepare enhanced classification data
    const classificationData = {
      product_id: reviewItem.product_id,
      hs6: newHsCode.substring(0, 6),
      hs8: newHsCode.length >= 8 ? newHsCode.substring(0, 8) : null,
      hs10: newHsCode.length >= 10 ? newHsCode : null,
      confidence_score: 1.0, // Manual override has 100% confidence
      source: 'manual_override',
      workspace_id: workspaceUser.workspace_id,
      created_by: session.user.id,
      metadata: {
        ...metadata,
        override_reason: {
          category: reasonCategory,
          subcategory: reasonSubcategory,
          justification
        },
        product_category: productCategory,
        requires_approval: requiresApproval,
        override_timestamp: new Date().toISOString(),
        overridden_by: {
          user_id: session.user.id,
          user_name: profile?.full_name || session.user.email
        }
      }
    }

    // Create new classification with override
    const { data: newClassification, error: classError } = await supabase
      .from('classifications')
      .insert(classificationData)
      .select()
      .single();

    if (classError) {
      return NextResponse.json(
        { error: 'Failed to create new classification', details: classError.message },
        { status: 500 }
      );
    }

    // Update review queue item status with enhanced information
    const reviewQueueUpdate = {
      status: requiresApproval ? 'pending_approval' : 'overridden',
      reviewer_id: session.user.id,
      reviewed_at: new Date().toISOString(),
      metadata: {
        override_info: {
          reason_category: reasonCategory,
          reason_subcategory: reasonSubcategory,
          requires_approval: requiresApproval,
          overridden_by: session.user.id,
          override_timestamp: new Date().toISOString(),
          new_classification_id: newClassification.id
        }
      }
    }

    const { error: updateError } = await supabase
      .from('review_queue')
      .update(reviewQueueUpdate)
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update review item:', updateError);
      // Continue anyway to update product
    }

    // Update product with new active classification
    const { error: productError } = await supabase
      .from('products')
      .update({
        active_classification_id: newClassification.id
      })
      .eq('id', reviewItem.product_id);

    if (productError) {
      console.error('Failed to update product:', productError);
      // Continue anyway to return success
    }

    // Enhanced audit logging
    await supabase
      .from('audit_logs')
      .insert({
        workspace_id: workspaceUser.workspace_id,
        user_id: session.user.id,
        action: requiresApproval ? 'classification_override_pending' : 'classification_override',
        resource_type: 'review_queue',
        resource_id: id,
        details: {
          product_id: reviewItem.product_id,
          old_classification: {
            classification_id: reviewItem.classification_id,
            confidence: 'unknown',
            source: 'unknown'
          },
          new_classification: {
            hs_code: newHsCode,
            confidence: 1.0,
            source: 'manual_override'
          },
          override_reason: {
            category: reasonCategory,
            subcategory: reasonSubcategory,
            justification
          },
          product_category: productCategory,
          requires_approval: requiresApproval,
          validation_results: metadata.validationResults,
          user_info: {
            user_id: session.user.id,
            user_name: profile?.full_name || session.user.email,
            user_email: session.user.email
          }
        }
      });

    // Add a log entry
    await supabase
      .from('job_logs')
      .insert({
        job_id: null, // Not associated with a job
        level: 'info',
        message: `Classification overridden via review queue`,
        metadata: { 
          review_queue_id: id,
          product_id: reviewItem.product_id,
          old_classification_id: reviewItem.classification_id,
          new_classification_id: newClassification.id,
          reviewer_id: session.user.id,
          new_hs_code: newHsCode,
          justification
        }
      });

    return NextResponse.json({
      success: true,
      message: requiresApproval 
        ? 'Override submitted for approval' 
        : 'Classification overridden successfully',
      data: {
        reviewItemId: params.id,
        newClassificationId: newClassification.id,
        newHsCode,
        status: requiresApproval ? 'pending_approval' : 'overridden',
        requiresApproval,
        overrideReason: {
          category: reasonCategory,
          subcategory: reasonSubcategory
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Review override API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
