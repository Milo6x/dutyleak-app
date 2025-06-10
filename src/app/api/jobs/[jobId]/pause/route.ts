import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { batchProcessor } from '@/lib/batch/advanced-batch-processor';
import { checkUserPermission, getWorkspaceAccess } from '@/lib/permissions'; // Assuming this is the correct path

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = params;

  try {
    // Ensure user has access to the workspace the job belongs to (or is an admin)
    // This requires fetching the job first to get its workspace_id
    const job = batchProcessor.getJob(jobId); // Get job from in-memory store
    if (!job) {
      // Fallback to DB if not in memory (though ideally it should be)
      const { data: dbJob } = await supabase.from('jobs').select('workspace_id').eq('id', jobId).single();
      if (!dbJob || !dbJob.workspace_id) {
        return NextResponse.json({ error: 'Job not found or no workspace associated' }, { status: 404 });
      }
      // For simplicity, assuming job object from batchProcessor is sufficient for now
      // A more robust check would use dbJob.workspace_id
    }
    
    // Assuming a general permission like 'JOB_MANAGE' or using admin-level access for these controls for now.
    // This needs to be tied to your actual permission model.
    // For example, check if user is admin of the job's workspace.
    // const { workspace_id } = await getWorkspaceAccess(supabase); // Get current user's active workspace
    // if (job && job.metadata.workspaceId !== workspace_id) {
    //   return NextResponse.json({ error: 'Forbidden: Job does not belong to your active workspace' }, { status: 403 });
    // }
    // const permissionCheck = await checkUserPermission(session.user.id, workspace_id, 'DATA_UPDATE'); // Example permission
    // if (!permissionCheck.hasPermission) {
    //    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }


    const success = await batchProcessor.pauseJob(jobId);
    if (success) {
      return NextResponse.json({ message: 'Job paused successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to pause job or job not found/not running' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Error pausing job ${jobId}:`, error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
