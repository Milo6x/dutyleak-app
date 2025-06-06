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
    const includeSystemMetrics = searchParams.get('system') === 'true'
    const includeUserMetrics = searchParams.get('user') === 'true'

    // Initialize metrics calculator
    const calculator = new MetricsCalculator(user.id)

    // Calculate performance metrics
    const performanceMetrics = await calculator.calculatePerformanceMetrics(period)

    // Add system-level metrics if requested
    let systemMetrics = null
    if (includeSystemMetrics) {
      systemMetrics = await getSystemPerformanceMetrics(supabase, period)
    }

    // Add user-specific metrics if requested
    let userMetrics = null
    if (includeUserMetrics) {
      userMetrics = await getUserPerformanceMetrics(supabase, user.id, period)
    }

    // Calculate performance benchmarks
    const benchmarks = await calculatePerformanceBenchmarks(supabase, performanceMetrics)

    return NextResponse.json({
      success: true,
      data: {
        metrics: performanceMetrics,
        systemMetrics,
        userMetrics,
        benchmarks,
        period
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Performance analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getSystemPerformanceMetrics(supabase: any, period: string) {
  const dateRange = getDateRange(period)
  
  // Get system-wide job statistics
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('*')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  // Get system-wide classification statistics
  const { data: allClassifications } = await supabase
    .from('classifications')
    .select('*')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)

  const totalJobs = allJobs?.length || 0
  const completedJobs = allJobs?.filter(job => job.status === 'completed').length || 0
  const failedJobs = allJobs?.filter(job => job.status === 'failed').length || 0
  
  const systemSuccessRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
  const systemErrorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0
  
  const avgSystemAccuracy = allClassifications?.length > 0
    ? allClassifications.reduce((sum, item) => sum + (item.confidence_score || 0), 0) / allClassifications.length
    : 0

  return {
    totalSystemJobs: totalJobs,
    systemSuccessRate,
    systemErrorRate,
    avgSystemAccuracy,
    totalClassifications: allClassifications?.length || 0,
    systemLoad: calculateSystemLoad(allJobs || []),
    peakUsageHours: calculatePeakUsage(allJobs || [])
  }
}

async function getUserPerformanceMetrics(supabase: any, userId: string, period: string) {
  const dateRange = getDateRange(period)
  
  // Get user's product performance
  const { data: userProducts } = await supabase
    .from('products')
    .select(`
      id,
      name,
      created_at,
      updated_at,
      status,
      classifications(
        confidence_score,
        created_at
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', dateRange.start)

  // Get user's job performance
  const { data: userJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', dateRange.start)

  const userProductsCount = userProducts?.length || 0
  const userJobsCount = userJobs?.length || 0
  const userCompletedJobs = userJobs?.filter(job => job.status === 'completed').length || 0
  
  const userSuccessRate = userJobsCount > 0 ? (userCompletedJobs / userJobsCount) * 100 : 0
  
  // Calculate user's average classification time
  const avgClassificationTime = calculateAverageClassificationTime(userProducts || [])
  
  // Calculate user engagement metrics
  const engagementMetrics = calculateUserEngagement(userProducts || [], userJobs || [])

  return {
    productsProcessed: userProductsCount,
    jobsCompleted: userCompletedJobs,
    userSuccessRate,
    avgClassificationTime,
    engagementScore: engagementMetrics.score,
    activeHours: engagementMetrics.activeHours,
    productivityScore: calculateProductivityScore(userProducts || [], userJobs || [])
  }
}

async function calculatePerformanceBenchmarks(supabase: any, userMetrics: any) {
  // Get industry benchmarks (mock data - would come from industry standards)
  const industryBenchmarks = {
    classificationAccuracy: 0.95,
    averageProcessingTime: 120, // seconds
    errorRate: 2.0, // percentage
    throughput: 100 // items per hour
  }

  // Compare user metrics to benchmarks
  const comparison = {
    accuracyVsBenchmark: {
      user: userMetrics.classificationAccuracy,
      benchmark: industryBenchmarks.classificationAccuracy,
      performance: userMetrics.classificationAccuracy >= industryBenchmarks.classificationAccuracy ? 'above' : 'below',
      difference: ((userMetrics.classificationAccuracy - industryBenchmarks.classificationAccuracy) * 100).toFixed(2)
    },
    processingTimeVsBenchmark: {
      user: userMetrics.averageProcessingTime,
      benchmark: industryBenchmarks.averageProcessingTime,
      performance: userMetrics.averageProcessingTime <= industryBenchmarks.averageProcessingTime ? 'above' : 'below',
      difference: ((industryBenchmarks.averageProcessingTime - userMetrics.averageProcessingTime) / industryBenchmarks.averageProcessingTime * 100).toFixed(2)
    },
    errorRateVsBenchmark: {
      user: userMetrics.errorRate,
      benchmark: industryBenchmarks.errorRate,
      performance: userMetrics.errorRate <= industryBenchmarks.errorRate ? 'above' : 'below',
      difference: ((industryBenchmarks.errorRate - userMetrics.errorRate)).toFixed(2)
    },
    throughputVsBenchmark: {
      user: userMetrics.throughput,
      benchmark: industryBenchmarks.throughput,
      performance: userMetrics.throughput >= industryBenchmarks.throughput ? 'above' : 'below',
      difference: ((userMetrics.throughput - industryBenchmarks.throughput) / industryBenchmarks.throughput * 100).toFixed(2)
    }
  }

  return {
    industryBenchmarks,
    comparison,
    overallScore: calculateOverallPerformanceScore(comparison)
  }
}

function getDateRange(period: string) {
  const end = new Date()
  const start = new Date()
  
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  start.setDate(start.getDate() - days)
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

function calculateSystemLoad(jobs: any[]) {
  // Calculate system load based on job distribution over time
  const hourlyLoad = new Map()
  
  jobs.forEach(job => {
    const hour = new Date(job.created_at).getHours()
    hourlyLoad.set(hour, (hourlyLoad.get(hour) || 0) + 1)
  })
  
  const maxLoad = Math.max(...Array.from(hourlyLoad.values()))
  const avgLoad = Array.from(hourlyLoad.values()).reduce((sum, load) => sum + load, 0) / 24
  
  return {
    current: avgLoad,
    peak: maxLoad,
    utilizationPercentage: maxLoad > 0 ? (avgLoad / maxLoad) * 100 : 0
  }
}

function calculatePeakUsage(jobs: any[]) {
  const hourlyCount = new Array(24).fill(0)
  
  jobs.forEach(job => {
    const hour = new Date(job.created_at).getHours()
    hourlyCount[hour]++
  })
  
  const peakHour = hourlyCount.indexOf(Math.max(...hourlyCount))
  const peakCount = Math.max(...hourlyCount)
  
  return {
    peakHour,
    peakCount,
    hourlyDistribution: hourlyCount.map((count, hour) => ({ hour, count }))
  }
}

function calculateAverageClassificationTime(products: any[]) {
  const classificationTimes = []
  
  products.forEach(product => {
    if (product.classifications && product.classifications.length > 0) {
      const productCreated = new Date(product.created_at)
      const firstClassification = new Date(product.classifications[0].created_at)
      const timeDiff = (firstClassification.getTime() - productCreated.getTime()) / 1000 // seconds
      classificationTimes.push(timeDiff)
    }
  })
  
  return classificationTimes.length > 0
    ? classificationTimes.reduce((sum, time) => sum + time, 0) / classificationTimes.length
    : 0
}

function calculateUserEngagement(products: any[], jobs: any[]) {
  // Calculate engagement based on activity patterns
  const totalActivities = products.length + jobs.length
  const uniqueDays = new Set()
  
  products.forEach(product => {
    uniqueDays.add(new Date(product.created_at).toDateString())
  })
  
  jobs.forEach(job => {
    uniqueDays.add(new Date(job.created_at).toDateString())
  })
  
  const activeDays = uniqueDays.size
  const engagementScore = activeDays > 0 ? (totalActivities / activeDays) : 0
  
  return {
    score: engagementScore,
    activeHours: activeDays * 8, // Assume 8 hours per active day
    activeDays
  }
}

function calculateProductivityScore(products: any[], jobs: any[]) {
  // Calculate productivity based on completed work vs time spent
  const completedJobs = jobs.filter(job => job.status === 'completed').length
  const totalJobs = jobs.length
  const productsWithClassifications = products.filter(product => 
    product.classifications && product.classifications.length > 0
  ).length
  
  const jobCompletionRate = totalJobs > 0 ? (completedJobs / totalJobs) : 0
  const classificationRate = products.length > 0 ? (productsWithClassifications / products.length) : 0
  
  return ((jobCompletionRate + classificationRate) / 2) * 100
}

function calculateOverallPerformanceScore(comparison: any) {
  let score = 0
  let metrics = 0
  
  Object.values(comparison).forEach((metric: any) => {
    metrics++
    if (metric.performance === 'above') {
      score += 1
    }
  })
  
  return metrics > 0 ? (score / metrics) * 100 : 0
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetMetrics } = body

    if (action === 'optimize_performance') {
      // Trigger performance optimization
      const optimizationPlan = await createPerformanceOptimizationPlan(supabase, user.id, targetMetrics)
      
      return NextResponse.json({
        success: true,
        data: optimizationPlan,
        message: 'Performance optimization plan created'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Performance analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createPerformanceOptimizationPlan(supabase: any, userId: string, targetMetrics: any) {
  const plan = {
    userId,
    targetMetrics,
    recommendations: [],
    estimatedImpact: {},
    timeline: '30 days',
    createdAt: new Date().toISOString()
  }

  // Generate recommendations based on target metrics
  if (targetMetrics.accuracy && targetMetrics.accuracy > 0.9) {
    plan.recommendations.push({
      type: 'accuracy_improvement',
      description: 'Implement enhanced AI model training with user feedback',
      priority: 'high',
      estimatedImpact: '5-10% accuracy improvement'
    })
  }

  if (targetMetrics.processingTime && targetMetrics.processingTime < 60) {
    plan.recommendations.push({
      type: 'speed_optimization',
      description: 'Optimize database queries and implement caching',
      priority: 'medium',
      estimatedImpact: '20-30% speed improvement'
    })
  }

  // Store optimization plan
  await supabase
    .from('performance_optimization_plans')
    .insert(plan)

  return plan
}