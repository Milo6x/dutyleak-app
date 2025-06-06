import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { JobProcessor } from '@/lib/jobs/job-processor';

export async function GET(req: NextRequest) {
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
      .eq('user_id', user.id)
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
      .select('id, type, status, progress, created_at, started_at, completed_at, error, metadata', { count: 'exact' })
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

export async function POST(req: NextRequest) {
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
    const { type, metadata = {} } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    // Validate job type
    const validJobTypes = [
      'bulk_classification',
      'bulk_fba_calculation',
      'duty_optimization',
      'data_export',
      'data_import',
      'scenario_analysis'
    ];

    if (!validJobTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid job type. Must be one of: ${validJobTypes.join(', ')}` },
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

    // Create job in database
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        workspace_id: workspaceUser.workspace_id,
        type,
        status: 'pending',
        progress: 0,
        parameters: metadata
      })
      .select('id, type, status, progress, created_at, parameters')
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to create job', details: jobError.message },
        { status: 500 }
      );
    }

    // Initialize job processor and start the job asynchronously
    const jobProcessor = new JobProcessor();
    
    // Don't await this - let it run in the background
    jobProcessor.processJob(job.id, type, metadata, supabase)
      .catch(error => {
        console.error(`Background job ${job.id} failed:`, error);
      });

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.created_at,
        metadata: job.parameters
      }
    });
    
  } catch (error) {
    console.error('Job creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
