import { createDutyLeakServerClient } from '@/lib/supabase/server'
// import { cookies } from 'next/headers' // cookies import not used server-side in this class
import { OptimizationEngine, OptimizationRecommendation } from '@/lib/duty/optimization-engine' // Added import

// Define a more specific type for items from savings_ledger joined with product
interface SavingsLedgerItemWithProduct {
  savings_amount: number | null;
  savings_percentage: number | null;
  created_at: string; // Assuming created_at is present for monthlyTrend
  product_id: string; // Assuming product_id is present
  // other fields from savings_ledger can be added here if known
  product?: { // product can be null if join fails or no product
    id: string;
    name: string | null;
    price: number | null;
    // other fields from product
  } | null;
}

// Define Product type for profitability calculations at module scope
type ProductProfitability = {
  id: string;
  name: string;
  price: number | null;
  cost: number | null;
  landed_cost: number | null;
  fba_fees: number | null;
  profit_margin: number | null;
  units_sold: number | null;
  created_at: string;
};

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
  private workspaceId: string // Renamed for clarity

  constructor(workspaceId: string) { // Renamed for clarity
    this.supabase = createDutyLeakServerClient()
    this.workspaceId = workspaceId
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
      .eq('workspace_id', this.workspaceId) // Use renamed workspaceId
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)

    // Fetch duty calculations for comparison
    const { data: dutyCalculations } = await this.supabase
      .from('duty_calculations')
      .select('*')
      .eq('workspace_id', this.workspaceId) // Use renamed workspaceId
      .gte('created_at', dateRange.start)

    // Calculate total savings
    const totalSavings = (savingsData as SavingsLedgerItemWithProduct[] | null)?.reduce((sum: number, item: SavingsLedgerItemWithProduct) => 
      sum + (item.savings_amount || 0), 0) || 0

    // Calculate baseline costs for percentage
    const baselineCosts = (savingsData as SavingsLedgerItemWithProduct[] | null)?.reduce((sum: number, item: SavingsLedgerItemWithProduct) => 
      sum + ((item.savings_amount || 0) / (item.savings_percentage || 1) * 100), 0) || 0

    const savingsPercentage = baselineCosts > 0 ? (totalSavings / baselineCosts) * 100 : 0

    // Get product counts
    const { data: products } = await this.supabase
      .from('products')
      .select('id')
      .eq('workspace_id', this.workspaceId) // Assuming products are also scoped by workspaceId. If 'user_id' is correct, this needs to match the actual schema and intent.

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
      .eq('workspace_id', this.workspaceId) // Assuming products are also scoped by workspaceId
      .gte('created_at', dateRange.start)

    if (!products) {
      return this.getEmptyProfitabilityMetrics()
    }

    const typedProducts = products as ProductProfitability[];

    // Calculate revenue and costs
    const totalRevenue = typedProducts.reduce((sum: number, product: ProductProfitability) => 
      sum + ((product.price || 0) * (product.units_sold || 1)), 0)
    
    const totalCosts = typedProducts.reduce((sum: number, product: ProductProfitability) => 
      sum + ((product.landed_cost || product.cost || 0) * (product.units_sold || 1)), 0)
    
    const grossProfit = totalRevenue - totalCosts
    const netProfit = grossProfit // Simplified - would include other expenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const roi = totalCosts > 0 ? (grossProfit / totalCosts) * 100 : 0
    
    const totalOrders = typedProducts.reduce((sum: number, product: ProductProfitability) => sum + (product.units_sold || 1), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate cost breakdown
    const costBreakdown = this.calculateCostBreakdown(typedProducts)

    // Calculate profitability trend
    const profitabilityTrend = this.calculateProfitabilityTrend(typedProducts, period)

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
      .eq('workspace_id', this.workspaceId) // Use renamed workspaceId
      .gte('created_at', dateRange.start)

    // Fetch job logs for performance data
    const { data: jobLogs } = await this.supabase
      .from('job_logs')
      .select('*')
      .eq('workspace_id', this.workspaceId) // Added workspaceId filter
      .gte('created_at', dateRange.start)

    // Calculate classification accuracy (based on confidence scores)
    const classificationAccuracy = classifications?.length > 0 
      ? classifications.reduce((sum: number, item: Record<string, any>) => sum + (item.confidence_score || 0), 0) / classifications.length
      : 0

    // Calculate average processing time from job logs
    const completedJobs = jobLogs?.filter((log: Record<string, any>) => log.status === 'completed') || []
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum: number, job: Record<string, any>) => {
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
    const failedJobs = jobLogs?.filter((log: Record<string, any>) => log.status === 'failed').length || 0
    const errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0

    // Mock values for system metrics (would be from monitoring - requires external integration for real data)
    const systemUptime = 99.9 // Example: Percentage, e.g., from a status page API
    const apiResponseTime = 150 // Example: Milliseconds, e.g., average from API gateway logs
    const userSatisfactionScore = 4.2 // Example: Score out of 5, e.g., from feedback surveys

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

    return Array.from(monthlyData.entries()).map(([month, data]: [string, { savings: number; count: number }]) => ({
      month,
      savings: data.savings,
      percentage: data.count > 0 ? (data.savings / data.count) : 0 // This percentage might need re-evaluation based on definition
    }))
  }

  private async getTopSavingsOpportunities(limit: number = 5): Promise<SavingsMetrics['topSavingsOpportunities']> {
    const optimizationEngine = new OptimizationEngine() // Use default options

    // Fetch products that might have optimization opportunities.
    const { data: productsData, error: productsError } = await this.supabase
      .from('products')
      .select('id, name, cost') // cost is used by OptimizationEngine
      .eq('workspace_id', this.workspaceId) // Assuming products are also scoped by workspaceId
      .limit(50) // Consider a reasonable limit for performance

    if (productsError || !productsData || productsData.length === 0) {
      console.error('Error fetching products or no products found for savings opportunities:', productsError)
      return []
    }

    const productIds = productsData.map((p: { id: string }) => p.id)
    // Ensure product names in the map are always strings to prevent type issues.
    const productNameMap = new Map(
      productsData.map((p: { id: string; name: string | null }) => { // Changed 'any' to 'string | null'
        return [p.id, p.name || 'Unnamed Product']; // If p.name is null or empty, use 'Unnamed Product'
      })
    );

    const recommendations: OptimizationRecommendation[] = await optimizationEngine.generateRecommendations(productIds)
    
    type TopSavingsOpportunityItem = SavingsMetrics['topSavingsOpportunities'][0];

    const allOpportunities: SavingsMetrics['topSavingsOpportunities'] = recommendations
      .filter(rec => rec.type === 'classification' && rec.potentialSaving > 0 && rec.productId)
      .map((rec: OptimizationRecommendation): TopSavingsOpportunityItem => {
        const nameFromMap = productNameMap.get(rec.productId!); // string | undefined
        return {
          productId: rec.productId!,
          productName: typeof nameFromMap === 'string' ? nameFromMap : 'Unknown Product', // Using ternary
          currentDuty: rec.currentDutyRate,
          optimizedDuty: rec.recommendedDutyRate,
          potentialSaving: rec.potentialSaving,
          savingPercentage: rec.savingPercentage,
        };
      })

    // Sort by potential saving and return top N
    return allOpportunities
      .sort((a, b) => b.potentialSaving - a.potentialSaving)
      .slice(0, limit)
  }

  private async calculatePotentialSavings(): Promise<number> {
    const optimizationEngine = new OptimizationEngine({
      // Consider using specific options if defaults are too slow or not sensitive enough
      // maxRecommendations: 3, // Limit recommendations per product for this broad calculation
      // confidenceThreshold: 0.5 // Lower threshold for "potential"
    });

    // Fetch a sample of products. A more advanced version might specifically fetch "unoptimized" products.
    const { data: productsData, error: productsError } = await this.supabase
      .from('products')
      .select('id, name, cost') // 'cost' is used as productValue by OptimizationEngine
      .eq('workspace_id', this.workspaceId) // Assuming products are also scoped by workspaceId
      .limit(100); // Sample size for estimation, adjust based on performance

    if (productsError || !productsData || productsData.length === 0) {
      console.error('Error fetching products for potential savings calculation:', productsError);
      return 0;
    }

    const productIds = productsData.map((p: { id: string }) => p.id);
    
    let totalPotentialFromSample = 0;
    try {
      // Get all recommendations for this batch of products
      const allRecommendations: OptimizationRecommendation[] = await optimizationEngine.generateRecommendations(productIds);

      // Sum up potential savings from classification-type recommendations
      totalPotentialFromSample = allRecommendations
        .filter(rec => rec.type === 'classification' && rec.potentialSaving > 0)
        .reduce((sum: number, rec: OptimizationRecommendation) => sum + rec.potentialSaving, 0);
    } catch (engineError) {
      console.error('Error running OptimizationEngine for potential savings:', engineError);
      // Fallback to a simpler estimation if OptimizationEngine fails for the batch
      return (productsData || []).reduce((sum: number, product: Record<string, any>) => 
        sum + ((product.price || product.cost || 0) * 0.02), 0); // Fallback to 2% estimate
    }
    
    // Note: This sum is for the sampled products. 
    // Extrapolation to total product count could be done here if desired,
    // but requires fetching total unoptimized product count and assuming sample is representative.
    // For now, returning the sum for the sample provides a more grounded estimate than a flat percentage.
    return totalPotentialFromSample;
  }

  private calculateCostBreakdown(products: ProductProfitability[]) { // Used ProductProfitability type
    const totalProductCost = products.reduce((sum: number, p: ProductProfitability) => sum + ((p.cost || 0) * (p.units_sold || 1)), 0);
    const totalFbaFees = products.reduce((sum: number, p: ProductProfitability) => sum + ((p.fba_fees || 0) * (p.units_sold || 1)), 0);
    
    const totalOtherImportCosts = products.reduce((sum: number, p: ProductProfitability) => {
      const productLandedCost = p.landed_cost || p.cost || 0;
      const productBaseCost = p.cost || 0;
      const productFbaFees = p.fba_fees || 0;
      const units = p.units_sold || 1;
      const otherCostsForProduct = productLandedCost - productBaseCost - productFbaFees;
      return sum + (Math.max(0, otherCostsForProduct) * units);
    }, 0);

    const grandTotalCalculatedCosts = totalProductCost + totalFbaFees + totalOtherImportCosts;

    // If grandTotalCalculatedCosts is zero (e.g. all costs are null/zero), prevent division by zero
    const safeTotalCosts = grandTotalCalculatedCosts > 0 ? grandTotalCalculatedCosts : 1;

    const categories = {
      'Product Cost': totalProductCost,
      'FBA Fees': totalFbaFees,
      'Shipping & Duties': totalOtherImportCosts, // Combined category
    };

    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount: amount as number,
      percentage: (amount / safeTotalCosts) * 100
    }));
  }

  private calculateProfitabilityTrend(products: ProductProfitability[], period: string) { // Used ProductProfitability type
    // Group products by time period for trend analysis
    const periodData = new Map()
    
    products.forEach((product: ProductProfitability) => {
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
    const dailyData = new Map<string, { accuracy: number[], processingTime: number[], throughput: number }>()
    
    classifications.forEach((item: any) => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { accuracy: [], processingTime: [], throughput: 0 })
      }
      
      const data = dailyData.get(date)! // Assert data is not undefined
      data.accuracy.push(item.confidence_score || 0)
      data.throughput += 1
    })

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      accuracy: data.accuracy.length > 0 ? data.accuracy.reduce((a: number, b: number) => a + b, 0) / data.accuracy.length : 0,
      processingTime: 150, // Mock value, actual processing time for classifications might be complex to get here
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
