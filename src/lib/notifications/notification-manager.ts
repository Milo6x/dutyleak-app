import { EmailNotificationService } from './email-service'
import { inAppNotificationService } from './in-app-service'
import { createBrowserClient } from '../supabase'

interface ReviewAssignment {
  id: string
  reviewer_id: string
  item_id: string
  assigned_at: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
}

interface ReviewItem {
  id: string
  product_id: string
  product_name: string
  classification_id: string
  status: string
  created_at: string
  workspace_id: string
}

interface NotificationPreferences {
  email_enabled: boolean
  push_enabled: boolean
  sound_enabled: boolean
  review_assignments: boolean
  review_completions: boolean
  review_overdue: boolean
  system_alerts: boolean
  workload_warnings: boolean
}

export class NotificationManager {
  private emailService: EmailNotificationService
  private supabase = createBrowserClient()

  constructor() {
    this.emailService = new EmailNotificationService()
  }

  /**
   * Send notification for new review assignment
   */
  async notifyReviewAssignment(
    reviewerId: string,
    assignment: ReviewAssignment,
    reviewItem: ReviewItem
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(reviewerId)
      
      if (!preferences.review_assignments) {
        return
      }

      const title = 'New Review Assignment'
      const message = `You have been assigned a new review for product classification. Due: ${assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No deadline'}`
      const actionUrl = `/review-queue/${assignment.item_id}`

      // Send in-app notification
      await inAppNotificationService.createNotification({
        user_id: reviewerId,
        type: 'review_assignment',
        title,
        message,
        priority: assignment.priority,
        action_url: actionUrl,
        data: {
          assignment_id: assignment.id,
          item_id: assignment.item_id,
          product_id: reviewItem.product_id,
          due_date: assignment.due_date
        }
      })

      // Send email notification if enabled
      if (preferences.email_enabled) {
        const userProfile = await this.emailService.getUserNotificationPreferences(reviewerId)
        if (userProfile) {
          await this.emailService.sendNotificationEmail(
            {
              id: `review_assignment_${assignment.id}`,
              type: 'review_assignment',
              title: 'New Review Assignment',
              message: `You have been assigned a new review for ${reviewItem.product_name}`,
              actionUrl,
              metadata: {
                assignmentId: assignment.id,
                itemId: assignment.item_id,
                productId: reviewItem.product_id,
                productName: reviewItem.product_name,
                dueDate: assignment.due_date
              }
            },
            userProfile
          )
        }
      }

      // Log notification activity
      await this.logNotificationActivity({
        user_id: reviewerId,
        type: 'review_assignment',
        channels: {
          in_app: true,
          email: preferences.email_enabled
        },
        metadata: {
          assignment_id: assignment.id,
          item_id: assignment.item_id
        }
      })
    } catch (error) {
      console.error('Error sending review assignment notification:', error)
    }
  }

  /**
   * Send notification for review completion
   */
  async notifyReviewCompletion(
    assignerId: string,
    reviewerId: string,
    assignment: ReviewAssignment,
    reviewItem: ReviewItem,
    decision: 'approved' | 'rejected'
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(assignerId)
      
      if (!preferences.review_completions) {
        return
      }

      const title = `Review ${decision === 'approved' ? 'Approved' : 'Rejected'}`
      const message = `A review has been ${decision} for product classification.`
      const actionUrl = `/review-queue/${assignment.item_id}`

      // Send in-app notification
      await inAppNotificationService.createNotification({
        user_id: assignerId,
        type: 'review_completed',
        title,
        message,
        priority: 'medium',
        action_url: actionUrl,
        data: {
          assignment_id: assignment.id,
          item_id: assignment.item_id,
          product_id: reviewItem.product_id,
          reviewer_id: reviewerId,
          decision
        }
      })

      // Send email notification if enabled
      if (preferences.email_enabled) {
        // Get user profile and email from auth.users
        const { data: userProfile } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', assignerId)
          .single()

        const { data: authUser } = await this.supabase.auth.admin.getUserById(assignerId)

        if (userProfile && authUser?.user?.email) {
          const userWithEmail = {
            ...userProfile,
            email: authUser.user.email,
            name: userProfile.full_name || undefined
          }

          await this.emailService.sendNotificationEmail(
            {
              id: `review_completed_${assignment.id}`,
              type: 'review_completed',
              title: 'Review Completed',
              message: `A review has been completed for assignment ${assignment.id}`,
              actionUrl,
              metadata: {
                assignmentId: assignment.id,
                itemId: assignment.item_id,
                productId: reviewItem.product_id,
                reviewerId,
                decision
              }
            },
            userWithEmail
          )
        }
      }

      // Log notification activity
      await this.logNotificationActivity({
        user_id: assignerId,
        type: 'review_completed',
        channels: {
          in_app: true,
          email: preferences.email_enabled
        },
        metadata: {
          assignment_id: assignment.id,
          item_id: assignment.item_id,
          decision
        }
      })
    } catch (error) {
      console.error('Error sending review completion notification:', error)
    }
  }

  /**
   * Send notification for overdue reviews
   */
  async notifyOverdueReview(
    reviewerId: string,
    assignment: ReviewAssignment,
    reviewItem: ReviewItem
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(reviewerId)
      
      if (!preferences.review_overdue) {
        return
      }

      const title = 'Overdue Review'
      const daysOverdue = assignment.due_date 
        ? Math.floor((Date.now() - new Date(assignment.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0
      const message = `You have an overdue review assignment${daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ''}.`
      const actionUrl = `/review-queue/${assignment.item_id}`

      // Send in-app notification with high priority
      await inAppNotificationService.createNotification({
        user_id: reviewerId,
        type: 'review_overdue',
        title,
        message,
        priority: 'high',
        action_url: actionUrl,
        data: {
          assignment_id: assignment.id,
          item_id: assignment.item_id,
          product_id: reviewItem.product_id,
          days_overdue: daysOverdue,
          due_date: assignment.due_date
        }
      })

      // Send email notification if enabled
      if (preferences.email_enabled) {
        const { data: userProfile } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', reviewerId)
          .single()

        const { data: authUser } = await this.supabase.auth.admin.getUserById(reviewerId)

        if (userProfile && authUser?.user?.email) {
          const userWithEmail = {
            ...userProfile,
            email: authUser.user.email,
            name: userProfile.full_name || undefined
          }

          await this.emailService.sendNotificationEmail(
            {
              id: `review_overdue_${assignment.id}`,
              type: 'review_overdue',
              title: 'Review Overdue',
              message: `Your review for assignment ${assignment.id} is ${daysOverdue} days overdue`,
              actionUrl,
              metadata: {
                assignmentId: assignment.id,
                itemId: assignment.item_id,
                productId: reviewItem.product_id,
                dueDate: assignment.due_date!,
                daysOverdue
              }
            },
            userWithEmail
          )
        }
      }

      // Log notification activity
      await this.logNotificationActivity({
        user_id: reviewerId,
        type: 'review_overdue',
        channels: {
          in_app: true,
          email: preferences.email_enabled
        },
        metadata: {
          assignment_id: assignment.id,
          item_id: assignment.item_id,
          days_overdue: daysOverdue
        }
      })
    } catch (error) {
      console.error('Error sending overdue review notification:', error)
    }
  }

  /**
   * Send workload warning notification
   */
  async notifyWorkloadWarning(
    reviewerId: string,
    workloadData: {
      currentAssignments: number
      threshold: number
      pendingItems: number
    }
  ): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(reviewerId)
      
      if (!preferences.workload_warnings) {
        return
      }

      const title = 'High Workload Alert'
      const message = `You currently have ${workloadData.currentAssignments} active review assignments (threshold: ${workloadData.threshold}). Consider redistributing workload.`
      const actionUrl = '/review-queue'

      // Send in-app notification
      await inAppNotificationService.createNotification({
        user_id: reviewerId,
        type: 'workload_warning',
        title,
        message,
        priority: 'medium',
        action_url: actionUrl,
        data: workloadData
      })

      // Send email notification if enabled
      if (preferences.email_enabled) {
        await this.emailService.sendWorkloadWarningEmail(
          reviewerId,
          {
            currentAssignments: workloadData.currentAssignments,
            threshold: workloadData.threshold,
            pendingItems: workloadData.pendingItems,
            actionUrl
          }
        )
      }

      // Log notification activity
      await this.logNotificationActivity({
        user_id: reviewerId,
        type: 'workload_warning',
        channels: {
          in_app: true,
          email: preferences.email_enabled
        },
        metadata: workloadData
      })
    } catch (error) {
      console.error('Error sending workload warning notification:', error)
    }
  }

  /**
   * Send system alert notification
   */
  async notifySystemAlert(
    userIds: string[],
    alert: {
      title: string
      message: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
      actionUrl?: string
      data?: any
    }
  ): Promise<void> {
    try {
      const notifications = userIds.map(async (userId) => {
        const preferences = await this.getUserNotificationPreferences(userId)
        
        if (!preferences.system_alerts) {
          return
        }

        // Send in-app notification
        await inAppNotificationService.createNotification({
          user_id: userId,
          type: 'system_alert',
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          action_url: alert.actionUrl,
          data: alert.data
        })

        // Send email notification if enabled and priority is high or urgent
        if (preferences.email_enabled && ['high', 'urgent'].includes(alert.priority)) {
          await this.emailService.sendSystemAlertEmail(
            userId,
            {
              title: alert.title,
              message: alert.message,
              priority: alert.priority,
              actionUrl: alert.actionUrl
            }
          )
        }

        // Log notification activity
        await this.logNotificationActivity({
          user_id: userId,
          type: 'system_alert',
          channels: {
            in_app: true,
            email: preferences.email_enabled && ['high', 'urgent'].includes(alert.priority)
          },
          metadata: alert.data
        })
      })

      await Promise.all(notifications)
    } catch (error) {
      console.error('Error sending system alert notifications:', error)
    }
  }

  /**
   * Check for overdue reviews and send notifications
   */
  async checkAndNotifyOverdueReviews(): Promise<void> {
    try {
      // Get overdue assignments
      // TODO: Add review_assignments table to database types
      // Temporarily disabled until review_assignments table is added to database types
      const { data: overdueAssignments, error } = { data: [], error: null };
      /*
      const { data: overdueAssignments, error } = await this.supabase
        .from('review_assignments')
        .select(`
          *,
          review_queue!inner(
            id,
            product_id,
            classification_id,
            status,
            created_at,
            workspace_id
          )
        `)
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString())

      if (error) {
        console.error('Error fetching overdue assignments:', error)
        return
      }

      if (!overdueAssignments || overdueAssignments.length === 0) {
        return
      }

      // Send notifications for each overdue assignment
      const notifications = overdueAssignments.map(async (assignment: any) => {
        await this.notifyOverdueReview(
          assignment.reviewer_id,
          assignment,
          assignment.review_queue
        )
      })

      await Promise.all(notifications)
      */
    } catch (error) {
      console.error('Error checking overdue reviews:', error)
    }
  }

  /**
   * Check reviewer workloads and send warnings
   */
  async checkAndNotifyWorkloadWarnings(): Promise<void> {
    try {
      // Get reviewer workload statistics
      const { data: workloadStats, error } = await this.supabase
        .rpc('get_reviewer_workload_stats')

      if (error) {
        console.error('Error fetching workload stats:', error)
        return
      }

      if (!workloadStats || workloadStats.length === 0) {
        return
      }

      // Send warnings for reviewers exceeding threshold
      const warnings = workloadStats
        .filter((stats: any) => stats.current_assignments > stats.threshold)
        .map(async (stats: any) => {
          await this.notifyWorkloadWarning(stats.reviewer_id, {
            currentAssignments: stats.current_assignments,
            threshold: stats.threshold,
            pendingItems: stats.pending_items
          })
        })

      await Promise.all(warnings)
    } catch (error) {
      console.error('Error checking workload warnings:', error)
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        // Return default preferences if not found
        return {
          email_enabled: true,
          push_enabled: true,
          sound_enabled: true,
          review_assignments: true,
          review_completions: true,
          review_overdue: true,
          system_alerts: true,
          workload_warnings: true
        }
      }

      return data as NotificationPreferences
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      // Return default preferences on error
      return {
        email_enabled: true,
        push_enabled: true,
        sound_enabled: true,
        review_assignments: true,
        review_completions: true,
        review_overdue: true,
        system_alerts: true,
        workload_warnings: true
      }
    }
  }

  /**
   * Log notification activity for analytics
   */
  private async logNotificationActivity(activity: {
    user_id: string
    type: string
    channels: {
      in_app: boolean
      email: boolean
    }
    metadata?: any
  }): Promise<void> {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          user_id: activity.user_id,
          notification_type: activity.type,
          channel: activity.channels.in_app ? 'in_app' : 'email',
          status: 'delivered',
          metadata: {
            ...activity.metadata,
            channels_used: activity.channels
          }
        })
    } catch (error) {
      console.error('Error logging notification activity:', error)
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notification_settings')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating notification preferences:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<string, number>
    byPriority: Record<string, number>
  }> {
    try {
      const { notifications } = await inAppNotificationService.getNotifications(userId, {
        limit: 1000 // Get a large sample for stats
      })

      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<string, number>,
        byPriority: {} as Record<string, number>
      }

      notifications.forEach(notification => {
        // Count by type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
        
        // Count by priority
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting notification stats:', error)
      return {
        total: 0,
        unread: 0,
        byType: {},
        byPriority: {}
      }
    }
  }
}

export const notificationManager = new NotificationManager()