import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { batchProcessor } from '@/lib/batch/advanced-batch-processor'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = params
    
    // Get job status
    const job = batchProcessor.getJob(jobId)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })

  } catch (error) {
    console.error('Batch job API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = params
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let result: boolean = false
    let message: string = ''

    switch (action) {
      case 'pause':
        result = await batchProcessor.pauseJob(jobId)
        message = result ? 'Job paused successfully' : 'Failed to pause job'
        break
      
      case 'resume':
        result = await batchProcessor.resumeJob(jobId)
        message = result ? 'Job resumed successfully' : 'Failed to resume job'
        break
      
      case 'cancel':
        result = await batchProcessor.cancelJob(jobId)
        message = result ? 'Job cancelled successfully' : 'Failed to cancel job'
        break
      
      case 'retry':
        // Get the job first to check if it's in a retryable state
        const job = batchProcessor.getJob(jobId)
        if (!job) {
          return NextResponse.json(
            { error: 'Job not found' },
            { status: 404 }
          )
        }
        
        if (job.status !== 'failed') {
          return NextResponse.json(
            { error: 'Only failed jobs can be retried' },
            { status: 400 }
          )
        }
        
        // Reset job status and add back to queue
        if (job.status === 'failed' || job.status === 'cancelled') {
          job.status = 'pending'
          job.metadata.retryCount = (job.metadata.retryCount || 0) + 1
          const newJobId = await batchProcessor.addJob(
            job.type,
            job.metadata,
            job.priority as 'low' | 'medium' | 'high' | 'urgent'
          )
          result = !!newJobId
          message = result ? 'Job queued for retry' : 'Failed to retry job'
        } else {
          result = false
          message = 'Job cannot be retried in current status'
        }
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: pause, resume, cancel, retry' },
          { status: 400 }
        )
    }

    if (!result) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message
    })

  } catch (error) {
    console.error('Batch job action API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = params
    
    // Cancel and remove job
    const cancelled = await batchProcessor.cancelJob(jobId)
    
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    })

  } catch (error) {
    console.error('Batch job delete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}