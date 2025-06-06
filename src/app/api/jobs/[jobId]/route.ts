import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
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
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, type, status, progress, parameters, error, created_at, started_at, completed_at')
      .eq('id', jobId)
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Job not found', details: jobError.message },
        { status: 404 }
      );
    }

    // Get job logs
    const { data: logs, error: logsError } = await supabase
      .from('job_logs')
      .select('id, level, message, metadata, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (logsError) {
      console.error('Failed to fetch job logs:', logsError);
      // Continue anyway to return at least the job details
    }

    // Get related entities
    const { data: relatedEntities, error: entitiesError } = await supabase
      .from('job_related_entities')
      .select('entity_type, entity_id')
      .eq('job_id', jobId);

    if (entitiesError) {
      console.error('Failed to fetch related entities:', entitiesError);
      // Continue anyway to return at least the job details
    }

    return NextResponse.json({
      job,
      logs: logs || [],
      relatedEntities: relatedEntities || []
    });
    
  } catch (error) {
    console.error('Job details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
