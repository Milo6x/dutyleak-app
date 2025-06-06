import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface InAppNotification {
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
  expires_at?: string
  action_url?: string
}

interface NotificationSubscription {
  userId: string
  callback: (notification: InAppNotification) => void
  filters?: {
    types?: string[]
    priorities?: string[]
    unreadOnly?: boolean
  }
}

export class InAppNotificationService {
  private supabase = createBrowserClient()
  private subscriptions: Map<string, NotificationSubscription[]> = new Map()
  private realtimeChannel: any = null
  private soundEnabled = true
  private toastEnabled = true

  constructor() {
    this.initializeRealtimeSubscription()
  }

  /**
   * Initialize real-time subscription for notifications
   */
  private initializeRealtimeSubscription(): void {
    this.realtimeChannel = this.supabase
      .channel('notification_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs',
          filter: 'channel=eq.in_app'
        },
        (payload) => {
          const log = payload.new as any
          // Transform notification_logs data to InAppNotification format
          const notification: InAppNotification = {
            id: log.id,
            user_id: log.user_id,
            type: log.notification_type,
            title: log.metadata?.title || '',
            message: log.metadata?.message || '',
            data: log.metadata?.data,
            read: log.status === 'read',
            priority: log.metadata?.priority || 'medium',
            created_at: log.created_at,
            read_at: log.metadata?.read_at,
            action_url: log.metadata?.action_url,
            expires_at: log.metadata?.expires_at
          }
          this.handleNewNotification(notification)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_logs',
          filter: 'channel=eq.in_app'
        },
        (payload) => {
          const log = payload.new as any
          // Transform notification_logs data to InAppNotification format
          const notification: InAppNotification = {
            id: log.id,
            user_id: log.user_id,
            type: log.notification_type,
            title: log.metadata?.title || '',
            message: log.metadata?.message || '',
            data: log.metadata?.data,
            read: log.status === 'read',
            priority: log.metadata?.priority || 'medium',
            created_at: log.created_at,
            read_at: log.metadata?.read_at,
            action_url: log.metadata?.action_url,
            expires_at: log.metadata?.expires_at
          }
          this.handleNotificationUpdate(notification)
        }
      )
      .subscribe()
  }

  /**
   * Handle new notification received via real-time
   */
  private handleNewNotification(notification: InAppNotification): void {
    // Notify all subscribers for this user
    const userSubscriptions = this.subscriptions.get(notification.user_id) || []
    
    userSubscriptions.forEach(subscription => {
      if (this.matchesFilters(notification, subscription.filters)) {
        subscription.callback(notification)
      }
    })

    // Show toast notification if enabled
    if (this.toastEnabled) {
      this.showToastNotification(notification)
    }

    // Play sound if enabled
    if (this.soundEnabled) {
      this.playNotificationSound(notification.priority)
    }

    // Show browser notification if permission granted
    this.showBrowserNotification(notification)
  }

  /**
   * Handle notification update (e.g., marked as read)
   */
  private handleNotificationUpdate(notification: InAppNotification): void {
    const userSubscriptions = this.subscriptions.get(notification.user_id) || []
    
    userSubscriptions.forEach(subscription => {
      subscription.callback(notification)
    })
  }

  /**
   * Subscribe to notifications for a user
   */
  subscribe(
    userId: string, 
    callback: (notification: InAppNotification) => void,
    filters?: NotificationSubscription['filters']
  ): () => void {
    const subscription: NotificationSubscription = {
      userId,
      callback,
      filters
    }

    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, [])
    }
    
    this.subscriptions.get(userId)!.push(subscription)

    // Return unsubscribe function
    return () => {
      const userSubs = this.subscriptions.get(userId) || []
      const index = userSubs.indexOf(subscription)
      if (index > -1) {
        userSubs.splice(index, 1)
      }
      if (userSubs.length === 0) {
        this.subscriptions.delete(userId)
      }
    }
  }

  /**
   * Create a new in-app notification
   */
  async createNotification(notification: Omit<InAppNotification, 'id' | 'created_at' | 'read' | 'read_at'>): Promise<InAppNotification | null> {
    try {
      const { data, error } = await this.supabase
        .from('notification_logs')
        .insert({
          user_id: notification.user_id,
          notification_type: notification.type,
          channel: 'in_app',
          status: 'delivered',
          metadata: {
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            data: notification.data,
            action_url: notification.action_url,
            expires_at: notification.expires_at
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating notification:', error)
        return null
      }

      // Transform notification_logs data to InAppNotification format
      const transformedData: InAppNotification = {
        id: data.id,
        user_id: data.user_id,
        type: data.notification_type as any,
        title: (data.metadata as any)?.title || '',
        message: (data.metadata as any)?.message || '',
        data: (data.metadata as any)?.data,
        read: false,
        priority: (data.metadata as any)?.priority || 'medium',
        created_at: data.created_at,
        action_url: (data.metadata as any)?.action_url,
        expires_at: (data.metadata as any)?.expires_at
      }

      return transformedData
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // First get the current metadata
      const { data: currentData } = await this.supabase
        .from('notification_logs')
        .select('metadata')
        .eq('id', notificationId)
        .eq('user_id', userId)
        .single()

      const updatedMetadata = {
        ...(typeof currentData?.metadata === 'object' && currentData?.metadata !== null ? currentData.metadata : {}),
        read_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('notification_logs')
        .update({
          status: 'read',
          metadata: updatedMetadata
        })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('notification_logs')
        .update({
          status: 'read'
        })
        .eq('user_id', userId)
        .in('id', notificationIds)
        .select('id')

      if (error) {
        console.error('Error marking notifications as read:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      return 0
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notification_logs')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      types?: string[]
      priorities?: string[]
    } = {}
  ): Promise<{ notifications: InAppNotification[]; total: number; unread: number }> {
    try {
      let query = this.supabase
        .from('notification_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('channel', 'in_app')
        .order('created_at', { ascending: false })

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      if (options.unreadOnly) {
        query = query.neq('status', 'read')
      }

      if (options.types && options.types.length > 0) {
        query = query.in('notification_type', options.types)
      }

      if (options.priorities && options.priorities.length > 0) {
        // Filter by priority in metadata
        // Note: This is a simplified approach, proper JSONB querying would be more complex
      }

      const { data: notifications, error, count } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        return { notifications: [], total: 0, unread: 0 }
      }

      // Transform notification_logs data to InAppNotification format
      const transformedNotifications: InAppNotification[] = (notifications || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        type: log.notification_type as any,
        title: (log.metadata as any)?.title || '',
        message: (log.metadata as any)?.message || '',
        data: (log.metadata as any)?.data,
        read: log.status === 'read',
        priority: (log.metadata as any)?.priority || 'medium',
        created_at: log.created_at,
        read_at: (log.metadata as any)?.read_at,
        action_url: (log.metadata as any)?.action_url,
        expires_at: (log.metadata as any)?.expires_at
      }))

      // Get unread count separately
      const { count: unreadCount } = await this.supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('channel', 'in_app')
        .neq('status', 'read')

      return {
        notifications: transformedNotifications,
        total: count || 0,
        unread: unreadCount || 0
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return { notifications: [], total: 0, unread: 0 }
    }
  }

  /**
   * Show toast notification
   */
  private showToastNotification(notification: InAppNotification): void {
    const toastOptions: any = {
      description: notification.message,
      duration: this.getToastDuration(notification.priority)
    }

    if (notification.action_url) {
      toastOptions.action = {
        label: 'View',
        onClick: () => {
          window.location.href = notification.action_url!
        }
      }
    }

    switch (notification.priority) {
      case 'urgent':
      case 'high':
        toast.error(notification.title, toastOptions)
        break
      case 'medium':
        toast.warning(notification.title, toastOptions)
        break
      case 'low':
      default:
        toast.info(notification.title, toastOptions)
        break
    }
  }

  /**
   * Get toast duration based on priority
   */
  private getToastDuration(priority: string): number {
    switch (priority) {
      case 'urgent': return 10000 // 10 seconds
      case 'high': return 8000   // 8 seconds
      case 'medium': return 6000 // 6 seconds
      case 'low': return 4000    // 4 seconds
      default: return 5000       // 5 seconds
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(priority: string): void {
    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Generate different tones based on priority
      const frequency = this.getNotificationFrequency(priority)
      const duration = 0.3
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  /**
   * Get notification frequency based on priority
   */
  private getNotificationFrequency(priority: string): number {
    switch (priority) {
      case 'urgent': return 800  // High pitch for urgent
      case 'high': return 600   // Medium-high pitch
      case 'medium': return 500 // Medium pitch
      case 'low': return 400    // Lower pitch
      default: return 500
    }
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(notification: InAppNotification): Promise<void> {
    if (!('Notification' in window)) {
      return
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      })
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'urgent'
        })
      }
    }
  }

  /**
   * Check if notification matches subscription filters
   */
  private matchesFilters(notification: InAppNotification, filters?: NotificationSubscription['filters']): boolean {
    if (!filters) {return true}

    if (filters.unreadOnly && notification.read) {
      return false
    }

    if (filters.types && filters.types.length > 0 && !filters.types.includes(notification.type)) {
      return false
    }

    if (filters.priorities && filters.priorities.length > 0 && !filters.priorities.includes(notification.priority)) {
      return false
    }

    return true
  }

  /**
   * Enable/disable sound notifications
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled
  }

  /**
   * Enable/disable toast notifications
   */
  setToastEnabled(enabled: boolean): void {
    this.toastEnabled = enabled
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('notification_logs')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 days old
        .select('id')

      if (error) {
        console.error('Error cleaning up expired notifications:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error)
      return 0
    }
  }

  /**
   * Destroy the service and clean up subscriptions
   */
  destroy(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel)
    }
    this.subscriptions.clear()
  }
}

export const inAppNotificationService = new InAppNotificationService()