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

    // Calculate savings metrics
    const savingsMetrics = await calculator.calculateSavingsMetrics(period)

    // Add category filtering if specified
    let filteredMetrics = savingsMetrics
    if (category) {
      // Filter top savings opportunities by category
      filteredMetrics = {
        ...savingsMetrics,
        topSavingsOpportunities: savingsMetrics.topSavingsOpportunities.filter(
          opportunity => opportunity.productName.toLowerCase().includes(category.toLowerCase())
        )
      }
    }

    // Add projections if requested
    let projections = null
    if (includeProjections) {
      projections = await calculateSavingsProjections(supabase, user.id, savingsMetrics)
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: filteredMetrics,
        projections,
        period,
        category: category || 'all'
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Savings analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function calculateSavingsProjections(supabase: any, userId: string, currentMetrics: any) {
  // Calculate 12-month projections based on current trends
  const monthlyGrowthRate = 0.05 // 5% monthly growth assumption
  const projections = []
  
  for (let i = 1; i <= 12; i++) {
    const projectedSavings = currentMetrics.totalSavings * Math.pow(1 + monthlyGrowthRate, i)
    const projectedOptimizedProducts = Math.min(
      currentMetrics.totalProducts,
      currentMetrics.optimizedProducts + (i * 10) // Assume 10 products optimized per month
    )
    
    projections.push({
      month: i,
      projectedSavings,
      projectedOptimizedProducts,
      projectedSavingsPercentage: currentMetrics.savingsPercentage * (1 + (i * 0.01)) // 1% improvement per month
    })
  }
  
  return {
    twelveMonthProjection: projections,
    assumptions: {
      monthlyGrowthRate,
      productsOptimizedPerMonth: 10,
      efficiencyImprovement: 0.01
    }
  }
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
    const { action, productIds, targetSavingsPercentage } = body

    if (action === 'optimize_products') {
      // Trigger optimization for specific products
      const results = await optimizeProductsForSavings(supabase, user.id, productIds, targetSavingsPercentage)
      
      return NextResponse.json({
        success: true,
        data: results,
        message: `Optimization initiated for ${productIds.length} products`
      })
    }

    if (action === 'export_report') {
      // Generate savings report for export
      const calculator = new MetricsCalculator(user.id)
      const metrics = await calculator.calculateSavingsMetrics('90d') // 3-month report
      
      const reportData = {
        reportType: 'savings_analysis',
        generatedAt: new Date().toISOString(),
        period: '90d',
        metrics,
        summary: {
          totalSavings: metrics.totalSavings,
          savingsPercentage: metrics.savingsPercentage,
          optimizationRate: (metrics.optimizedProducts / metrics.totalProducts) * 100
        }
      }
      
      return NextResponse.json({
        success: true,
        data: reportData,
        downloadUrl: `/api/analytics/export?type=savings&period=90d`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Savings analytics POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function optimizeProductsForSavings(supabase: any, userId: string, productIds: string[], targetPercentage: number) {
  const results = []
  
  for (const productId of productIds) {
    try {
      // Get current product data
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', userId)
        .single()

      if (!product) {continue}

      // Simulate optimization process
      const optimizationResult = {
        productId,
        productName: product.name,
        currentCost: product.landed_cost || product.cost,
        optimizedCost: (product.landed_cost || product.cost) * (1 - targetPercentage / 100),
        projectedSavings: (product.landed_cost || product.cost) * (targetPercentage / 100),
        status: 'optimization_queued'
      }

      // Queue optimization job (would integrate with actual optimization engine)
      await supabase
        .from('jobs')
        .insert({
          user_id: userId,
          type: 'duty_optimization',
          status: 'pending',
          input_data: {
            product_id: productId,
            target_savings_percentage: targetPercentage
          },
          created_at: new Date().toISOString()
        })

      results.push(optimizationResult)
    } catch (error) {
      console.error(`Error optimizing product ${productId}:`, error)
      results.push({
        productId,
        status: 'error',
        error: 'Failed to queue optimization'
      })
    }
  }
  
  return results
}