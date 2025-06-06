import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { inAppNotificationService } from '@/lib/notifications/in-app-service'
import { toast } from 'sonner'

interface ReviewNotification {
  id: string
  user_id: string
  type: 'review_assignment' | 'review_completed' | 'review_overdue' | 'system_alert' | 'workload_warning'
  title: string
  message: string
  data?: any
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  read_at?: string
  action_url?: string
}

interface NotificationStats {
  total: number
  unread: number
  reviewNotifications: {
    assignments: number
    completions: number
    overdue: number
    workload: number
  }
}

interface UseReviewNotificationsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  showToasts?: boolean
  playSound?: boolean
}

export function useReviewNotifications(options: UseReviewNotificationsOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    showToasts = true,
    playSound = true
  } = options

  const [notifications, setNotifications] = useState<ReviewNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    reviewNotifications: {
      assignments: 0,
      completions: 0,
      overdue: 0,
      workload: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)

  const supabase = createBrowserClient()

  /**
   * Fetch review notifications from API
   */
  const fetchNotifications = useCallback(async (
    page = 0,
    append = false,
    filters: {
      type?: string
      unreadOnly?: boolean
    } = {}
  ) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString()
      })

      if (filters.type) {
        params.append('type', filters.type)
      }

      if (filters.unreadOnly) {
        params.append('unread_only', 'true')
      }

      const response = await fetch(`/api/review-queue/notifications?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()

      if (append) {
        setNotifications(prev => [...prev, ...data.notifications])
      } else {
        setNotifications(data.notifications)
        setCurrentPage(page)
      }

      setStats(data.stats)
      setHasMore(data.pagination.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  /**
   * Load more notifications (pagination)
   */
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(currentPage + 1, true)
    }
  }, [loading, hasMore, currentPage, fetchNotifications])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {return false}

      const success = await inAppNotificationService.markAsRead(notificationId, user.id)
      
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId
              ? { ...notification, read: true, read_at: new Date().toISOString() }
              : notification
          )
        )
        
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }))
      }

      return success
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }, [supabase])

  /**
   * Mark multiple notifications as read
   */
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/review-queue/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_ids: notificationIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      const data = await response.json()
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, read: true, read_at: new Date().toISOString() }
            : notification
        )
      )
      
      setStats(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - data.updated_count)
      }))

      return data.updated_count
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      return 0
    }
  }, [])

  /**
   * Mark all review notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/review-queue/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mark_all_read: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          read: true,
          read_at: new Date().toISOString()
        }))
      )
      
      setStats(prev => ({
        ...prev,
        unread: 0
      }))

      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }, [])

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {return false}

      const success = await inAppNotificationService.deleteNotification(notificationId, user.id)
      
      if (success) {
        const notification = notifications.find(n => n.id === notificationId)
        
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        if (notification && !notification.read) {
          setStats(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1),
            unread: Math.max(0, prev.unread - 1)
          }))
        } else {
          setStats(prev => ({
            ...prev,
            total: Math.max(0, prev.total - 1)
          }))
        }
      }

      return success
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }, [notifications, supabase])

  /**
   * Filter notifications by type
   */
  const filterByType = useCallback((type?: string) => {
    fetchNotifications(0, false, { type })
  }, [fetchNotifications])

  /**
   * Filter to show only unread notifications
   */
  const showUnreadOnly = useCallback(() => {
    fetchNotifications(0, false, { unreadOnly: true })
  }, [fetchNotifications])

  /**
   * Refresh notifications
   */
  const refresh = useCallback(() => {
    fetchNotifications(0, false)
  }, [fetchNotifications])

  /**
   * Handle real-time notification updates
   */
  useEffect(() => {
    const initializeNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {return}

      // Subscribe to real-time notifications
      const unsubscribe = inAppNotificationService.subscribe(
        user.id,
        (notification) => {
          // Add new notification to the list
          setNotifications(prev => [notification, ...prev])
          
          // Update stats
          setStats(prev => ({
            ...prev,
            total: prev.total + 1,
            unread: prev.unread + 1,
            reviewNotifications: {
              ...prev.reviewNotifications,
              assignments: notification.type === 'review_assignment' 
                ? prev.reviewNotifications.assignments + 1 
                : prev.reviewNotifications.assignments,
              completions: notification.type === 'review_completed'
                ? prev.reviewNotifications.completions + 1
                : prev.reviewNotifications.completions,
              overdue: notification.type === 'review_overdue'
                ? prev.reviewNotifications.overdue + 1
                : prev.reviewNotifications.overdue,
              workload: notification.type === 'workload_warning'
                ? prev.reviewNotifications.workload + 1
                : prev.reviewNotifications.workload
            }
          }))

          // Show toast if enabled
          if (showToasts) {
            toast.info(notification.title, {
              description: notification.message,
              action: notification.action_url ? {
                label: 'View',
                onClick: () => window.location.href = notification.action_url!
              } : undefined
            })
          }
        },
        {
          types: ['review_assignment', 'review_completed', 'review_overdue', 'workload_warning']
        }
      )

      return () => {
        unsubscribe()
      }
    }
    
    initializeNotifications()
  }, [supabase, showToasts])

  /**
   * Auto-refresh notifications
   */
  useEffect(() => {
    if (!autoRefresh) {return}

    const interval = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refresh])

  /**
   * Initial load
   */
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  /**
   * Configure notification service settings
   */
  useEffect(() => {
    inAppNotificationService.setToastEnabled(showToasts)
    inAppNotificationService.setSoundEnabled(playSound)
  }, [showToasts, playSound])

  return {
    // Data
    notifications,
    stats,
    loading,
    error,
    hasMore,
    
    // Actions
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refresh,
    
    // Filters
    filterByType,
    showUnreadOnly,
    
    // Pagination
    currentPage,
    pageSize
  }
}