import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'ANALYTICS_VIEW')

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Calculate date range
    const now = new Date()
    let dateFilter = ''
    
    if (startDate && endDate) {
      dateFilter = `AND created_at >= '${startDate}' AND created_at <= '${endDate}'`
    } else {
      const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
      const startOfPeriod = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
      dateFilter = `AND created_at >= '${startOfPeriod.toISOString()}'`
    }

    // Fetch products data
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        cost,
        landed_cost,
        fba_fees,
        profit_margin,
        created_at,
        updated_at,
        status
      `)
      .eq('workspace_id', workspace_id)
      .gte('created_at', new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString())

    if (productsError) {
      console.error('Products fetch error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products data' }, { status: 500 })
    }

    // Fetch review queue data
    const { data: queueItems, error: queueError } = await supabase
      .from('review_queue')
      .select('id, status, priority, created_at')
      .eq('workspace_id', workspace_id)

    if (queueError) {
      console.error('Queue fetch error:', queueError)
    }

    // Calculate analytics metrics
    const analytics = calculateAnalytics(products || [], queueItems || [], period)

    return NextResponse.json({
      success: true,
      data: analytics,
      period,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateAnalytics(products: any[], queueItems: any[], period: string) {
  const now = new Date()
  const currentPeriodStart = new Date()
  const previousPeriodStart = new Date()
  
  // Set period boundaries
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  currentPeriodStart.setDate(now.getDate() - daysBack)
  previousPeriodStart.setDate(now.getDate() - (daysBack * 2))

  // Filter products by period
  const currentProducts = products.filter(p => 
    new Date(p.created_at) >= currentPeriodStart
  )
  const previousProducts = products.filter(p => 
    new Date(p.created_at) >= previousPeriodStart && 
    new Date(p.created_at) < currentPeriodStart
  )

  // Calculate current period metrics
  const currentMetrics = calculatePeriodMetrics(currentProducts)
  const previousMetrics = calculatePeriodMetrics(previousProducts)

  // Calculate changes
  const revenueChange = previousMetrics.totalRevenue > 0 
    ? ((currentMetrics.totalRevenue - previousMetrics.totalRevenue) / previousMetrics.totalRevenue) * 100
    : 0

  const marginChange = previousMetrics.profitMargin > 0
    ? currentMetrics.profitMargin - previousMetrics.profitMargin
    : 0

  const productChange = currentProducts.length - previousProducts.length

  const roiChange = previousMetrics.averageROI > 0
    ? currentMetrics.averageROI - previousMetrics.averageROI
    : 0

  // Calculate queue statistics
  const queueStats = {
    pendingReview: queueItems.filter(q => q.status === 'pending').length,
    approved: queueItems.filter(q => q.status === 'approved').length,
    needsAttention: queueItems.filter(q => q.status === 'needs_attention' || q.priority === 'high').length,
    inProgress: queueItems.filter(q => q.status === 'in_progress').length
  }

  return {
    overview: {
      totalRevenue: currentMetrics.totalRevenue,
      profitMargin: currentMetrics.profitMargin,
      productsAnalyzed: currentProducts.length,
      averageROI: currentMetrics.averageROI,
      revenueChange,
      marginChange,
      productChange,
      roiChange
    },
    queue: queueStats,
    trends: generateTrendData(products, daysBack),
    lastCalculated: new Date().toISOString()
  }
}

function calculatePeriodMetrics(products: any[]) {
  if (products.length === 0) {
    return {
      totalRevenue: 0,
      totalCosts: 0,
      profitMargin: 0,
      averageROI: 0
    }
  }

  const totalRevenue = products.reduce((sum, p) => sum + (p.price || 0), 0)
  const totalCosts = products.reduce((sum, p) => sum + (p.cost || 0) + (p.landed_cost || 0) + (p.fba_fees || 0), 0)
  const totalProfit = totalRevenue - totalCosts
  
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  
  // Calculate ROI for products with cost data
  const productsWithCosts = products.filter(p => p.cost > 0)
  const averageROI = productsWithCosts.length > 0
    ? productsWithCosts.reduce((sum, p) => {
        const totalCost = (p.cost || 0) + (p.landed_cost || 0) + (p.fba_fees || 0)
        const roi = totalCost > 0 ? ((p.price - totalCost) / totalCost) * 100 : 0
        return sum + roi
      }, 0) / productsWithCosts.length
    : 0

  return {
    totalRevenue,
    totalCosts,
    profitMargin,
    averageROI
  }
}

function generateTrendData(products: any[], daysBack: number) {
  const trends = []
  const now = new Date()
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + (24 * 60 * 60 * 1000))
    
    const dayProducts = products.filter(p => {
      const productDate = new Date(p.created_at)
      return productDate >= dayStart && productDate < dayEnd
    })
    
    const dayMetrics = calculatePeriodMetrics(dayProducts)
    
    trends.push({
      date: date.toISOString().split('T')[0],
      revenue: dayMetrics.totalRevenue,
      costs: dayMetrics.totalCosts,
      profit: dayMetrics.totalRevenue - dayMetrics.totalCosts,
      margin: dayMetrics.profitMargin,
      products: dayProducts.length
    })
  }
  
  return trends
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}