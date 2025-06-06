import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notificationManager } from '@/lib/notifications/notification-manager'

/**
 * GET /api/review-queue/notifications
 * Get review-related notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'assignments', 'completions', 'overdue'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    // Define review-related notification types
    const reviewTypes = [
      'review_assignment',
      'review_completed', 
      'review_overdue',
      'workload_warning'
    ]

    let types = reviewTypes
    if (type) {
      switch (type) {
        case 'assignments':
          types = ['review_assignment']
          break
        case 'completions':
          types = ['review_completed']
          break
        case 'overdue':
          types = ['review_overdue']
          break
        case 'workload':
          types = ['workload_warning']
          break
      }
    }

    // Get notifications from the in-app service
    const { notifications, total, unread } = await notificationManager['inAppNotificationService'].getNotifications(
      user.id,
      {
        limit,
        offset,
        unreadOnly,
        types
      }
    )

    // Get notification statistics
    const stats = await notificationManager.getNotificationStats(user.id)

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        unread,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats: {
        reviewNotifications: {
          assignments: stats.byType['review_assignment'] || 0,
          completions: stats.byType['review_completed'] || 0,
          overdue: stats.byType['review_overdue'] || 0,
          workload: stats.byType['workload_warning'] || 0
        },
        totalUnread: stats.unread
      }
    })
  } catch (error) {
    console.error('Error fetching review notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/review-queue/notifications
 * Create a new review-related notification
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, target_user_id, assignment_id, item_id, data } = body

    // Validate required fields
    if (!type || !target_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: type, target_user_id' },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes = [
      'review_assignment',
      'review_completed',
      'review_overdue',
      'workload_warning'
    ]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      )
    }

    // Check if user has permission to send notifications
    // (e.g., admin, reviewer, or system)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !['admin', 'reviewer', 'system'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Handle different notification types
    switch (type) {
      case 'review_assignment':
        if (!assignment_id || !item_id) {
          return NextResponse.json(
            { error: 'assignment_id and item_id required for review_assignment' },
            { status: 400 }
          )
        }

        // Get assignment and item details
        const { data: assignment } = await supabase
          .from('review_assignments')
          .select('*')
          .eq('id', assignment_id)
          .single()

        const { data: reviewItem } = await supabase
          .from('review_queue')
          .select('*')
          .eq('id', item_id)
          .single()

        if (!assignment || !reviewItem) {
          return NextResponse.json(
            { error: 'Assignment or review item not found' },
            { status: 404 }
          )
        }

        await notificationManager.notifyReviewAssignment(
          target_user_id,
          assignment,
          reviewItem
        )
        break

      case 'review_completed':
        if (!assignment_id || !item_id || !data?.decision) {
          return NextResponse.json(
            { error: 'assignment_id, item_id, and decision required for review_completed' },
            { status: 400 }
          )
        }

        // Get assignment and item details
        const { data: completedAssignment } = await supabase
          .from('review_assignments')
          .select('*')
          .eq('id', assignment_id)
          .single()

        const { data: completedItem } = await supabase
          .from('review_queue')
          .select('*')
          .eq('id', item_id)
          .single()

        if (!completedAssignment || !completedItem) {
          return NextResponse.json(
            { error: 'Assignment or review item not found' },
            { status: 404 }
          )
        }

        await notificationManager.notifyReviewCompletion(
          target_user_id,
          completedAssignment.reviewer_id,
          completedAssignment,
          completedItem,
          data.decision
        )
        break

      case 'workload_warning':
        if (!data?.currentAssignments || !data?.threshold) {
          return NextResponse.json(
            { error: 'currentAssignments and threshold required for workload_warning' },
            { status: 400 }
          )
        }

        await notificationManager.notifyWorkloadWarning(
          target_user_id,
          {
            currentAssignments: data.currentAssignments,
            threshold: data.threshold,
            pendingItems: data.pendingItems || 0
          }
        )
        break

      default:
        return NextResponse.json(
          { error: 'Notification type not implemented' },
          { status: 400 }
        )
    }

    return NextResponse.json(
      { message: 'Notification sent successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating review notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/review-queue/notifications
 * Mark review notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notification_ids, mark_all_read } = body

    if (mark_all_read) {
      // Mark all review-related notifications as read
      const reviewTypes = [
        'review_assignment',
        'review_completed',
        'review_overdue',
        'workload_warning'
      ]

      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('type', reviewTypes)
        .eq('read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { message: 'All review notifications marked as read' },
        { status: 200 }
      )
    }

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json(
        { error: 'notification_ids array required' },
        { status: 400 }
      )
    }

    // Mark specific notifications as read
    const updatedCount = await notificationManager['inAppNotificationService'].markMultipleAsRead(
      notification_ids,
      user.id
    )

    return NextResponse.json(
      { 
        message: `${updatedCount} notifications marked as read`,
        updated_count: updatedCount
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating review notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}