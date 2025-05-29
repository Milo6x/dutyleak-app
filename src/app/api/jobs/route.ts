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

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
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

    // Build query
    let query = supabase
      .from('jobs')
      .select('id, type, status, progress, created_at, started_at, completed_at, error', { count: 'exact' })
      .eq('workspace_id', workspaceUser.workspace_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Add filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    // Execute query
    const { data: jobs, error: jobsError, count } = await query;

    if (jobsError) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: jobsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobs,
      total: count || 0,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
