import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { checkUserPermission } from '@/lib/permissions' // Added import

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

    // Verify user has access to this product's workspace
    const { data: productDetails, error: productError } = await supabase
      .from('products')
      .select('id, name, workspace_id') // Fetch workspace_id
      .eq('id', productId)
      .single()

    if (productError || !productDetails) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // Check user permission for the product's workspace
    const { hasPermission } = await checkUserPermission(user.id, productDetails.workspace_id, 'DATA_VIEW');
    if (!hasPermission) {
        return NextResponse.json({ error: 'Access to product analytics denied' }, { status: 403 });
    }

    // Get classification history for analytics from job_logs metadata
    const { data: history, error: historyError } = await supabase
      .from('job_logs')
      .select('*')
      // Assuming productId is stored in metadata as product_id
      .eq('metadata->>product_id', productId) 
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
  
  // Calculate accuracy rate (simplified - based on confidence scores from metadata)
  const confidenceScores = logs
    .map(log => log.metadata?.confidence) // Access confidence from metadata
    .filter(score => typeof score === 'number')
  
  const averageConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length // Assuming confidence is 0-1 scale
    : 0
  
  // Accuracy rate estimation (high confidence classifications as "accurate")
  // Assuming confidence in metadata is 0-1, so 0.8 is 80%
  const highConfidenceCount = confidenceScores.filter(score => score >= 0.8).length 
  const accuracyRate = confidenceScores.length > 0
    ? (highConfidenceCount / confidenceScores.length) * 100
    : 0

  // Source breakdown
  const sourceBreakdown: Record<string, number> = {}
  logs.forEach(log => {
    const source = log.metadata?.source || 'unknown' // Access source from metadata
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
    
    const confidence = log.metadata?.confidence // Access confidence from metadata
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
        ? (data.confidenceSum / data.confidenceCount) * 100 // Display as percentage
        : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // User activity
  const userActivityMap: Record<string, { count: number; lastActivity: string; userName?: string }> = {}
  
  logs.forEach(log => {
    const userId = log.metadata?.user_id || log.user_id // Prefer user_id from metadata if available
    if (!userId) return; // Skip if no user_id

    if (!userActivityMap[userId]) {
      userActivityMap[userId] = {
        count: 0,
        lastActivity: log.created_at,
        // Assuming user_name might be in metadata, or fallback if not.
        // This part might need adjustment based on actual profile data structure if joining with profiles.
        userName: log.metadata?.user_name || 'Unknown User' 
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
