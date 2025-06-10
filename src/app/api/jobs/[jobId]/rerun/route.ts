import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { batchProcessor, BatchJob } from '@/lib/batch/advanced-batch-processor'; // Import AdvancedBatchProcessor
// createClient is not needed here anymore if startJobProcessing is removed
// import { createClient } from '@supabase/supabase-js'; 

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createDutyLeakServerClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const originalJobId = params.jobId;
    
    const { data: originalJob, error: jobError } = await supabase
      .from('jobs')
      .select('id, type, status, parameters, workspace_id') // Removed user_id, priority from direct select
      .eq('id', originalJobId)
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Original job not found', details: jobError.message },
        { status: 404 }
      );
    }

    if (originalJob.status !== 'failed' && originalJob.status !== 'cancelled') { // Corrected 'canceled' to 'cancelled' if that's the status used
      return NextResponse.json(
        { error: `Cannot rerun job with status: ${originalJob.status}. Only 'failed' or 'cancelled' jobs can be rerun.` },
        { status: 400 }
      );
    }

    // Prepare metadata for the new job using AdvancedBatchProcessor
    // originalJob.parameters is the JSONB field from the 'jobs' table.
    // AdvancedBatchProcessor.persistJob stores job.metadata (which includes productIds and a nested 'parameters' object)
    // into this top-level 'parameters' field in the DB.
    const persistedParams = (originalJob.parameters || {}) as { [key: string]: any; productIds?: string[]; parameters?: { [key: string]: any } };

    const productIdsForNewJob = Array.isArray(persistedParams.productIds) ? persistedParams.productIds : undefined;
    const originalRequestParams = (typeof persistedParams.parameters === 'object' && persistedParams.parameters !== null) 
                                  ? persistedParams.parameters 
                                  : {};

    const newJobMetadata: BatchJob['metadata'] = {
      parameters: { // This is for the new job's metadata.parameters field
        ...originalRequestParams, // Spread the original job's actual parameters
        userId: session.user.id, // User initiating the rerun
        originalJobId: originalJob.id, // Link to the original job
        rerunAttempt: (Number(originalRequestParams.rerunAttempt) || 0) + 1,
      },
      workspaceId: originalJob.workspace_id, // This is from the top-level originalJob record
      productIds: productIdsForNewJob, // This is from the persisted metadata's productIds
    };
    
    // Determine priority for the new job.
    // Priority of the original job is not stored as a top-level DB column by AdvancedBatchProcessor.
    // It would be in originalRequestParams if the initial /api/jobs POST request included 'priority' inside its 'parameters' body.
    // The /api/jobs POST takes priority as a top-level field in the request, not inside 'parameters'.
    // So, for now, new rerun jobs will default to 'medium' or use priority from original request if it was somehow passed into originalRequestParams.
    const newJobPriority = (originalRequestParams.priority || 'medium') as BatchJob['priority'];

    // Add the new job using AdvancedBatchProcessor
    const newJobId = await batchProcessor.addJob(
      originalJob.type as BatchJob['type'], // Type from the original job
      newJobMetadata,
      newJobPriority
    );

    if (!newJobId) {
      throw new Error('AdvancedBatchProcessor.addJob did not return a new job ID during rerun.');
    }

    // Optionally, update the status of the old job to 'retried' or similar
    await supabase
      .from('jobs')
      .update({ status: 'retried' as BatchJob['status'], error: `Rerun as new job: ${newJobId}` }) // Add a custom status if needed
      .eq('id', originalJobId);

    // Job logs would be handled by AdvancedBatchProcessor or could be added here
    // For simplicity, relying on AdvancedBatchProcessor's logging for the new job.
    // Log for original job:
    await supabase
      .from('job_logs') // Assuming job_logs table exists
      .insert({
        job_id: originalJobId,
        level: 'info',
        message: `Job rerun requested. New job ID: ${newJobId}`,
        metadata: { new_job_id: newJobId, user_id: session.user.id }
      });


    return NextResponse.json({
      success: true,
      message: 'Job successfully re-queued for processing.',
      newJobId: newJobId,
      newJobDetails: batchProcessor.getJob(newJobId) // Optionally return new job details
    });
    
  } catch (error: any) {
    console.error('Job rerun API error:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// The startJobProcessing function and createAdminClient are no longer needed here
// as AdvancedBatchProcessor handles its own processing loop.
// If they were used for other purposes, they should be re-evaluated.
