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
    const { 
      newHsCode,
      justification
    } = body;

    if (!newHsCode) {
      return NextResponse.json(
        { error: 'Missing required field: newHsCode' },
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

    // Determine HS6 and HS8
    const hs6 = newHsCode.substring(0, 6);
    const hs8 = newHsCode.length >= 8 ? newHsCode : null;
    
    // Create a new classification with the override
    const { data: newClassification, error: classError } = await supabase
      .from('classifications')
      .insert({
        product_id: reviewItem.product_id,
        hs6,
        hs8,
        confidence_score: 1.0, // Manual override has 100% confidence
        source: 'manual_override',
        ruling_reference: justification || 'Manual override',
        is_active: true
      })
      .select()
      .single();

    if (classError) {
      return NextResponse.json(
        { error: 'Failed to create new classification', details: classError.message },
        { status: 500 }
      );
    }

    // Update review queue item
    const { error: updateError } = await supabase
      .from('review_queue')
      .update({
        status: 'overridden',
        reviewer_id: session.user.id,
        reviewed_at: new Date().toISOString()
      })
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
      message: 'Classification overridden successfully',
      newClassificationId: newClassification.id
    });
    
  } catch (error) {
    console.error('Review override API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
