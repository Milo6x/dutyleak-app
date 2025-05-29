import { createDutyLeakServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createDutyLeakServerClient(cookieStore);
    
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
    const { notes = '' } = body;

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

    // Begin transaction
    // Note: Supabase Edge Functions don't support true transactions yet, so we'll use multiple operations
    
    // 1. Update review queue item
    const { error: updateError } = await supabase
      .from('review_queue')
      .update({
        status: 'approved',
        reviewer_id: session.user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update review item', details: updateError.message },
        { status: 500 }
      );
    }

    // 2. Update classification to be active
    const { error: classError } = await supabase
      .from('classifications')
      .update({
        is_active: true
      })
      .eq('id', reviewItem.classification_id);

    if (classError) {
      console.error('Failed to update classification:', classError);
      // Continue anyway to update product
    }

    // 3. Update product with active classification
    const { error: productError } = await supabase
      .from('products')
      .update({
        active_classification_id: reviewItem.classification_id
      })
      .eq('id', reviewItem.product_id);

    if (productError) {
      console.error('Failed to update product:', productError);
      // Continue anyway to return success
    }

    // 4. Add a log entry
    await supabase
      .from('job_logs')
      .insert({
        job_id: null, // Not associated with a job
        level: 'info',
        message: `Classification approved via review queue`,
        metadata: { 
          review_queue_id: id,
          product_id: reviewItem.product_id,
          classification_id: reviewItem.classification_id,
          reviewer_id: session.user.id,
          notes
        }
      });

    return NextResponse.json({
      success: true,
      message: 'Classification approved successfully'
    });
    
  } catch (error) {
    console.error('Review approval API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
