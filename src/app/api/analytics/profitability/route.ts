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
    const products = searchParams.get('products')?.split(',') || []

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

    // Build product filter
    let productFilter = ''
    if (products.length > 0) {
      productFilter = `AND id IN (${products.map(p => `'${p}'`).join(',')})`
    }

    // Fetch products data with detailed cost information
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        cost,
        landed_cost,
        fba_fees,
        profit_margin,
        category,
        created_at,
        updated_at,
        status,
        units_sold,
        shipping_cost,
        customs_duties
      `)
      .eq('workspace_id', workspace_id)
      .gte('created_at', new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000)).toISOString())

    if (productsError) {
      console.error('Products fetch error:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products data' }, { status: 500 })
    }

    // Fetch products data as orders table doesn't exist
    const { data: ordersData, error: ordersError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        created_at,
        workspace_id
      `)
      .eq('workspace_id', workspace_id)
      .gte('created_at', new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000)).toISOString())

    // Don't fail if orders table doesn't exist yet
    const orders = ordersData || []

    // Calculate profitability analytics
    const analytics = calculateProfitabilityAnalytics(
      productsData || [], 
      orders, 
      period, 
      startDate, 
      endDate
    )

    return NextResponse.json({
      success: true,
      data: analytics,
      period,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Profitability Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateProfitabilityAnalytics(
  products: any[], 
  orders: any[], 
  period: string, 
  startDate?: string | null, 
  endDate?: string | null
) {
  const now = new Date()
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  
  let periodStart: Date
  let periodEnd: Date
  
  if (startDate && endDate) {
    periodStart = new Date(startDate)
    periodEnd = new Date(endDate)
  } else {
    periodStart = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
    periodEnd = now
  }

  // Filter data by period
  const periodProducts = products.filter(p => {
    const productDate = new Date(p.created_at)
    return productDate >= periodStart && productDate <= periodEnd
  })

  const periodOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at)
    return orderDate >= periodStart && orderDate <= periodEnd
  })

  // Calculate overview metrics
  const overview = calculateOverviewMetrics(periodProducts, periodOrders)
  
  // Generate trends data
  const trends = generateTrendsData(products, orders, daysBack, periodStart)
  
  // Calculate product analysis
  const productAnalysis = calculateProductAnalysis(periodProducts, periodOrders)
  
  // Calculate cost breakdown
  const costBreakdown = calculateCostBreakdown(periodProducts)
  
  // Generate benchmarks
  const benchmarks = generateBenchmarks(overview)
  
  // Generate insights
  const insights = generateInsights(overview, trends, productAnalysis)

  return {
    overview,
    trends,
    productAnalysis,
    costBreakdown,
    benchmarks,
    insights
  }
}

function calculateOverviewMetrics(products: any[], orders: any[]) {
  // Calculate from orders if available, otherwise from products
  let totalRevenue = 0
  let totalOrders = 0
  
  if (orders.length > 0) {
    totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    totalOrders = orders.length
  } else {
    // Fallback to products data
    totalRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.units_sold || 1)), 0)
    totalOrders = products.reduce((sum, p) => sum + (p.units_sold || 1), 0)
  }
  
  const totalCosts = products.reduce((sum, p) => {
    const unitsSold = p.units_sold || 1
    const productCost = (p.cost || 0) * unitsSold
    const landedCost = (p.landed_cost || 0) * unitsSold
    const fbaFees = (p.fba_fees || 0) * unitsSold
    const shippingCost = (p.shipping_cost || 0) * unitsSold
    const customsDuties = (p.customs_duties || 0) * unitsSold
    
    return sum + productCost + landedCost + fbaFees + shippingCost + customsDuties
  }, 0)
  
  const grossProfit = totalRevenue - totalCosts
  const netProfit = grossProfit // Simplified - could subtract additional operational costs
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const roi = totalCosts > 0 ? (grossProfit / totalCosts) * 100 : 0
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  return {
    totalRevenue,
    totalCosts,
    grossProfit,
    netProfit,
    profitMargin,
    roi,
    averageOrderValue,
    totalOrders
  }
}

function generateTrendsData(products: any[], orders: any[], daysBack: number, periodStart: Date) {
  const trends = []
  const now = new Date()
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + (24 * 60 * 60 * 1000))
    
    // Filter orders for this day
    const dayOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at)
      return orderDate >= dayStart && orderDate < dayEnd
    })
    
    // Calculate daily metrics
    const revenue = dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const orderCount = dayOrders.length
    
    // Estimate costs based on products (simplified)
    const costs = revenue * 0.7 // Assume 70% cost ratio
    const profit = revenue - costs
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    
    trends.push({
      period: date.toISOString().split('T')[0],
      revenue,
      costs,
      profit,
      margin,
      orders: orderCount
    })
  }
  
  return trends
}

