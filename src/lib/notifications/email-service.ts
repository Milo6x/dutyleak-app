// Email notification service for sending various types of email notifications

import { createBrowserClient } from '@/lib/supabase'

export interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

export interface NotificationData {
  id: string
  user_id?: string
  type: string
  title: string
  message: string
  actionUrl?: string
  metadata?: any
  data?: any
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  created_at?: string
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  notification_preferences?: {
    email_enabled: boolean
    email_frequency: 'immediate' | 'daily' | 'weekly'
    types: string[]
  }
}

export class EmailNotificationService {
  private supabase = createBrowserClient()

  /**
   * Send email notification based on notification type
   */
  async sendNotificationEmail(notification: NotificationData, userProfile: UserProfile): Promise<boolean> {
    try {
      // Check if user has email notifications enabled
      if (!this.shouldSendEmail(notification, userProfile)) {
        console.log(`Email notification skipped for user ${userProfile.id} - disabled in preferences`)
        return false
      }

      // Generate email template based on notification type
      const template = await this.generateEmailTemplate(notification)
      if (!template) {
        console.error(`No template found for notification type: ${notification.type}`)
        return false
      }

      // Prepare email data
      const emailData = {
        to: userProfile.email,
        subject: template.subject,
        html: template.htmlBody,
        text: template.textBody,
        notification_id: notification.id,
        user_id: userProfile.id
      }

      // Log the email attempt
      await this.logEmailAttempt(emailData)

      // Simulate email sending (replace with actual email service)
      const success = await this.simulateEmailSending(emailData)
      
      if (success) {
        console.log(`Email notification sent successfully to ${userProfile.email}`)
        return true
      }

      return false
    } catch (error) {
      console.error('Error sending email notification:', error)
      return false
    }
  }

  /**
   * Send overdue review email notification
   */
  async sendOverdueReviewEmail(
    reviewerId: string,
    data: {
      assignmentId: string
      itemId: string
      productId: string
      dueDate: string
      daysOverdue: number
      actionUrl: string
    }
  ): Promise<boolean> {
    try {
      const userProfile = await this.getUserNotificationPreferences(reviewerId)
      if (!userProfile) {
        console.error(`User profile not found for reviewer ${reviewerId}`)
        return false
      }

      const notification: NotificationData = {
        id: `overdue-${data.assignmentId}`,
        user_id: reviewerId,
        type: 'review_overdue',
        title: 'Review Overdue',
        message: `Your review for item ${data.itemId} is ${data.daysOverdue} days overdue`,
        data,
        priority: data.daysOverdue > 7 ? 'urgent' : 'high',
        created_at: new Date().toISOString()
      }

      return await this.sendNotificationEmail(notification, userProfile)
    } catch (error) {
      console.error('Error sending overdue review email:', error)
      return false
    }
  }

  /**
   * Send workload warning email notification
   */
  async sendWorkloadWarningEmail(
    reviewerId: string,
    data: {
      currentAssignments: number
      threshold: number
      pendingItems: number
      actionUrl: string
    }
  ): Promise<boolean> {
    try {
      const userProfile = await this.getUserNotificationPreferences(reviewerId)
      if (!userProfile) {
        console.error(`User profile not found for reviewer ${reviewerId}`)
        return false
      }

      const notification: NotificationData = {
        id: `workload-${reviewerId}-${Date.now()}`,
        user_id: reviewerId,
        type: 'workload_warning',
        title: 'High Workload Warning',
        message: `You have ${data.currentAssignments} assignments (threshold: ${data.threshold})`,
        data,
        priority: 'high',
        created_at: new Date().toISOString()
      }

      return await this.sendNotificationEmail(notification, userProfile)
    } catch (error) {
      console.error('Error sending workload warning email:', error)
      return false
    }
  }

