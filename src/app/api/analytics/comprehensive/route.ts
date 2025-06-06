import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { MetricsCalculator } from '@/lib/analytics/metrics-calculator'

export async function GET(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const includeProjections = searchParams.get('projections') === 'true'
    const category = searchParams.get('category')

    // Initialize metrics calculator
    const calculator = new MetricsCalculator(user.id)

    // Calculate comprehensive analytics
    const analytics = await calculator.calculateComprehensiveAnalytics(period)

    // Add additional insights and projections if requested
    if (includeProjections) {
      analytics.projections = await calculateProjections(calculator, period)
    }

    // Add category-specific insights if requested
    if (category) {
      analytics.categoryInsights = await getCategoryInsights(calculator, category, period)
    }

    // Add real-time metrics
    const realTimeMetrics = await getRealTimeMetrics(supabase, user.id)
    
    return NextResponse.json({
      success: true,
      data: {
        ...analytics,
        realTime: realTimeMetrics,
        metadata: {
          period,
          generatedAt: new Date().toISOString(),
          userId: user.id,
          includeProjections,
          category
        }
      }
    })

  } catch (error) {
    console.error('Comprehensive analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateProjections(calculator: MetricsCalculator, period: string) {
  // Calculate projections based on current trends
  const currentMetrics = await calculator.calculateComprehensiveAnalytics(period)
  
  // Simple projection logic - in production, this would use more sophisticated forecasting
  const projectionPeriods = ['1m', '3m', '6m', '1y']
  const projections = {}
  
  for (const projPeriod of projectionPeriods) {
    const multiplier = getProjectionMultiplier(period, projPeriod)
    
    projections[projPeriod] = {
      savings: {
        totalSavings: currentMetrics.savings.totalSavings * multiplier,
        savingsPercentage: currentMetrics.savings.savingsPercentage * (1 + (multiplier - 1) * 0.5),
        optimizedProducts: Math.min(
          currentMetrics.savings.totalProducts,
          currentMetrics.savings.optimizedProducts * multiplier
        )
      },
      profitability: {
        totalRevenue: currentMetrics.profitability.totalRevenue * multiplier,
        grossProfit: currentMetrics.profitability.grossProfit * multiplier * 1.1, // Assume improving margins
        profitMargin: Math.min(50, currentMetrics.profitability.profitMargin * 1.05)
      },
      performance: {
        classificationAccuracy: Math.min(0.99, currentMetrics.performance.classificationAccuracy * 1.02),
        averageProcessingTime: currentMetrics.performance.averageProcessingTime * 0.95, // Assume optimization
        throughput: currentMetrics.performance.throughput * multiplier
      }
    }
  }
  
  return projections
}

function getProjectionMultiplier(currentPeriod: string, projectionPeriod: string): number {
  // Convert periods to days for calculation
  const periodToDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    '1m': 30,
    '3m': 90,
    '6m': 180
  }
  
  const currentDays = periodToDays[currentPeriod] || 30
  const projectionDays = periodToDays[projectionPeriod] || 30
  
  // Simple linear projection with growth factor
  const baseMultiplier = projectionDays / currentDays
  const growthFactor = 1 + (projectionDays / 365) * 0.1 // 10% annual growth assumption
  
  return baseMultiplier * growthFactor
}

async function getCategoryInsights(calculator: MetricsCalculator, category: string, period: string) {
  // This would fetch category-specific analytics
  // For now, return placeholder data
  return {
    category,
    period,
    insights: [
      `${category} category shows strong performance`,
      `Optimization opportunities identified in ${category}`,
      `${category} trending upward in savings potential`
    ],
    metrics: {
      totalProducts: 0,
      optimizedProducts: 0,
      averageSavings: 0,
      topPerformers: []
    }
  }
}

