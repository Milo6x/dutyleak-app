import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_VIEW')

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('review_queue')
      .select(`
        id,
        classification_id,
        confidence_score,
        created_at,
        product_id,
        reason,
        reviewed_at,
        reviewer_notes,
        status,
        updated_at,
        workspace_id
      `)
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    const { data: reviewItems, error: reviewError } = await query

    if (reviewError) {
      console.error('Review queue fetch error:', reviewError)
      return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
    }

    // Return review items without comments for now
    const itemsWithComments = (reviewItems || []).map((item) => ({
      ...item,
      comments: []
    }))

    // Get summary statistics
    const { data: stats } = await supabase
      .from('review_queue')
      .select('status')
      .eq('workspace_id', workspace_id)

    const summary = calculateQueueSummary(stats || [])

    return NextResponse.json({
      success: true,
      items: itemsWithComments,
      summary,
      pagination: {
        limit,
        offset,
        total: itemsWithComments.length
      }
    })

  } catch (error) {
    console.error('Review queue API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_VIEW')

    const body = await request.json()
    const {
      type,
      title,
      description,
      priority = 'medium',
      productId,
      productName,
      currentValue,
      suggestedValue,
      confidence,
      impact,
      metadata = {}
    } = body

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description' },
        { status: 400 }
      )
    }

    // Insert new review item
    const { data: newItem, error: insertError } = await supabase
      .from('review_queue')
      .insert({
        classification_id: 'temp-classification-id', // This should be a real classification ID
        product_id: productId,
        workspace_id: workspace_id,
        status: 'pending',
        confidence_score: confidence,
        reason: description || 'Review requested'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Review item creation error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create review item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: {
        ...newItem,
        comments: []
      }
    })

  } catch (error) {
    console.error('Review queue POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_VIEW')

    const body = await request.json()
    const { id, status, reviewedBy, metadata } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    // Update review item
    const updateData: any = {
      status
    }

    if (status === 'approved' || status === 'rejected') {
      updateData.reviewed_at = new Date().toISOString()
      updateData.reviewer_notes = reviewedBy || user.email
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('review_queue')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()

    if (updateError) {
      console.error('Review item update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update review item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      comments: []
    })

  } catch (error) {
    console.error('Review queue PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateQueueSummary(items: any[]) {
  const summary = {
    total: items.length,
    pending: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    classification: 0,
    optimization: 0,
    validation: 0,
    other: 0
  }

  items.forEach(item => {
    // Count by status
    switch (item.status) {
      case 'pending':
        summary.pending++
        break
      case 'in-review':
        summary.inReview++
        break
      case 'approved':
        summary.approved++
        break
      case 'rejected':
        summary.rejected++
        break
    }

    // Count by priority
    switch (item.priority) {
      case 'high':
        summary.highPriority++
        break
      case 'medium':
        summary.mediumPriority++
        break
      case 'low':
        summary.lowPriority++
        break
    }

    // Count by type
    switch (item.type) {
      case 'classification':
        summary.classification++
        break
      case 'optimization':
        summary.optimization++
        break
      case 'validation':
        summary.validation++
        break
      default:
        summary.other++
        break
    }
  })

  return summary
}