  /**
   * Send system alert email notification
   */
  async sendSystemAlertEmail(
    userId: string,
    data: {
      title: string
      message: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
      actionUrl?: string
    }
  ): Promise<boolean> {
    try {
      const userProfile = await this.getUserNotificationPreferences(userId)
      if (!userProfile) {
        console.error(`User profile not found for user ${userId}`)
        return false
      }

      const notification: NotificationData = {
        id: `system-alert-${userId}-${Date.now()}`,
        user_id: userId,
        type: 'system_alert',
        title: data.title,
        message: data.message,
        data,
        priority: data.priority,
        created_at: new Date().toISOString()
      }

      return await this.sendNotificationEmail(notification, userProfile)
    } catch (error) {
      console.error('Error sending system alert email:', error)
      return false
    }
  }

  /**
   * Check if email should be sent based on user preferences
   */
  private shouldSendEmail(notification: NotificationData, userProfile: UserProfile): boolean {
    const preferences = userProfile.notification_preferences
    if (!preferences || !preferences.email_enabled) {
      return false
    }

    // Check if notification type is enabled
    if (preferences.types && !preferences.types.includes(notification.type)) {
      return false
    }

    // For urgent notifications, always send immediately
    if (notification.priority === 'urgent') {
      return true
    }

    // Check frequency preferences
    if (preferences.email_frequency === 'immediate') {
      return true
    }

    // For daily/weekly frequencies, implement batching logic here
    // For now, send immediately for high priority
    return notification.priority === 'high'
  }

  /**
   * Generate email template based on notification type
   */
  private async generateEmailTemplate(notification: NotificationData): Promise<EmailTemplate | null> {
    const templates: Record<string, EmailTemplate> = {
      review_overdue: {
        subject: `Review Overdue: ${notification.title}`,
        htmlBody: `
          <h2>Review Overdue</h2>
          <p>${notification.message}</p>
          <p>Please complete your review as soon as possible.</p>
        `,
        textBody: `Review Overdue: ${notification.message}. Please complete your review as soon as possible.`
      },
      workload_warning: {
        subject: `Workload Warning: ${notification.title}`,
        htmlBody: `
          <h2>High Workload Warning</h2>
          <p>${notification.message}</p>
          <p>Consider redistributing assignments or requesting additional resources.</p>
        `,
        textBody: `Workload Warning: ${notification.message}. Consider redistributing assignments or requesting additional resources.`
      },
      system_alert: {
        subject: `System Alert: ${notification.title}`,
        htmlBody: `
          <h2>System Alert</h2>
          <p>${notification.message}</p>
          <p>Please review and take appropriate action.</p>
        `,
        textBody: `System Alert: ${notification.message}. Please review and take appropriate action.`
      }
    }

    return templates[notification.type] || null
  }

  /**
   * Log email attempt for tracking and debugging
   */
  private async logEmailAttempt(emailData: any): Promise<void> {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          user_id: emailData.user_id,
          notification_type: 'email',
          channel: 'email',
          status: 'attempted',
          metadata: {
            to: emailData.to,
            subject: emailData.subject,
            notification_id: emailData.notification_id
          }
        })
    } catch (error) {
      console.error('Error logging email attempt:', error)
    }
  }

  /**
   * Simulate email sending (replace with actual email service integration)
   */
  private async simulateEmailSending(emailData: any): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate 95% success rate
    return Math.random() > 0.05
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<UserProfile | null> {
    try {
      // Try to get user from profiles table first
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profile) {
        return {
          id: userId,
          email: (profile as any).email || `user${userId}@example.com`,
          name: (profile as any).name || 'User',
          notification_preferences: {
            email_enabled: true,
            email_frequency: 'immediate',
            types: ['review_overdue', 'workload_warning', 'system_alert']
          }
        }
      }

      // Fallback to mock user profile
      return {
        id: userId,
        email: `user${userId}@example.com`,
        name: 'User',
        notification_preferences: {
          email_enabled: true,
          email_frequency: 'immediate',
          types: ['review_overdue', 'workload_warning', 'system_alert']
        }
      }
    } catch (error) {
      console.error('Error getting user notification preferences:', error)
      return null
    }
  }
}

export const emailNotificationService = new EmailNotificationService()