function calculateProductAnalysis(products: any[], orders: any[]) {
  return products.map(product => {
    const productOrders = orders.filter(o => o.product_id === product.id)
    const units = productOrders.reduce((sum, o) => sum + (o.quantity || 0), 0) || product.units_sold || 1
    const revenue = productOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) || (product.price || 0) * units
    
    const productCost = (product.cost || 0) * units
    const landedCost = (product.landed_cost || 0) * units
    const fbaFees = (product.fba_fees || 0) * units
    const shippingCost = (product.shipping_cost || 0) * units
    const customsDuties = (product.customs_duties || 0) * units
    
    const totalCosts = productCost + landedCost + fbaFees + shippingCost + customsDuties
    const profit = revenue - totalCosts
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    const avgPrice = units > 0 ? revenue / units : product.price || 0
    
    return {
      productId: product.id,
      productName: product.name,
      revenue,
      costs: totalCosts,
      profit,
      margin,
      units,
      avgPrice,
      fbaFees,
      landedCost: landedCost + productCost,
      category: product.category || 'Uncategorized'
    }
  })
}

function calculateCostBreakdown(products: any[]) {
  const breakdown = {
    productCost: 0,
    fbaFees: 0,
    shipping: 0,
    customsDuties: 0,
    other: 0
  }
  
  products.forEach(product => {
    const units = product.units_sold || 1
    breakdown.productCost += (product.cost || 0) * units
    breakdown.fbaFees += (product.fba_fees || 0) * units
    breakdown.shipping += (product.shipping_cost || 0) * units
    breakdown.customsDuties += (product.customs_duties || 0) * units
    breakdown.other += (product.landed_cost || 0) * units
  })
  
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0)
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  
  return [
    {
      category: 'Product Cost',
      amount: breakdown.productCost,
      percentage: total > 0 ? (breakdown.productCost / total) * 100 : 0,
      color: colors[0]
    },
    {
      category: 'FBA Fees',
      amount: breakdown.fbaFees,
      percentage: total > 0 ? (breakdown.fbaFees / total) * 100 : 0,
      color: colors[1]
    },
    {
      category: 'Shipping',
      amount: breakdown.shipping,
      percentage: total > 0 ? (breakdown.shipping / total) * 100 : 0,
      color: colors[2]
    },
    {
      category: 'Customs & Duties',
      amount: breakdown.customsDuties,
      percentage: total > 0 ? (breakdown.customsDuties / total) * 100 : 0,
      color: colors[3]
    },
    {
      category: 'Other Fees',
      amount: breakdown.other,
      percentage: total > 0 ? (breakdown.other / total) * 100 : 0,
      color: colors[4]
    }
  ]
}

function generateBenchmarks(overview: any) {
  return [
    {
      metric: 'Profit Margin',
      current: overview.profitMargin,
      target: 30.0,
      industry: 22.5,
      status: overview.profitMargin >= 30 ? 'above' : overview.profitMargin >= 22.5 ? 'on-target' : 'below'
    },
    {
      metric: 'ROI',
      current: overview.roi,
      target: 35.0,
      industry: 28.0,
      status: overview.roi >= 35 ? 'above' : overview.roi >= 28 ? 'on-target' : 'below'
    },
    {
      metric: 'Average Order Value',
      current: overview.averageOrderValue,
      target: 70.0,
      industry: 65.0,
      status: overview.averageOrderValue >= 70 ? 'above' : overview.averageOrderValue >= 65 ? 'on-target' : 'below'
    },
    {
      metric: 'Cost Efficiency',
      current: overview.profitMargin + 50, // Simplified calculation
      target: 75.0,
      industry: 68.0,
      status: (overview.profitMargin + 50) >= 75 ? 'above' : (overview.profitMargin + 50) >= 68 ? 'on-target' : 'below'
    }
  ]
}

function generateInsights(overview: any, trends: any[], productAnalysis: any[]) {
  const insights = []
  
  // Analyze profit margin trends
  if (trends.length >= 7) {
    const recentMargin = trends.slice(-7).reduce((sum, t) => sum + t.margin, 0) / 7
    const previousMargin = trends.slice(-14, -7).reduce((sum, t) => sum + t.margin, 0) / 7
    const marginChange = recentMargin - previousMargin
    
    if (marginChange < -2) {
      insights.push({
        id: 'margin-decline',
        type: 'warning',
        title: 'Declining Margins',
        description: `Profit margins have decreased ${Math.abs(marginChange).toFixed(1)}% over the last week`,
        impact: marginChange * overview.totalRevenue / 100,
        actionable: true
      })
    } else if (marginChange > 2) {
      insights.push({
        id: 'margin-improvement',
        type: 'achievement',
        title: 'Improving Margins',
        description: `Profit margins have increased ${marginChange.toFixed(1)}% over the last week`,
        impact: marginChange * overview.totalRevenue / 100,
        actionable: false
      })
    }
  }
  
  // ROI analysis
  if (overview.roi > 35) {
    insights.push({
      id: 'roi-target',
      type: 'achievement',
      title: 'ROI Target Exceeded',
      description: `Current ROI of ${overview.roi.toFixed(1)}% exceeds target of 35%`,
      impact: (overview.roi - 35) * overview.totalCosts / 100,
      actionable: false
    })
  }
  
  // High-cost products opportunity
  const highCostProducts = productAnalysis.filter(p => p.margin < 20)
  if (highCostProducts.length > 0) {
    const potentialSavings = highCostProducts.reduce((sum, p) => sum + (p.costs * 0.1), 0)
    insights.push({
      id: 'cost-optimization',
      type: 'opportunity',
      title: 'Cost Optimization Opportunity',
      description: `${highCostProducts.length} products have margins below 20%. Optimizing costs could improve profitability`,
      impact: potentialSavings,
      actionable: true
    })
  }
  
  return insights
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}