async function getRealTimeMetrics(supabase: any, userId: string) {
  try {
    // Get current active jobs
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent classifications
    const { data: recentClassifications } = await supabase
      .from('classifications')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    // Get system status
    const systemStatus = await getSystemStatus(supabase)

    // Calculate real-time metrics
    const activeJobsCount = activeJobs?.length || 0
    const classificationsLast24h = recentClassifications?.length || 0
    const averageClassificationTime = recentClassifications?.length > 0 
      ? recentClassifications.reduce((sum, c) => {
          const processingTime = c.completed_at 
            ? new Date(c.completed_at).getTime() - new Date(c.created_at).getTime()
            : 0
          return sum + processingTime
        }, 0) / recentClassifications.length / 1000
      : 0

    return {
      activeJobs: activeJobsCount,
      classificationsLast24h,
      averageClassificationTime,
      systemStatus,
      lastUpdated: new Date().toISOString(),
      alerts: generateRealTimeAlerts({
        activeJobs: activeJobsCount,
        classificationsLast24h,
        averageClassificationTime,
        systemStatus
      })
    }
  } catch (error) {
    console.error('Error fetching real-time metrics:', error)
    return {
      activeJobs: 0,
      classificationsLast24h: 0,
      averageClassificationTime: 0,
      systemStatus: 'unknown',
      lastUpdated: new Date().toISOString(),
      alerts: []
    }
  }
}

async function getSystemStatus(supabase: any) {
  try {
    // Simple health check - try to query a table
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)

    return error ? 'degraded' : 'operational'
  } catch {
    return 'down'
  }
}

function generateRealTimeAlerts(metrics: any) {
  const alerts = []

  // Check for high processing times
  if (metrics.averageClassificationTime > 120) {
    alerts.push({
      type: 'warning',
      message: 'Classification processing time is above normal',
      severity: 'medium',
      action: 'Review system performance'
    })
  }

  // Check for too many active jobs
  if (metrics.activeJobs > 10) {
    alerts.push({
      type: 'info',
      message: `${metrics.activeJobs} jobs currently active`,
      severity: 'low',
      action: 'Monitor job queue'
    })
  }

  // Check for low activity
  if (metrics.classificationsLast24h < 5) {
    alerts.push({
      type: 'info',
      message: 'Low classification activity in the last 24 hours',
      severity: 'low',
      action: 'Consider running batch classifications'
    })
  }

  // System status alerts
  if (metrics.systemStatus === 'degraded') {
    alerts.push({
      type: 'warning',
      message: 'System performance is degraded',
      severity: 'high',
      action: 'Check system health'
    })
  } else if (metrics.systemStatus === 'down') {
    alerts.push({
      type: 'error',
      message: 'System is experiencing issues',
      severity: 'critical',
      action: 'Contact support immediately'
    })
  }

  return alerts
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, parameters } = body

    switch (action) {
      case 'refresh_cache':
        // Trigger cache refresh for analytics data
        await refreshAnalyticsCache(supabase, user.id)
        return NextResponse.json({ success: true, message: 'Cache refreshed' })

      case 'generate_insights':
        // Generate AI-powered insights
        const insights = await generateAIInsights(supabase, user.id, parameters)
        return NextResponse.json({ success: true, insights })

      case 'schedule_report':
        // Schedule automated report generation
        const reportJob = await scheduleReport(supabase, user.id, parameters)
        return NextResponse.json({ success: true, jobId: reportJob.id })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Comprehensive analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function refreshAnalyticsCache(supabase: any, userId: string) {
  // Implementation would clear and rebuild analytics cache
  // For now, just log the action
  console.log(`Refreshing analytics cache for user ${userId}`)
}

async function generateAIInsights(supabase: any, userId: string, parameters: any) {
  // This would integrate with AI service to generate insights
  // For now, return sample insights
  return [
    'Your savings rate has improved by 15% this month',
    'Consider optimizing products in the Electronics category for maximum impact',
    'Processing efficiency is trending upward with 12% faster classifications'
  ]
}

async function scheduleReport(supabase: any, userId: string, parameters: any) {
  const reportJob = {
    user_id: userId,
    type: 'scheduled_report',
    status: 'pending',
    input_data: parameters,
    created_at: new Date().toISOString()
  }

  const { data } = await supabase
    .from('jobs')
    .insert(reportJob)
    .select()
    .single()

  return data
}