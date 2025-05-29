import { createDutyLeakServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
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
      .eq('workspace_id', workspaceUser.workspace_id)
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
