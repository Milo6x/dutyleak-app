import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
// import { JobProcessor } from '@/lib/jobs/job-processor'; // No longer used directly here
import { batchProcessor, BatchJob } from '@/lib/batch/advanced-batch-processor'; // Import AdvancedBatchProcessor

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
    const { type, parameters = {}, priority = 'medium' } = body; // Changed 'metadata' to 'parameters' to match common usage, and added 'priority'

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      );
    }

    // Validate job type
    // Note: AdvancedBatchProcessor has its own type definition for BatchJob['type']
    // We should ideally validate against that or ensure consistency.
    // For now, keeping existing validation.
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

    // Prepare metadata for AdvancedBatchProcessor
    // AdvancedBatchProcessor's BatchJob['metadata'] includes:
    // productIds?, parameters?, retryCount?, maxRetries?, estimatedDuration?, actualDuration?, workspaceId?
    
    // Separate productIds from other parameters if present in the request's 'parameters' object
    const { productIds, ...otherJobParams } = parameters;

    const jobMetadataForProcessor: BatchJob['metadata'] = {
        parameters: { // Store other custom parameters here
            ...otherJobParams, 
            userId: user.id // Add userId to the nested parameters object
        }, 
        workspaceId: workspaceUser.workspace_id,
        productIds: productIds // Assign extracted productIds to the top-level metadata.productIds
    };

    // Add job to AdvancedBatchProcessor queue
    // The batchProcessor will handle persistence if enabled.
    const jobId = await batchProcessor.addJob(
      type as BatchJob['type'], // Ensure type matches BatchJob['type']
      jobMetadataForProcessor,
      priority as BatchJob['priority'] // Ensure priority matches BatchJob['priority']
    );

    if (!jobId) {
      console.error('Job creation API error: AdvancedBatchProcessor.addJob did not return a jobId');
      return NextResponse.json(
        { error: 'Failed to create job using AdvancedBatchProcessor' },
        { status: 500 }
      );
    }

    // Get the job details from the processor to return
    const jobDetails = batchProcessor.getJob(jobId);

    if (!jobDetails) {
      // This case should ideally not happen if addJob succeeded and persistence is on.
      console.error(`Job creation API error: Job ${jobId} not found in AdvancedBatchProcessor after creation.`);
      return NextResponse.json(
        { error: 'Failed to retrieve job details after creation' },
        { status: 500 }
      );
    }
    
    // The AdvancedBatchProcessor handles its own async processing, no need to call JobProcessor here.

    return NextResponse.json({
      success: true,
      job: { // Return a structure consistent with what the client might expect
        id: jobDetails.id,
        type: jobDetails.type,
        status: jobDetails.status,
        priority: jobDetails.priority,
        progress: jobDetails.progress.percentage,
        createdAt: jobDetails.timestamps.created.toISOString(),
        metadata: jobDetails.metadata.parameters, // Return the original parameters
        fullJobDetails: jobDetails // Optionally return the full object for more detail
      }
    });
    
  } catch (error: any) {
    console.error('Job creation API error:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
