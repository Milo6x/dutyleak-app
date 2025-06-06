import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface AssignmentRequest {
  itemIds: string[]
  reviewerId?: string
  assignmentType: 'auto' | 'manual'
  notes?: string
}

interface AutoAssignmentResult {
  itemId: string
  reviewerId: string
  score: number
  reason: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AssignmentRequest = await request.json()
    const { itemIds, reviewerId, assignmentType, notes } = body

    if (!itemIds || itemIds.length === 0) {
      return NextResponse.json({ error: 'No items specified for assignment' }, { status: 400 })
    }

    if (assignmentType === 'manual' && !reviewerId) {
      return NextResponse.json({ error: 'Reviewer ID required for manual assignment' }, { status: 400 })
    }

    let assignments: AutoAssignmentResult[] = []

    if (assignmentType === 'auto') {
      // Implement auto-assignment logic
      assignments = await calculateOptimalAssignments(supabase, itemIds)
    } else {
      // Manual assignment
      assignments = itemIds.map(itemId => ({
        itemId,
        reviewerId: reviewerId!,
        score: 100, // Manual assignments get max score
        reason: 'Manual assignment'
      }))
    }

    // Execute assignments
    const results = []
    for (const assignment of assignments) {
      try {
        const result = await assignItemToReviewer(
          supabase,
          assignment.itemId,
          assignment.reviewerId,
          notes || assignment.reason,
          user.id
        )
        results.push({
          ...assignment,
          success: true,
          assignmentId: result.id
        })
      } catch (error) {
        console.error(`Failed to assign item ${assignment.itemId}:`, error)
        results.push({
          ...assignment,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Send notifications
    await sendAssignmentNotifications(supabase, results.filter(r => r.success))

    return NextResponse.json({
      success: true,
      assignments: results,
      totalAssigned: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    })

  } catch (error) {
    console.error('Assignment error:', error)
    return NextResponse.json(
      { error: 'Failed to process assignments' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    switch (type) {
      case 'reviewers':
        return await getReviewers(supabase)
      case 'items':
        return await getReviewItems(supabase, searchParams)
      case 'rules':
        return await getAssignmentRules(supabase)
      case 'overview':
      default:
        return await getAssignmentOverview(supabase)
    }

  } catch (error) {
    console.error('Get assignment data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignment data' },
      { status: 500 }
    )
  }
}

async function calculateOptimalAssignments(
  supabase: any,
  itemIds: string[]
): Promise<AutoAssignmentResult[]> {
  // Get review items
  const { data: items, error: itemsError } = await supabase
    .from('review_queue')
    .select(`
      *,
      products (title, asin, category),
      classifications (hs_code, description, confidence)
    `)
    .in('id', itemIds)

  if (itemsError) {
    throw new Error(`Failed to fetch review items: ${itemsError.message}`)
  }

  // Get available reviewers
  const { data: reviewers, error: reviewersError } = await supabase
    .from('reviewers')
    .select('*')
    .eq('availability_status', 'available')
    .lt('current_workload', supabase.raw('max_capacity'))

  if (reviewersError) {
    throw new Error(`Failed to fetch reviewers: ${reviewersError.message}`)
  }

  const assignments: AutoAssignmentResult[] = []

  for (const item of items) {
    let bestReviewer = null
    let bestScore = 0
    let bestReason = ''

    for (const reviewer of reviewers) {
      const score = calculateAssignmentScore(item, reviewer)
      const reason = generateAssignmentReason(item, reviewer, score)

      if (score.total > bestScore) {
        bestScore = score.total
        bestReviewer = reviewer
        bestReason = reason
      }
    }

    if (bestReviewer) {
      assignments.push({
        itemId: item.id,
        reviewerId: bestReviewer.id,
        score: bestScore,
        reason: bestReason
      })
    } else {
      throw new Error(`No suitable reviewer found for item ${item.id}`)
    }
  }

  return assignments
}

function calculateAssignmentScore(item: any, reviewer: any) {
  let expertiseScore = 0
  let workloadScore = 0
  let performanceScore = 0

  // Expertise matching (40% weight)
  const itemExpertise = item.requires_expertise || []
  const reviewerExpertise = reviewer.expertise_areas || []
  const expertiseMatch = itemExpertise.some((exp: string) => 
    reviewerExpertise.includes(exp)
  )
  expertiseScore = expertiseMatch ? 40 : 0

  // Workload balance (30% weight)
  const workloadRatio = reviewer.current_workload / reviewer.max_capacity
  workloadScore = (1 - workloadRatio) * 30

  // Performance metrics (30% weight)
  const metrics = reviewer.performance_metrics || {}
  performanceScore = (
    (metrics.accuracy_rate || 0.8) * 15 +
    (1 - (metrics.escalation_rate || 0.1)) * 15
  )

  // Role-based bonus
  let roleBonus = 0
  if (item.complexity_score >= 8 && reviewer.role === 'expert') {
    roleBonus = 10
  } else if (item.complexity_score >= 6 && reviewer.role === 'senior') {
    roleBonus = 5
  }

  return {
    expertise: expertiseScore,
    workload: workloadScore,
    performance: performanceScore,
    roleBonus,
    total: expertiseScore + workloadScore + performanceScore + roleBonus
  }
}

function generateAssignmentReason(item: any, reviewer: any, score: any): string {
  const reasons = []
  
  if (score.expertise > 0) {
    reasons.push('expertise match')
  }
  
  if (score.workload > 20) {
    reasons.push('low workload')
  }
  
  if (score.performance > 25) {
    reasons.push('high performance')
  }
  
  if (score.roleBonus > 0) {
    reasons.push('role suitability')
  }

  return `Auto-assigned based on: ${reasons.join(', ')}`
}

async function assignItemToReviewer(
  supabase: any,
  itemId: string,
  reviewerId: string,
  notes: string,
  assignedBy: string
) {
  // Update review item
  const { data: assignment, error: assignmentError } = await supabase
    .from('review_queue')
    .update({
      status: 'assigned',
      assigned_to: reviewerId,
      assigned_at: new Date().toISOString(),
      assignment_notes: notes,
      assigned_by: assignedBy
    })
    .eq('id', itemId)
    .select()
    .single()

  if (assignmentError) {
    throw new Error(`Failed to assign item: ${assignmentError.message}`)
  }

  // Update reviewer workload
  const { error: workloadError } = await supabase
    .from('reviewers')
    .update({
      current_workload: supabase.raw('current_workload + 1')
    })
    .eq('id', reviewerId)

  if (workloadError) {
    console.error('Failed to update reviewer workload:', workloadError)
  }

  // Log assignment activity
  await supabase
    .from('review_activity_log')
    .insert({
      review_item_id: itemId,
      reviewer_id: reviewerId,
      action: 'assigned',
      details: { notes, assigned_by: assignedBy },
      created_at: new Date().toISOString()
    })

  return assignment
}

async function sendAssignmentNotifications(
  supabase: any,
  assignments: any[]
) {
  try {
    // Group assignments by reviewer
    const reviewerAssignments = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.reviewerId]) {
        acc[assignment.reviewerId] = []
      }
      acc[assignment.reviewerId].push(assignment)
      return acc
    }, {})

    // Send notifications to each reviewer
    for (const [reviewerId, reviewerItems] of Object.entries(reviewerAssignments)) {
      await supabase
        .from('notifications')
        .insert({
          user_id: reviewerId,
          type: 'review_assignment',
          title: `New Review Assignment${(reviewerItems as any[]).length > 1 ? 's' : ''}`,
          message: `You have been assigned ${(reviewerItems as any[]).length} new review item${(reviewerItems as any[]).length > 1 ? 's' : ''} for review.`,
          data: {
            assignments: reviewerItems,
            count: (reviewerItems as any[]).length
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Failed to send assignment notifications:', error)
  }
}

async function getReviewers(supabase: any) {
  const { data: reviewers, error } = await supabase
    .from('reviewers')
    .select(`
      *,
      performance_metrics,
      expertise_areas
    `)
    .order('full_name')

  if (error) {
    throw new Error(`Failed to fetch reviewers: ${error.message}`)
  }

  return NextResponse.json({ reviewers })
}

async function getReviewItems(supabase: any, searchParams: URLSearchParams) {
  let query = supabase
    .from('review_queue')
    .select(`
      *,
      products (title, asin, category),
      classifications (hs_code, description, confidence),
      assigned_reviewer:reviewers!assigned_to (id, full_name, role)
    `)

  // Apply filters
  const status = searchParams.get('status')
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const priority = searchParams.get('priority')
  if (priority && priority !== 'all') {
    query = query.eq('priority', priority)
  }

  const assignedTo = searchParams.get('assigned_to')
  if (assignedTo && assignedTo !== 'all') {
    query = query.eq('assigned_to', assignedTo)
  }

  const search = searchParams.get('search')
  if (search) {
    query = query.ilike('products.title', `%${search}%`)
  }

  const { data: items, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch review items: ${error.message}`)
  }

  return NextResponse.json({ items })
}

async function getAssignmentRules(supabase: any) {
  const { data: rules, error } = await supabase
    .from('assignment_rules')
    .select('*')
    .order('priority')

  if (error) {
    throw new Error(`Failed to fetch assignment rules: ${error.message}`)
  }

  return NextResponse.json({ rules })
}

async function getAssignmentOverview(supabase: any) {
  // Get basic stats
  const [itemsResult, reviewersResult] = await Promise.all([
    supabase
      .from('review_queue')
      .select('status, priority, assigned_to')
      .not('status', 'eq', 'completed'),
    supabase
      .from('reviewers')
      .select('id, availability_status, current_workload, max_capacity')
  ])

  if (itemsResult.error) {
    throw new Error(`Failed to fetch items stats: ${itemsResult.error.message}`)
  }

  if (reviewersResult.error) {
    throw new Error(`Failed to fetch reviewers stats: ${reviewersResult.error.message}`)
  }

  const items = itemsResult.data
  const reviewers = reviewersResult.data

  const stats = {
    totalItems: items.length,
    pendingItems: items.filter((i: any) => i.status === 'pending').length,
    assignedItems: items.filter((i: any) => i.status === 'assigned').length,
    inReviewItems: items.filter((i: any) => i.status === 'in-review').length,
    totalReviewers: reviewers.length,
    availableReviewers: reviewers.filter((r: any) => r.availability_status === 'available').length,
    averageWorkload: reviewers.length > 0 
      ? reviewers.reduce((sum: number, r: any) => sum + r.current_workload, 0) / reviewers.length 
      : 0
  }

  return NextResponse.json({ stats, items, reviewers })
}