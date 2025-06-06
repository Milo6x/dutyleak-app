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
      .select('id, type, status, workspace_id')
      .eq('id', jobId)
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Job not found', details: jobError.message },
        { status: 404 }
      );
    }

    // Check if job is in a state that can be canceled
    if (job.status !== 'pending' && job.status !== 'running') {
      return NextResponse.json(
        { error: `Cannot cancel job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Update job status to canceled
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'canceled',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to cancel job', details: updateError.message },
        { status: 500 }
      );
    }

    // Add job log
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'info',
        message: 'Job canceled by user',
        metadata: { user_id: session.user.id }
      });

    return NextResponse.json({
      success: true,
      message: 'Job canceled successfully'
    });
    
  } catch (error) {
    console.error('Job cancel API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
