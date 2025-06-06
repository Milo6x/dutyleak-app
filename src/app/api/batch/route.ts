import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { batchProcessor } from '@/lib/batch/advanced-batch-processor'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { 
      type, 
      productIds, 
      priority = 'medium',
      parameters = {} 
    } = body

    // Validate request
    if (!type) {
      return NextResponse.json(
        { error: 'Job type is required' },
        { status: 400 }
      )
    }

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 }
      )
    }

    // Verify user has access to products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, workspace_id')
      .in('id', productIds)
    
    if (productsError) {
      return NextResponse.json(
        { error: 'Failed to verify product access' },
        { status: 500 }
      )
    }

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products not found or access denied' },
        { status: 403 }
      )
    }

    // Create batch job
    const jobId = await batchProcessor.addJob(
      type,
      {
        productIds,
        parameters: {
          ...parameters,
          userId: session.user.id,
          workspaceId: products[0]?.workspace_id
        }
      },
      priority
    )

    return NextResponse.json({
      success: true,
      jobId,
      message: `Batch job created successfully`
    })

  } catch (error) {
    console.error('Batch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')

    // Build filter
    const filter: any = {}
    if (status) {filter.status = status}
    if (type) {filter.type = type}
    if (priority) {filter.priority = priority}

    // Get jobs
    const jobs = batchProcessor.getJobs(filter)
    const queueStatus = batchProcessor.getQueueStatus()

    return NextResponse.json({
      success: true,
      jobs,
      queueStatus
    })

  } catch (error) {
    console.error('Batch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}