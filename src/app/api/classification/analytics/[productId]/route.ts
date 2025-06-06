import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = params

    // Verify user has access to this product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get classification history for analytics
    const { data: history, error: historyError } = await supabase
      .from('job_logs')
      .select('*')
      .eq('classification_data->>product_id', productId)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('Error fetching classification history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    // Calculate analytics
    const analytics = calculateAnalytics(history || [])

    return NextResponse.json({
      success: true,
      analytics
    })
  } catch (error) {
    console.error('Classification analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateAnalytics(logs: any[]) {
  if (logs.length === 0) {
    return {
      totalClassifications: 0,
      accuracyRate: 0,
      averageConfidence: 0,
      sourceBreakdown: {},
      confidenceDistribution: {},
      timelineData: [],
      userActivity: []
    }
  }

  // Basic metrics
  const totalClassifications = logs.length
  
  // Calculate accuracy rate (simplified - based on confidence scores)
  const confidenceScores = logs
    .map(log => log.classification_data?.confidence_score)
    .filter(score => typeof score === 'number')
  
  const averageConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length * 100
    : 0
  
  // Accuracy rate estimation (high confidence classifications as "accurate")
  const highConfidenceCount = confidenceScores.filter(score => score >= 0.8).length
  const accuracyRate = confidenceScores.length > 0
    ? (highConfidenceCount / confidenceScores.length) * 100
    : 0

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {}
  logs.forEach(log => {
    const source = log.classification_data?.source || 'unknown'
    sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1
  })

  // Confidence distribution
  const confidenceDistribution: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0
  }
  
  confidenceScores.forEach(score => {
    if (score >= 0.8) {confidenceDistribution.high++}
    else if (score >= 0.6) {confidenceDistribution.medium++}
    else {confidenceDistribution.low++}
  })
  confidenceDistribution.unknown = logs.length - confidenceScores.length

  // Timeline data (group by day)
  const timelineMap: Record<string, { count: number; confidenceSum: number; confidenceCount: number }> = {}
  
  logs.forEach(log => {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    if (!timelineMap[date]) {
      timelineMap[date] = { count: 0, confidenceSum: 0, confidenceCount: 0 }
    }
    timelineMap[date].count++
    
    const confidence = log.classification_data?.confidence_score
    if (typeof confidence === 'number') {
      timelineMap[date].confidenceSum += confidence
      timelineMap[date].confidenceCount++
    }
  })
  
  const timelineData = Object.entries(timelineMap)
    .map(([date, data]) => ({
      date,
      count: data.count,
      avgConfidence: data.confidenceCount > 0 
        ? (data.confidenceSum / data.confidenceCount) * 100 
        : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // User activity
  const userActivityMap: Record<string, { count: number; lastActivity: string; userName?: string }> = {}
  
  logs.forEach(log => {
    const userId = log.user_id
    if (!userActivityMap[userId]) {
      userActivityMap[userId] = {
        count: 0,
        lastActivity: log.created_at,
        userName: log.classification_data?.user_name || undefined
      }
    }
    userActivityMap[userId].count++
    
    // Update last activity if this log is more recent
    if (new Date(log.created_at) > new Date(userActivityMap[userId].lastActivity)) {
      userActivityMap[userId].lastActivity = log.created_at
    }
  })
  
  const userActivity = Object.entries(userActivityMap)
    .map(([userId, data]) => ({
      userId,
      userName: data.userName,
      count: data.count,
      lastActivity: data.lastActivity
    }))
    .sort((a, b) => b.count - a.count) // Sort by activity count

  return {
    totalClassifications,
    accuracyRate: Math.round(accuracyRate * 10) / 10,
    averageConfidence: Math.round(averageConfidence * 10) / 10,
    sourceBreakdown,
    confidenceDistribution,
    timelineData,
    userActivity
  }
}