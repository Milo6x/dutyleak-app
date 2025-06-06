import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface SavingsMetrics {
  totalSavings: number
  savingsPercentage: number
  averageSavingsPerProduct: number
  potentialSavings: number
  optimizedProducts: number
  totalProducts: number
  monthlyTrend: {
    month: string
    savings: number
    percentage: number
  }[]
  topSavingsOpportunities: {
    productId: string
    productName: string
    currentDuty: number
    optimizedDuty: number
    potentialSaving: number
    savingPercentage: number
  }[]
}

export interface ProfitabilityMetrics {
  totalRevenue: number
  totalCosts: number
  grossProfit: number
  netProfit: number
  profitMargin: number
  roi: number
  averageOrderValue: number
  totalOrders: number
  costBreakdown: {
    category: string
    amount: number
    percentage: number
  }[]
  profitabilityTrend: {
    period: string
    revenue: number
    costs: number
    profit: number
    margin: number
  }[]
}

export interface PerformanceMetrics {
  classificationAccuracy: number
  averageProcessingTime: number
  throughput: number
  errorRate: number
  systemUptime: number
  apiResponseTime: number
  userSatisfactionScore: number
  performanceTrend: {
    date: string
    accuracy: number
    processingTime: number
    throughput: number
  }[]
}

export interface ComprehensiveAnalytics {
  savings: SavingsMetrics
  profitability: ProfitabilityMetrics
  performance: PerformanceMetrics
  summary: {
    totalValue: number
    keyInsights: string[]
    recommendations: string[]
  }
  projections?: any
  categoryInsights?: any
}

export class MetricsCalculator {
  private supabase: any
  private userId: string

  constructor(userId: string) {
    this.supabase = createDutyLeakServerClient()
    this.userId = userId
  }

  async calculateSavingsMetrics(period: string = '30d'): Promise<SavingsMetrics> {
    const dateRange = this.getDateRange(period)
    
    // Fetch savings data
    const { data: savingsData } = await this.supabase
      .from('savings_ledger')
      .select(`
        *,
        product:product_id(
          id,
          name,
          price
        )
      `)
      .eq('workspace_id', this.userId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)

    // Fetch duty calculations for comparison
    const { data: dutyCalculations } = await this.supabase
      .from('duty_calculations')
      .select('*')
      .eq('workspace_id', this.userId)
      .gte('created_at', dateRange.start)

    // Calculate total savings
    const totalSavings = savingsData?.reduce((sum: number, item: any) => 
      sum + (item.savings_amount || 0), 0) || 0

    // Calculate baseline costs for percentage
    const baselineCosts = savingsData?.reduce((sum: number, item: any) => 
      sum + ((item.savings_amount || 0) / (item.savings_percentage || 1) * 100), 0) || 0

    const savingsPercentage = baselineCosts > 0 ? (totalSavings / baselineCosts) * 100 : 0

    // Get product counts
    const { data: products } = await this.supabase
      .from('products')
      .select('id')
      .eq('user_id', this.userId)

    const totalProducts = products?.length || 0
    const optimizedProducts = savingsData?.length || 0
    const averageSavingsPerProduct = optimizedProducts > 0 ? totalSavings / optimizedProducts : 0

    // Calculate monthly trend
    const monthlyTrend = this.calculateMonthlyTrend(savingsData || [], period)

    // Get top savings opportunities
    const topSavingsOpportunities = await this.getTopSavingsOpportunities()

    // Calculate potential savings from unoptimized products
    const potentialSavings = await this.calculatePotentialSavings()

    return {
      totalSavings,
      savingsPercentage,
      averageSavingsPerProduct,
      potentialSavings,
      optimizedProducts,
      totalProducts,
      monthlyTrend,
      topSavingsOpportunities
    }
  }

