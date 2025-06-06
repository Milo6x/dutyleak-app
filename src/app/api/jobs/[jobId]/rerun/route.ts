import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
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

    const { jobId } = params;
    
    // Get job details to verify it exists and belongs to user's workspace
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, type, status, parameters, workspace_id')
      .eq('id', jobId)
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Job not found', details: jobError.message },
        { status: 404 }
      );
    }

    // Check if job is in a state that can be rerun
    if (job.status !== 'failed' && job.status !== 'canceled') {
      return NextResponse.json(
        { error: `Cannot rerun job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Create a new job with the same parameters
    const { data: newJob, error: createError } = await supabase
      .from('jobs')
      .insert({
        workspace_id: job.workspace_id,
        type: job.type,
        parameters: job.parameters,
        status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create new job', details: createError.message },
        { status: 500 }
      );
    }

    // Add job log for the original job
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'info',
        message: `Job rerun initiated, new job ID: ${newJob.id}`,
        metadata: { new_job_id: newJob.id, user_id: session.user.id }
      });

    // Add job log for the new job
    await supabase
      .from('job_logs')
      .insert({
        job_id: newJob.id,
        level: 'info',
        message: `Job created as rerun of job ID: ${jobId}`,
        metadata: { original_job_id: jobId, user_id: session.user.id }
      });

    // Start job processing (async)
    await startJobProcessing(newJob.id, job.type, job.parameters);

    return NextResponse.json({
      success: true,
      message: 'Job rerun initiated successfully',
      newJobId: newJob.id
    });
    
  } catch (error) {
    console.error('Job rerun API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to start job processing asynchronously
async function startJobProcessing(jobId: string, type: string, parameters: any) {
  // This would typically be handled by a background worker
  // For now, we'll use a simple fetch to a worker endpoint
  try {
    // Update job status to running
    const supabase = createAdminClient();
    
    await supabase
      .from('jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Call the appropriate worker based on job type
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/workers/${type}`;
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.JOBS_WORKER_SECRET}`
      },
      body: JSON.stringify({
        jobId,
        parameters
      })
    });

    if (!response.ok) {
      throw new Error(`Worker API returned ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to start job processing for job ${jobId}:`, error);
    
    // Update job status to failed
    const supabase = createAdminClient();
    
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: error.message || 'Failed to start job processing',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'error',
        message: 'Failed to start job processing',
        metadata: { error: error.message || 'Unknown error' }
      });
  }
}

// Helper function to create admin client
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Import createClient at the top of the file
import { createClient } from '@supabase/supabase-js';
