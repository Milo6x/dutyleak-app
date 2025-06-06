import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notificationManager } from '@/lib/notifications/notification-manager'

/**
 * POST /api/cron/review-notifications
 * Background job to check for overdue reviews and send notifications
 * This endpoint should be called by a cron job service (e.g., Vercel Cron, GitHub Actions)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (cron job)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const results = {
      overdueNotifications: 0,
      workloadWarnings: 0,
      cleanedNotifications: 0,
      errors: [] as string[]
    }

    console.log('Starting review notification cron job...')

    try {
      // Check and notify overdue reviews
      await notificationManager.checkAndNotifyOverdueReviews()
      
      // Get count of overdue assignments for reporting
      const { count: overdueCount } = await supabase
        .from('review_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString())
      
      results.overdueNotifications = overdueCount || 0
      console.log(`Processed ${results.overdueNotifications} overdue review notifications`)
    } catch (error) {
      const errorMsg = `Error checking overdue reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      results.errors.push(errorMsg)
    }

    try {
      // Check and notify workload warnings
      await notificationManager.checkAndNotifyWorkloadWarnings()
      
      // Get count of reviewers with high workload for reporting
      const { data: workloadStats } = await supabase
        .rpc('get_reviewer_workload_stats')
      
      if (workloadStats) {
        results.workloadWarnings = workloadStats.filter(
          (stats: any) => stats.current_assignments > stats.threshold
        ).length
      }
      
      console.log(`Processed ${results.workloadWarnings} workload warning notifications`)
    } catch (error) {
      const errorMsg = `Error checking workload warnings: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      results.errors.push(errorMsg)
    }

    try {
      // Clean up old notifications (older than 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: deletedNotifications, error: cleanupError } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .eq('read', true)
        .select('id')
      
      if (cleanupError) {
        throw cleanupError
      }
      
      const cleanedCount = deletedNotifications?.length || 0
      console.log(`Cleaned up ${cleanedCount} old notifications`)
      
      results.cleanedNotifications = cleanedCount
    } catch (error) {
      const errorMsg = `Error cleaning up notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      results.errors.push(errorMsg)
    }

    try {
      // Update notification analytics
      await updateNotificationAnalytics(supabase)
      console.log('Updated notification analytics')
    } catch (error) {
      const errorMsg = `Error updating analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(errorMsg)
      results.errors.push(errorMsg)
    }

    console.log('Review notification cron job completed', results)

    return NextResponse.json({
      success: true,
      message: 'Review notification cron job completed',
      results
    })
  } catch (error) {
    console.error('Error in review notification cron job:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Update notification analytics in the database
 */
async function updateNotificationAnalytics(supabase: any) {
  const today = new Date().toISOString().split('T')[0]
  
  // Get notification counts by type for today
  const { data: notificationCounts } = await supabase
    .from('notifications')
    .select('type, priority')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`)
  
  if (!notificationCounts) {return}
  
  // Aggregate counts
  const analytics = {
    date: today,
    total_notifications: notificationCounts.length,
    by_type: {} as Record<string, number>,
    by_priority: {} as Record<string, number>
  }
  
  notificationCounts.forEach((notification: any) => {
    // Count by type
    analytics.by_type[notification.type] = (analytics.by_type[notification.type] || 0) + 1
    
    // Count by priority
    analytics.by_priority[notification.priority] = (analytics.by_priority[notification.priority] || 0) + 1
  })
  
  // Upsert analytics record
  await supabase
    .from('notification_analytics')
    .upsert({
      date: today,
      total_notifications: analytics.total_notifications,
      type_breakdown: analytics.by_type,
      priority_breakdown: analytics.by_priority,
      updated_at: new Date().toISOString()
    })
}

/**
 * GET /api/cron/review-notifications
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'Review Notifications Cron',
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}