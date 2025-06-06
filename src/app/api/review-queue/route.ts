import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(req);
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      );
    }

    const { user, workspace_id } = workspaceAccess;

    // Check if user has permission to view review queue
    const hasPermission = await checkUserPermission(
      user.id,
      workspace_id,
      'DATA_VIEW'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view review queue' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get review queue items
    const { data: items, error: itemsError, count } = await supabase
      .from('review_queue')
      .select(`
        id, 
        product_id,
        classification_id,
        confidence_score,
        reason,
        status,
        created_at
      `, { count: 'exact' })
      .eq('workspace_id', workspace_id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch review queue', details: itemsError.message },
        { status: 500 }
      );
    }

    // Get classification and product details for each item
    const itemsWithClassification = await Promise.all(
      items.map(async (item) => {
        const { data: classification, error: classError } = await supabase
          .from('classifications')
          .select('hs6, hs8')
          .eq('id', item.classification_id)
          .single();
          
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('title')
          .eq('id', item.product_id)
          .single();
          
        return {
          id: item.id,
          productId: item.product_id,
          productName: product?.title || 'Unknown Product',
          classificationId: item.classification_id,
          hsCode: classification?.hs8 || classification?.hs6 || 'Unknown',
          confidenceScore: item.confidence_score,
          reason: item.reason,
          status: item.status,
          createdAt: item.created_at
        };
      })
    );

    return NextResponse.json({
      items: itemsWithClassification,
      total: count || 0,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Review queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Check authentication
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { item_id, action, notes } = body;

    if (!item_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: item_id and action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get user's workspace_id
    const { data: workspaceUser, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspaceUser) {
      return NextResponse.json(
        { error: 'User not associated with any workspace' },
        { status: 400 }
      );
    }

    // Verify the review item belongs to the user's workspace
    const { data: reviewItem, error: reviewError } = await supabase
      .from('review_queue')
      .select('id, product_id, classification_id, workspace_id')
      .eq('id', item_id)
      .eq('workspace_id', workspaceUser.workspace_id)
      .single();

    if (reviewError || !reviewItem) {
      return NextResponse.json(
        { error: 'Review item not found or access denied' },
        { status: 404 }
      );
    }

    // Update the review queue item
    const { error: updateError } = await supabase
      .from('review_queue')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null
      })
      .eq('id', item_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update review item', details: updateError.message },
        { status: 500 }
      );
    }

    // If approved, update the product's classification
    if (action === 'approve') {
      const { error: productUpdateError } = await supabase
        .from('products')
        .update({
          active_classification_id: reviewItem.classification_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewItem.product_id);

      if (productUpdateError) {
        console.error('Failed to update product classification:', productUpdateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: `Review item ${action}d successfully`
    });
    
  } catch (error) {
    console.error('Review queue PATCH API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(req);
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      );
    }

    const { user, workspace_id } = workspaceAccess;

    // Check if user has permission to manage review queue
    const hasPermission = await checkUserPermission(
      user.id,
      workspace_id,
      'DATA_UPDATE'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage review queue' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { item_ids, action, notes } = body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: item_ids (array)' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Process each item
    const results = [];
    const errors = [];

    for (const item_id of item_ids) {
      try {
        // Verify the review item belongs to the user's workspace
        const { data: reviewItem, error: reviewError } = await supabase
          .from('review_queue')
          .select('id, product_id, classification_id, workspace_id')
          .eq('id', item_id)
          .eq('workspace_id', workspace_id)
          .single();

        if (reviewError || !reviewItem) {
          errors.push({ item_id, error: 'Review item not found or access denied' });
          continue;
        }

        // Update the review queue item
        const { error: updateError } = await supabase
          .from('review_queue')
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewer_notes: notes || null
          })
          .eq('id', item_id);

        if (updateError) {
          errors.push({ item_id, error: 'Failed to update review item' });
          continue;
        }

        // If approved, update the product's classification
        if (action === 'approve') {
          const { error: productUpdateError } = await supabase
            .from('products')
            .update({
              active_classification_id: reviewItem.classification_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', reviewItem.product_id);

          if (productUpdateError) {
            console.error('Failed to update product classification:', productUpdateError);
            // Don't fail the request, just log the error
          }
        }

        results.push({ item_id, status: 'success' });
        
      } catch (error) {
        errors.push({ item_id, error: 'Unexpected error occurred' });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      errorCount: errors.length,
      results,
      errors
    });
    
  } catch (error) {
    console.error('Bulk review queue API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