  async calculateProfitabilityMetrics(period: string = '30d'): Promise<ProfitabilityMetrics> {
    const dateRange = this.getDateRange(period)
    
    // Fetch products with cost data
    const { data: products } = await this.supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        cost,
        landed_cost,
        fba_fees,
        profit_margin,
        units_sold,
        created_at
      `)
      .eq('user_id', this.userId)
      .gte('created_at', dateRange.start)

    if (!products) {
      return this.getEmptyProfitabilityMetrics()
    }

    // Calculate revenue and costs
    const totalRevenue = products.reduce((sum, product) => 
      sum + ((product.price || 0) * (product.units_sold || 1)), 0)
    
    const totalCosts = products.reduce((sum, product) => 
      sum + ((product.landed_cost || product.cost || 0) * (product.units_sold || 1)), 0)
    
    const grossProfit = totalRevenue - totalCosts
    const netProfit = grossProfit // Simplified - would include other expenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const roi = totalCosts > 0 ? (grossProfit / totalCosts) * 100 : 0
    
    const totalOrders = products.reduce((sum, product) => sum + (product.units_sold || 1), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate cost breakdown
    const costBreakdown = this.calculateCostBreakdown(products)

    // Calculate profitability trend
    const profitabilityTrend = this.calculateProfitabilityTrend(products, period)

    return {
      totalRevenue,
      totalCosts,
      grossProfit,
      netProfit,
      profitMargin,
      roi,
      averageOrderValue,
      totalOrders,
      costBreakdown,
      profitabilityTrend
    }
  }

  async calculatePerformanceMetrics(period: string = '30d'): Promise<PerformanceMetrics> {
    const dateRange = this.getDateRange(period)
    
    // Fetch classification data for accuracy
    const { data: classifications } = await this.supabase
      .from('classifications')
      .select('*')
      .eq('workspace_id', this.userId)
      .gte('created_at', dateRange.start)

    // Fetch job logs for performance data
    const { data: jobLogs } = await this.supabase
      .from('job_logs')
      .select('*')
      .gte('created_at', dateRange.start)

    // Calculate classification accuracy (based on confidence scores)
    const classificationAccuracy = classifications?.length > 0 
      ? classifications.reduce((sum, item) => sum + (item.confidence_score || 0), 0) / classifications.length
      : 0

    // Calculate average processing time from job logs
    const completedJobs = jobLogs?.filter(log => log.status === 'completed') || []
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          const start = new Date(job.created_at)
          const end = new Date(job.updated_at)
          return sum + (end.getTime() - start.getTime())
        }, 0) / completedJobs.length / 1000 // Convert to seconds
      : 0

    // Calculate throughput (items processed per hour)
    const hoursInPeriod = this.getHoursInPeriod(period)
    const throughput = hoursInPeriod > 0 ? (classifications?.length || 0) / hoursInPeriod : 0

    // Calculate error rate
    const totalJobs = jobLogs?.length || 0
    const failedJobs = jobLogs?.filter(log => log.status === 'failed').length || 0
    const errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0

    // Mock values for system metrics (would be from monitoring)
    const systemUptime = 99.9
    const apiResponseTime = 150 // ms
    const userSatisfactionScore = 4.2 // out of 5

    // Calculate performance trend
    const performanceTrend = this.calculatePerformanceTrend(classifications || [], jobLogs || [], period)

    return {
      classificationAccuracy,
      averageProcessingTime,
      throughput,
      errorRate,
      systemUptime,
      apiResponseTime,
      userSatisfactionScore,
      performanceTrend
    }
  }

  async calculateComprehensiveAnalytics(period: string = '30d'): Promise<ComprehensiveAnalytics> {
    const [savings, profitability, performance] = await Promise.all([
      this.calculateSavingsMetrics(period),
      this.calculateProfitabilityMetrics(period),
      this.calculatePerformanceMetrics(period)
    ])

    const totalValue = savings.totalSavings + profitability.grossProfit
    
    const keyInsights = this.generateKeyInsights(savings, profitability, performance)
    const recommendations = this.generateRecommendations(savings, profitability, performance)

    return {
      savings,
      profitability,
      performance,
      summary: {
        totalValue,
        keyInsights,
        recommendations
      }
    }
  }

  private getDateRange(period: string) {
    const end = new Date()
    const start = new Date()
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    start.setDate(start.getDate() - days)
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    }
  }

  private getHoursInPeriod(period: string): number {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
    return days * 24
  }

  private calculateMonthlyTrend(savingsData: any[], period: string) {
    // Group savings by month
    const monthlyData = new Map()
    
    savingsData.forEach(item => {
      const date = new Date(item.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { savings: 0, count: 0 })
      }
      
      const data = monthlyData.get(monthKey)
      data.savings += item.savings_amount || 0
      data.count += 1
    })

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      savings: data.savings,
      percentage: data.count > 0 ? (data.savings / data.count) : 0
    }))
  }

  private async getTopSavingsOpportunities() {
    // This would analyze unoptimized products for potential savings
    const { data: products } = await this.supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        classifications(
          duty_percentage,
          hs6,
          hs8
        )
      `)
      .eq('user_id', this.userId)
      .limit(10)

