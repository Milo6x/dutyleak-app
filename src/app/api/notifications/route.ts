import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_VIEW')

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    if (filter !== 'all') {
      switch (filter) {
        case 'assignments':
          query = query.eq('type', 'review_assignment')
          break
        case 'alerts':
          query = query.in('type', ['review_overdue', 'workload_warning', 'system_alert'])
          break
        case 'completions':
          query = query.eq('type', 'review_completed')
          break
      }
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadCount || 0,
      total_count: notifications?.length || 0
    })
  } catch (error) {
    console.error('Error in notifications API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, title, message, type = 'info', data = {}, priority = 'medium' } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    // Validate notification type
    const validTypes = ['review_assignment', 'review_completed', 'review_overdue', 'system_alert', 'workload_warning', 'info']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Create notification
    const notification = {
      user_id: user_id || user.id,
      title,
      message,
      type,
      data,
      priority,
      read: false,
      created_at: new Date().toISOString()
    }

    const { data: createdNotification, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ 
      notification: createdNotification,
      message: 'Notification created successfully'
    })
  } catch (error) {
    console.error('Error in notifications API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Update notification (mark as read, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notification_ids, action } = body

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json({ 
        error: 'notification_ids must be a non-empty array' 
      }, { status: 400 })
    }

    let updateData: any = {}

    switch (action) {
      case 'mark_read':
        updateData = {
          read: true,
          read_at: new Date().toISOString()
        }
        break
      case 'mark_unread':
        updateData = {
          read: false,
          read_at: null
        }
        break
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Must be: mark_read or mark_unread' 
        }, { status: 400 })
    }

    const { data: updatedNotifications, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('user_id', user.id)
      .in('id', notification_ids)
      .select()

    if (error) {
      console.error('Error updating notifications:', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ 
      notifications: updatedNotifications,
      updated_count: updatedNotifications?.length || 0,
      message: `Successfully updated ${updatedNotifications?.length || 0} notifications`
    })
  } catch (error) {
    console.error('Error in notifications PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationIds = searchParams.get('ids')?.split(',') || []
    const deleteAll = searchParams.get('all') === 'true'
    const deleteRead = searchParams.get('read_only') === 'true'

    if (!deleteAll && notificationIds.length === 0) {
      return NextResponse.json({ 
        error: 'Must provide notification IDs or set all=true' 
      }, { status: 400 })
    }

    let query = supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (deleteAll) {
      if (deleteRead) {
        query = query.eq('read', true)
      }
    } else {
      query = query.in('id', notificationIds)
    }

    const { error, count } = await query

    if (error) {
      console.error('Error deleting notifications:', error)
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
    }

    return NextResponse.json({ 
      deleted_count: count || 0,
      message: `Successfully deleted ${count || 0} notifications`
    })
  } catch (error) {
    console.error('Error in notifications DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}