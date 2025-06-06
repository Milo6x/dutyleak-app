import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const querySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d']).default('7d')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { timeRange } = querySchema.parse({
      timeRange: searchParams.get('timeRange') || '7d'
    })

    const supabase = createDutyLeakServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    startDate.setDate(startDate.getDate() - days)

    // Fetch review queue data
    const { data: reviewItems, error: reviewError } = await supabase
      .from('review_queue')
      .select(`
        *,
        reviewer:reviewer_id(id, email, full_name),
        audit_logs:review_audit_log(action, created_at, notes)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (reviewError) {
      console.error('Error fetching review data:', reviewError)
      return NextResponse.json({ error: 'Failed to fetch review data' }, { status: 500 })
    }

    // Calculate overview metrics
    const totalReviews = reviewItems?.length || 0
    const pendingReviews = reviewItems?.filter(item => item.status === 'pending').length || 0
    const completedReviews = reviewItems?.filter(item => ['approved', 'rejected', 'modified'].includes(item.status)).length || 0
    const escalatedItems = reviewItems?.filter(item => item.status === 'escalated').length || 0
    const rejectedItems = reviewItems?.filter(item => item.status === 'rejected').length || 0
    const approvedItems = reviewItems?.filter(item => item.status === 'approved').length || 0

    // Calculate average review time
    const completedItems = reviewItems?.filter(item => 
      ['approved', 'rejected', 'modified'].includes(item.status) && 
      item.reviewed_at
    ) || []
    
    const totalReviewTime = completedItems.reduce((sum, item) => {
      const createdAt = new Date(item.created_at)
      const reviewedAt = new Date(item.reviewed_at)
      const timeDiff = (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60) // minutes
      return sum + timeDiff
    }, 0)
    
    const averageReviewTime = completedItems.length > 0 ? totalReviewTime / completedItems.length : 0

    // Calculate accuracy rate (mock calculation - would need actual accuracy tracking)
    const accuracyRate = 94.8 // This would be calculated based on review audit data

    // Get reviewer performance data
    const reviewerStats = new Map()
    
    reviewItems?.forEach(item => {
      // Skip reviewer tracking as reviewer_id is not available in current schema
      const reviewerId = 'system'
      const reviewerName = 'System'
      
      if (!reviewerStats.has(reviewerId)) {
        reviewerStats.set(reviewerId, {
          reviewerId,
          reviewerName,
          reviewsCompleted: 0,
          totalTime: 0,
          flaggedCount: 0,
          escalatedCount: 0,
          lastActive: item.reviewed_at || item.updated_at
        })
      }
      
      const stats = reviewerStats.get(reviewerId)
      
      if (['approved', 'rejected', 'modified'].includes(item.status)) {
        stats.reviewsCompleted++
        
        if (item.reviewed_at) {
          const createdAt = new Date(item.created_at)
          const reviewedAt = new Date(item.reviewed_at)
          const timeDiff = (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60)
          stats.totalTime += timeDiff
        }
      }
      
      if (item.status === 'rejected') {stats.flaggedCount++}
      if (item.status === 'escalated') {stats.escalatedCount++}
      
      // Update last active time
      const currentActivity = new Date(item.reviewed_at || item.updated_at)
      const lastActivity = new Date(stats.lastActive)
      if (currentActivity > lastActivity) {
        stats.lastActive = item.reviewed_at || item.updated_at
      }
    })

    const performance = Array.from(reviewerStats.values()).map(stats => ({
      reviewerId: stats.reviewerId,
      reviewerName: stats.reviewerName,
      reviewsCompleted: stats.reviewsCompleted,
      averageTime: stats.reviewsCompleted > 0 ? stats.totalTime / stats.reviewsCompleted : 0,
      accuracyRate: 95.2, // Mock - would be calculated from audit data
      flaggedRate: stats.reviewsCompleted > 0 ? (stats.flaggedCount / stats.reviewsCompleted) * 100 : 0,
      escalationRate: stats.reviewsCompleted > 0 ? (stats.escalatedCount / stats.reviewsCompleted) * 100 : 0,
      lastActive: stats.lastActive
    }))

    // Generate daily trends
    const trends = []
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayItems = reviewItems?.filter(item => {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0]
        return itemDate === dateStr
      }) || []
      
      trends.push({
        date: dateStr,
        pending: dayItems.filter(item => item.status === 'pending').length,
        completed: dayItems.filter(item => ['approved', 'rejected', 'modified'].includes(item.status)).length,
        flagged: dayItems.filter(item => item.status === 'rejected').length,
        accuracy: 94.5 + Math.random() * 5 // Mock accuracy calculation
      })
    }

    // Calculate category breakdown
    const categoryStats = new Map()
    
    reviewItems?.forEach(item => {
      const category = item.reason || 'Unknown'
      
      if (!categoryStats.has(category)) {
        categoryStats.set(category, {
          category,
          count: 0,
          totalTime: 0,
          completedCount: 0,
          flaggedCount: 0
        })
      }
      
      const stats = categoryStats.get(category)
      stats.count++
      
      if (['approved', 'rejected', 'modified'].includes(item.status)) {
        stats.completedCount++
        
        if (item.reviewed_at) {
          const createdAt = new Date(item.created_at)
          const reviewedAt = new Date(item.reviewed_at)
          const timeDiff = (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60)
          stats.totalTime += timeDiff
        }
      }
      
      if (item.status === 'rejected') {stats.flaggedCount++}
    })

    const categories = Array.from(categoryStats.values()).map(stats => ({
      category: stats.category,
      count: stats.count,
      averageTime: stats.completedCount > 0 ? stats.totalTime / stats.completedCount : 0,
      accuracyRate: 94.0 + Math.random() * 6, // Mock accuracy
      flaggedRate: stats.count > 0 ? (stats.flaggedCount / stats.count) * 100 : 0
    }))

    // Calculate time distribution (mock data - would need actual timing data)
    const timeDistribution = [
      { timeRange: '< 2 min', count: Math.floor(completedReviews * 0.25), percentage: 25 },
      { timeRange: '2-5 min', count: Math.floor(completedReviews * 0.35), percentage: 35 },
      { timeRange: '5-10 min', count: Math.floor(completedReviews * 0.25), percentage: 25 },
      { timeRange: '10-30 min', count: Math.floor(completedReviews * 0.12), percentage: 12 },
      { timeRange: '> 30 min', count: Math.floor(completedReviews * 0.03), percentage: 3 }
    ]

    // Calculate action breakdown
    const actionCounts = {
      approved: reviewItems?.filter(item => item.status === 'approved').length || 0,
      rejected: reviewItems?.filter(item => item.status === 'rejected').length || 0,
      modified: reviewItems?.filter(item => item.status === 'modified').length || 0,
      escalated: reviewItems?.filter(item => item.status === 'escalated').length || 0,
      'info-requested': reviewItems?.filter(item => item.status === 'info-requested').length || 0
    }

    const totalActions = Object.values(actionCounts).reduce((sum, count) => sum + count, 0)
    
    const actionBreakdown = [
      {
        action: 'Approved',
        count: actionCounts.approved,
        percentage: totalActions > 0 ? (actionCounts.approved / totalActions) * 100 : 0,
        color: '#10b981'
      },
      {
        action: 'Modified',
        count: actionCounts.modified,
        percentage: totalActions > 0 ? (actionCounts.modified / totalActions) * 100 : 0,
        color: '#f59e0b'
      },
      {
        action: 'Rejected',
        count: actionCounts.rejected,
        percentage: totalActions > 0 ? (actionCounts.rejected / totalActions) * 100 : 0,
        color: '#ef4444'
      },
      {
        action: 'Escalated',
        count: actionCounts.escalated,
        percentage: totalActions > 0 ? (actionCounts.escalated / totalActions) * 100 : 0,
        color: '#8b5cf6'
      },
      {
        action: 'Info Requested',
        count: actionCounts['info-requested'],
        percentage: totalActions > 0 ? (actionCounts['info-requested'] / totalActions) * 100 : 0,
        color: '#06b6d4'
      }
    ]

    const analyticsData = {
      overview: {
        totalReviews,
        pendingReviews,
        completedReviews,
        averageReviewTime,
        accuracyRate,
        rejectedItems,
        escalatedItems,
        approvedItems
      },
      performance,
      trends,
      categories,
      timeDistribution,
      actionBreakdown
    }

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Error in review analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}