    return (products || []).map(product => ({
      productId: product.id,
      productName: product.name,
      currentDuty: product.classifications?.[0]?.duty_percentage || 0,
      optimizedDuty: 0, // Would calculate optimal duty rate
      potentialSaving: 0, // Would calculate potential savings
      savingPercentage: 0
    }))
  }

  private async calculatePotentialSavings(): Promise<number> {
    // Calculate potential savings from unoptimized products
    const { data: unoptimizedProducts } = await this.supabase
      .from('products')
      .select('price, cost')
      .eq('user_id', this.userId)
      .is('optimized', false)

    return (unoptimizedProducts || []).reduce((sum, product) => 
      sum + ((product.price || 0) * 0.05), 0) // Assume 5% potential savings
  }

  private calculateCostBreakdown(products: any[]) {
    const totalCosts = products.reduce((sum, product) => 
      sum + ((product.landed_cost || product.cost || 0) * (product.units_sold || 1)), 0)

    const categories = {
      'Product Cost': products.reduce((sum, p) => sum + ((p.cost || 0) * (p.units_sold || 1)), 0),
      'Shipping': products.reduce((sum, p) => sum + ((p.shipping_cost || 0) * (p.units_sold || 1)), 0),
      'Duties & Taxes': products.reduce((sum, p) => sum + ((p.customs_duties || 0) * (p.units_sold || 1)), 0),
      'FBA Fees': products.reduce((sum, p) => sum + ((p.fba_fees || 0) * (p.units_sold || 1)), 0)
    }

    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalCosts > 0 ? (amount / totalCosts) * 100 : 0
    }))
  }

  private calculateProfitabilityTrend(products: any[], period: string) {
    // Group products by time period for trend analysis
    const periodData = new Map()
    
    products.forEach(product => {
      const date = new Date(product.created_at)
      const periodKey = period === '7d' 
        ? date.toISOString().split('T')[0] // Daily
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // Monthly
      
      if (!periodData.has(periodKey)) {
        periodData.set(periodKey, { revenue: 0, costs: 0, profit: 0 })
      }
      
      const data = periodData.get(periodKey)
      const revenue = (product.price || 0) * (product.units_sold || 1)
      const costs = (product.landed_cost || product.cost || 0) * (product.units_sold || 1)
      
      data.revenue += revenue
      data.costs += costs
      data.profit += (revenue - costs)
    })

    return Array.from(periodData.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      costs: data.costs,
      profit: data.profit,
      margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
    }))
  }

  private calculatePerformanceTrend(classifications: any[], jobLogs: any[], period: string) {
    // Calculate daily performance metrics
    const dailyData = new Map()
    
    classifications.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { accuracy: [], processingTime: [], throughput: 0 })
      }
      
      const data = dailyData.get(date)
      data.accuracy.push(item.confidence_score || 0)
      data.throughput += 1
    })

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      accuracy: data.accuracy.length > 0 ? data.accuracy.reduce((a, b) => a + b) / data.accuracy.length : 0,
      processingTime: 150, // Mock value
      throughput: data.throughput
    }))
  }

  private generateKeyInsights(savings: SavingsMetrics, profitability: ProfitabilityMetrics, performance: PerformanceMetrics): string[] {
    const insights = []
    
    if (savings.savingsPercentage > 10) {
      insights.push(`Excellent savings performance with ${savings.savingsPercentage.toFixed(1)}% cost reduction`)
    }
    
    if (profitability.profitMargin > 20) {
      insights.push(`Strong profit margins at ${profitability.profitMargin.toFixed(1)}%`)
    }
    
    if (performance.classificationAccuracy > 0.9) {
      insights.push(`High classification accuracy at ${(performance.classificationAccuracy * 100).toFixed(1)}%`)
    }
    
    return insights
  }

  private generateRecommendations(savings: SavingsMetrics, profitability: ProfitabilityMetrics, performance: PerformanceMetrics): string[] {
    const recommendations = []
    
    if (savings.optimizedProducts < savings.totalProducts * 0.5) {
      recommendations.push('Consider optimizing more products to increase overall savings')
    }
    
    if (profitability.profitMargin < 15) {
      recommendations.push('Focus on cost reduction strategies to improve profit margins')
    }
    
    if (performance.errorRate > 5) {
      recommendations.push('Investigate and address classification errors to improve accuracy')
    }
    
    return recommendations
  }

  private getEmptyProfitabilityMetrics(): ProfitabilityMetrics {
    return {
      totalRevenue: 0,
      totalCosts: 0,
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0,
      roi: 0,
      averageOrderValue: 0,
      totalOrders: 0,
      costBreakdown: [],
      profitabilityTrend: []
    }
  }
}