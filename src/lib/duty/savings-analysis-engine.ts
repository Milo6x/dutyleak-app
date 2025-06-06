import { createBrowserClient } from '../supabase'
import { OptimizationEngine, OptimizationRecommendation, OptimizationAnalysis } from './optimization-engine'
import { ScenarioEngine, ScenarioEngineOptions, ScenarioResult } from './scenario-engine'
import { LandedCostCalculator } from './landed-cost-calculator'
import { EnhancedDutyEngine, DutyCalculationRequest } from './enhanced-duty-engine'

export interface SavingsAnalysisOptions {
  includeShippingVariations?: boolean
  includeOriginCountryVariations?: boolean
  includeClassificationVariations?: boolean
  includeTradeAgreements?: boolean
  includeFBAOptimizations?: boolean
  timeHorizonMonths?: number
  confidenceThreshold?: number
  minSavingThreshold?: number
  maxScenarios?: number
}

export interface ProductSavingsScenario {
  id: string
  name: string
  description: string
  productId: string
  baselineCalculation: LandedCostBreakdown
  optimizedCalculation: LandedCostBreakdown
  savingsBreakdown: SavingsBreakdown
  implementationRequirements: ImplementationRequirement[]
  riskAssessment: RiskAssessment
  timeToImplement: string
  confidence: number
}

export interface LandedCostBreakdown {
  productValue: number
  dutyAmount: number
  vatAmount: number
  shippingCost: number
  insuranceCost: number
  fbaFees: number
  brokerFees: number
  totalLandedCost: number
  profitMargin?: number
  sellingPrice?: number
}

export interface SavingsBreakdown {
  dutyReduction: number
  vatReduction: number
  shippingReduction: number
  fbaReduction: number
  totalSavingsPerUnit: number
  totalSavingsPercentage: number
  annualSavings: number
  roi: number
  paybackPeriod: string
}

export interface ImplementationRequirement {
  type: 'documentation' | 'certification' | 'supplier_change' | 'process_change' | 'legal_review'
  description: string
  estimatedCost: number
  timeRequired: string
  complexity: 'low' | 'medium' | 'high'
}

export interface RiskAssessment {
  complianceRisk: 'low' | 'medium' | 'high'
  supplierRisk: 'low' | 'medium' | 'high'
  marketRisk: 'low' | 'medium' | 'high'
  overallRisk: 'low' | 'medium' | 'high'
  mitigationStrategies: string[]
}

export interface BatchSavingsAnalysis {
  totalProducts: number
  totalCurrentCost: number
  totalOptimizedCost: number
  totalSavings: number
  totalSavingsPercentage: number
  averageROI: number
  scenarios: ProductSavingsScenario[]
  summary: SavingsAnalysisSummary
  recommendations: PortfolioRecommendation[]
}

export interface SavingsAnalysisSummary {
  highImpactScenarios: number
  quickWins: number
  longTermOpportunities: number
  totalImplementationCost: number
  netSavings: number
  priorityOrder: string[]
}

export interface PortfolioRecommendation {
  id: string
  type: 'immediate' | 'short_term' | 'long_term'
  title: string
  description: string
  affectedProducts: string[]
  totalSavings: number
  implementationCost: number
  timeframe: string
  priority: 'high' | 'medium' | 'low'
}

export interface ScenarioComparisonOptions {
  productIds: string[]
  variations: {
    shippingMethods?: string[]
    originCountries?: string[]
    destinationCountries?: string[]
    hsCodeAlternatives?: boolean
    tradeAgreements?: boolean
    fbaOptimizations?: boolean
  }
  analysisDepth: 'basic' | 'comprehensive' | 'exhaustive'
  timeHorizon: number // months
}

export interface MultiScenarioComparison {
  baselineScenario: ScenarioResult
  alternativeScenarios: ScenarioResult[]
  bestScenario: ScenarioResult
  worstScenario: ScenarioResult
  savingsMatrix: SavingsMatrix
  recommendations: string[]
  riskAnalysis: string[]
}

export interface SavingsMatrix {
  byShippingMethod: { [method: string]: number }
  byOriginCountry: { [country: string]: number }
  byDestinationCountry: { [country: string]: number }
  byClassification: { [hsCode: string]: number }
  byTradeAgreement: { [agreement: string]: number }
}

export class SavingsAnalysisEngine {
  private supabase = createBrowserClient()
  private optimizationEngine: OptimizationEngine
  private scenarioEngine: ScenarioEngine
  private dutyEngine: EnhancedDutyEngine
  private options: SavingsAnalysisOptions

  constructor(options: Partial<SavingsAnalysisOptions> = {}) {
    this.options = {
      includeShippingVariations: options.includeShippingVariations ?? true,
      includeOriginCountryVariations: options.includeOriginCountryVariations ?? true,
      includeClassificationVariations: options.includeClassificationVariations ?? true,
      includeTradeAgreements: options.includeTradeAgreements ?? true,
      includeFBAOptimizations: options.includeFBAOptimizations ?? true,
      timeHorizonMonths: options.timeHorizonMonths ?? 12,
      confidenceThreshold: options.confidenceThreshold ?? 0.7,
      minSavingThreshold: options.minSavingThreshold ?? 50,
      maxScenarios: options.maxScenarios ?? 20
    }

    this.optimizationEngine = new OptimizationEngine({
      confidenceThreshold: this.options.confidenceThreshold,
      minPotentialSaving: this.options.minSavingThreshold,
      includeAdvancedOptimizations: true,
      maxRecommendations: this.options.maxScenarios
    })

    this.scenarioEngine = new ScenarioEngine()
    this.dutyEngine = new EnhancedDutyEngine({
      useExternalAPIs: true,
      includeOptimization: true,
      includeCompliance: true
    })
  }

  /**
   * Analyze a batch of products with configuration options
   */
  async analyzeBatch(
    products: any[],
    configuration?: any
  ): Promise<BatchSavingsAnalysis> {
    // Extract product IDs from product objects
    const productIds = products.map(product => 
      typeof product === 'string' ? product : product.id || product.product_id
    )
    
    // Use the existing analyzeBatchSavings method
    return this.analyzeBatchSavings(productIds)
  }

  /**
   * Perform comprehensive savings analysis for a batch of products
   */
  async analyzeBatchSavings(productIds: string[]): Promise<BatchSavingsAnalysis> {
    const scenarios: ProductSavingsScenario[] = []
    let totalCurrentCost = 0
    let totalOptimizedCost = 0

    // Process products in parallel with concurrency limit
    const concurrencyLimit = 5
    const chunks = this.chunkArray(productIds, concurrencyLimit)

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(productId => this.analyzeProductSavings(productId))
      )
      scenarios.push(...chunkResults.filter(Boolean) as ProductSavingsScenario[])
    }

    // Calculate totals
    scenarios.forEach(scenario => {
      totalCurrentCost += scenario.baselineCalculation.totalLandedCost
      totalOptimizedCost += scenario.optimizedCalculation.totalLandedCost
    })

    const totalSavings = totalCurrentCost - totalOptimizedCost
    const totalSavingsPercentage = totalCurrentCost > 0 ? (totalSavings / totalCurrentCost) * 100 : 0
    const averageROI = scenarios.length > 0 
      ? scenarios.reduce((sum, s) => sum + s.savingsBreakdown.roi, 0) / scenarios.length 
      : 0

    // Generate summary and recommendations
    const summary = this.generateSummary(scenarios)
    const recommendations = this.generatePortfolioRecommendations(scenarios)

    return {
      totalProducts: productIds.length,
      totalCurrentCost,
      totalOptimizedCost,
      totalSavings,
      totalSavingsPercentage,
      averageROI,
      scenarios,
      summary,
      recommendations
    }
  }

  /**
   * Analyze savings opportunities for a single product
   */
  async analyzeProductSavings(productId: string): Promise<ProductSavingsScenario | null> {
    try {
      // Get product details
      const { data: product } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (!product) {return null}

      // Get current classification
      const { data: currentClassification } = await this.supabase
        .from('classifications')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .single()

      if (!currentClassification) {return null}

      // Calculate baseline landed cost
      const baselineCalculation = await this.calculateLandedCost(product, currentClassification)

      // Get optimization recommendations
      const optimizationAnalysis = await this.optimizationEngine.generateOptimizationAnalysis([productId])
      
      if (optimizationAnalysis.recommendations.length === 0) {
        return null
      }

      // Find best optimization scenario
      const bestRecommendation = optimizationAnalysis.recommendations[0]
      const optimizedCalculation = await this.calculateOptimizedLandedCost(
        product, 
        currentClassification, 
        bestRecommendation
      )

      // Calculate savings breakdown
      const savingsBreakdown = this.calculateSavingsBreakdown(
        baselineCalculation,
        optimizedCalculation,
1000 // Default yearly units
      )

      // Generate implementation requirements
      const implementationRequirements = this.generateImplementationRequirements(bestRecommendation)

      // Assess risks
      const riskAssessment = this.assessRisks(bestRecommendation, product)

      return {
        id: `savings_${productId}_${Date.now()}`,
        name: `Savings Analysis for ${product.title}`,
        description: bestRecommendation.description,
        productId,
        baselineCalculation,
        optimizedCalculation,
        savingsBreakdown,
        implementationRequirements,
        riskAssessment,
        timeToImplement: bestRecommendation.timeToImplement,
        confidence: bestRecommendation.confidenceScore
      }
    } catch (error) {
      console.error(`Error analyzing savings for product ${productId}:`, error)
      return null
    }
  }

  /**
   * Compare multiple scenarios for a set of products
   */
  async compareMultipleScenarios(options: ScenarioComparisonOptions): Promise<MultiScenarioComparison> {
    const scenarios: ScenarioResult[] = []
    const savingsMatrix: SavingsMatrix = {
      byShippingMethod: {},
      byOriginCountry: {},
      byDestinationCountry: {},
      byClassification: {},
      byTradeAgreement: {}
    }

    // Generate baseline scenario
    const baselineScenario = await this.generateBaselineScenario(options.productIds[0])
    scenarios.push(baselineScenario)

    // Generate alternative scenarios based on variations
    if (options.variations.shippingMethods) {
      for (const method of options.variations.shippingMethods) {
        const scenario = await this.generateShippingMethodScenario(options.productIds[0], method)
        scenarios.push(scenario)
        savingsMatrix.byShippingMethod[method] = scenario.potentialSaving
      }
    }

    if (options.variations.originCountries) {
      for (const country of options.variations.originCountries) {
        const scenario = await this.generateOriginCountryScenario(options.productIds[0], country)
        scenarios.push(scenario)
        savingsMatrix.byOriginCountry[country] = scenario.potentialSaving
      }
    }

    if (options.variations.destinationCountries) {
      for (const country of options.variations.destinationCountries) {
        const scenario = await this.generateDestinationCountryScenario(options.productIds[0], country)
        scenarios.push(scenario)
        savingsMatrix.byDestinationCountry[country] = scenario.potentialSaving
      }
    }

    // Find best and worst scenarios
    const sortedScenarios = scenarios.sort((a, b) => b.potentialSaving - a.potentialSaving)
    const bestScenario = sortedScenarios[0]
    const worstScenario = sortedScenarios[sortedScenarios.length - 1]

    // Generate recommendations and risk analysis
    const recommendations = this.generateScenarioRecommendations(scenarios, savingsMatrix)
    const riskAnalysis = this.generateRiskAnalysis(scenarios)

    return {
      baselineScenario,
      alternativeScenarios: scenarios.slice(1),
      bestScenario,
      worstScenario,
      savingsMatrix,
      recommendations,
      riskAnalysis
    }
  }

  /**
   * Calculate landed cost for a product with current classification
   */
  private async calculateLandedCost(product: any, classification: any): Promise<LandedCostBreakdown> {
    const dutyRequest: DutyCalculationRequest = {
      hsCode: classification.classification_code,
      productValue: product.cost || 0,
      quantity: 1,
      weight: product.weight || 1,
      originCountry: 'CN',
      destinationCountry: 'US',
      shippingMethod: 'standard',
      includeInsurance: true,
      isCommercialShipment: true
    }

    const calculation = await this.dutyEngine.calculateDuty(dutyRequest)
    
    if (!calculation.success || !calculation.calculation) {
      throw new Error('Failed to calculate duty')
    }

    const calc = calculation.calculation
    
    return {
      productValue: product.cost || 0,
      dutyAmount: calc.dutyAmount,
      vatAmount: calc.taxAmount,
      shippingCost: calc.shippingCost || 0,
      insuranceCost: calc.insuranceCost || 0,
      fbaFees: product.fba_fee_estimate || 0,
      brokerFees: calc.brokerFees || 0,
      totalLandedCost: calc.totalLandedCost,
      profitMargin: product.profit_margin,
      sellingPrice: product.selling_price
    }
  }

  /**
   * Calculate optimized landed cost based on recommendation
   */
  private async calculateOptimizedLandedCost(
    product: any, 
    currentClassification: any, 
    recommendation: OptimizationRecommendation
  ): Promise<LandedCostBreakdown> {
    const dutyRequest: DutyCalculationRequest = {
      hsCode: recommendation.recommendedHsCode || currentClassification.classification_code,
      productValue: product.cost || 0,
      quantity: 1,
      weight: product.weight || 1,
      originCountry: 'CN',
      destinationCountry: 'US',
      shippingMethod: 'standard',
      includeInsurance: true,
      isCommercialShipment: true
    }

    const calculation = await this.dutyEngine.calculateDuty(dutyRequest)
    
    if (!calculation.success || !calculation.calculation) {
      throw new Error('Failed to calculate optimized duty')
    }

    const calc = calculation.calculation
    
    return {
      productValue: product.cost || 0,
      dutyAmount: calc.dutyAmount,
      vatAmount: calc.taxAmount,
      shippingCost: calc.shippingCost || 0,
      insuranceCost: calc.insuranceCost || 0,
      fbaFees: product.fba_fee_estimate || 0,
      brokerFees: calc.brokerFees || 0,
      totalLandedCost: calc.totalLandedCost,
      profitMargin: product.profit_margin,
      sellingPrice: product.selling_price
    }
  }

  /**
   * Calculate detailed savings breakdown
   */
  private calculateSavingsBreakdown(
    baseline: LandedCostBreakdown,
    optimized: LandedCostBreakdown,
    yearlyUnits: number
  ): SavingsBreakdown {
    const dutyReduction = baseline.dutyAmount - optimized.dutyAmount
    const vatReduction = baseline.vatAmount - optimized.vatAmount
    const shippingReduction = baseline.shippingCost - optimized.shippingCost
    const fbaReduction = baseline.fbaFees - optimized.fbaFees
    
    const totalSavingsPerUnit = baseline.totalLandedCost - optimized.totalLandedCost
    const totalSavingsPercentage = baseline.totalLandedCost > 0 
      ? (totalSavingsPerUnit / baseline.totalLandedCost) * 100 
      : 0
    
    const annualSavings = totalSavingsPerUnit * yearlyUnits
    const roi = totalSavingsPerUnit > 0 ? (annualSavings / totalSavingsPerUnit) * 100 : 0
    
    return {
      dutyReduction,
      vatReduction,
      shippingReduction,
      fbaReduction,
      totalSavingsPerUnit,
      totalSavingsPercentage,
      annualSavings,
      roi,
      paybackPeriod: roi > 0 ? `${Math.ceil(12 / (roi / 100))} months` : 'N/A'
    }
  }

  /**
   * Generate implementation requirements based on recommendation
   */
  private generateImplementationRequirements(recommendation: OptimizationRecommendation): ImplementationRequirement[] {
    const requirements: ImplementationRequirement[] = []

    if (recommendation.type === 'classification') {
      requirements.push({
        type: 'documentation',
        description: 'Update product classification documentation',
        estimatedCost: 500,
        timeRequired: '1-2 weeks',
        complexity: 'low'
      })
    }

    if (recommendation.type === 'origin') {
      requirements.push({
        type: 'supplier_change',
        description: 'Evaluate and potentially change supplier/origin country',
        estimatedCost: 2000,
        timeRequired: '2-3 months',
        complexity: 'high'
      })
    }

    if (recommendation.type === 'trade_agreement') {
      requirements.push({
        type: 'certification',
        description: 'Obtain trade agreement certification',
        estimatedCost: 1000,
        timeRequired: '3-4 weeks',
        complexity: 'medium'
      })
    }

    return requirements
  }

  /**
   * Assess risks for a recommendation
   */
  private assessRisks(recommendation: OptimizationRecommendation, product: any): RiskAssessment {
    let complianceRisk: 'low' | 'medium' | 'high' = 'low'
    let supplierRisk: 'low' | 'medium' | 'high' = 'low'
    let marketRisk: 'low' | 'medium' | 'high' = 'low'

    // Assess compliance risk
    if (recommendation.type === 'classification' && recommendation.confidenceScore < 0.8) {
      complianceRisk = 'medium'
    }
    if (recommendation.type === 'origin') {
      complianceRisk = 'high'
      supplierRisk = 'high'
    }

    // Assess market risk
    if (product.value > 1000) {
      marketRisk = 'medium'
    }

    const overallRisk = Math.max(
      ['low', 'medium', 'high'].indexOf(complianceRisk),
      ['low', 'medium', 'high'].indexOf(supplierRisk),
      ['low', 'medium', 'high'].indexOf(marketRisk)
    )

    const mitigationStrategies = [
      'Regular compliance audits',
      'Diversified supplier base',
      'Market monitoring and analysis'
    ]

    return {
      complianceRisk,
      supplierRisk,
      marketRisk,
      overallRisk: ['low', 'medium', 'high'][overallRisk] as 'low' | 'medium' | 'high',
      mitigationStrategies
    }
  }

  /**
   * Generate summary of savings analysis
   */
  private generateSummary(scenarios: ProductSavingsScenario[]): SavingsAnalysisSummary {
    const highImpactScenarios = scenarios.filter(s => s.savingsBreakdown.totalSavingsPercentage > 10).length
    const quickWins = scenarios.filter(s => 
      s.savingsBreakdown.totalSavingsPercentage > 5 && 
      s.implementationRequirements.every(r => r.complexity === 'low')
    ).length
    const longTermOpportunities = scenarios.filter(s => 
      s.savingsBreakdown.totalSavingsPercentage > 15
    ).length

    const totalImplementationCost = scenarios.reduce((sum, s) => 
      sum + s.implementationRequirements.reduce((reqSum, req) => reqSum + req.estimatedCost, 0), 0
    )

    const totalSavings = scenarios.reduce((sum, s) => sum + s.savingsBreakdown.annualSavings, 0)
    const netSavings = totalSavings - totalImplementationCost

    const priorityOrder = scenarios
      .sort((a, b) => b.savingsBreakdown.roi - a.savingsBreakdown.roi)
      .map(s => s.id)

    return {
      highImpactScenarios,
      quickWins,
      longTermOpportunities,
      totalImplementationCost,
      netSavings,
      priorityOrder
    }
  }

  /**
   * Generate portfolio-level recommendations
   */
  private generatePortfolioRecommendations(scenarios: ProductSavingsScenario[]): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = []

    // Immediate opportunities
    const immediateScenarios = scenarios.filter(s => 
      s.savingsBreakdown.totalSavingsPercentage > 5 && 
      s.implementationRequirements.every(r => r.complexity === 'low')
    )

    if (immediateScenarios.length > 0) {
      recommendations.push({
        id: 'immediate_wins',
        type: 'immediate',
        title: 'Quick Win Optimizations',
        description: `Implement ${immediateScenarios.length} low-complexity optimizations for immediate savings`,
        affectedProducts: immediateScenarios.map(s => s.productId),
        totalSavings: immediateScenarios.reduce((sum, s) => sum + s.savingsBreakdown.annualSavings, 0),
        implementationCost: immediateScenarios.reduce((sum, s) => 
          sum + s.implementationRequirements.reduce((reqSum, req) => reqSum + req.estimatedCost, 0), 0
        ),
        timeframe: '1-2 months',
        priority: 'high'
      })
    }

    // Classification optimizations
    const classificationScenarios = scenarios.filter(s => 
      s.description.toLowerCase().includes('classification')
    )

    if (classificationScenarios.length > 0) {
      recommendations.push({
        id: 'classification_review',
        type: 'short_term',
        title: 'Product Classification Review',
        description: `Review and optimize classifications for ${classificationScenarios.length} products`,
        affectedProducts: classificationScenarios.map(s => s.productId),
        totalSavings: classificationScenarios.reduce((sum, s) => sum + s.savingsBreakdown.annualSavings, 0),
        implementationCost: classificationScenarios.length * 500,
        timeframe: '2-3 months',
        priority: 'medium'
      })
    }

    return recommendations
  }

  // Helper methods for scenario generation
  private async generateBaselineScenario(productId: string): Promise<ScenarioResult> {
    // Implementation for baseline scenario
    return {
      baseDutyAmount: 0,
      alternativeDutyAmount: 0,
      potentialSaving: 0,
      potentialYearlySaving: 0,
      baseBreakdown: {
        dutyPercentage: 0,
        vatPercentage: 0,
        dutyAmount: 0,
        vatAmount: 0,
        totalTaxes: 0
      },
      alternativeBreakdown: {
        dutyPercentage: 0,
        vatPercentage: 0,
        dutyAmount: 0,
        vatAmount: 0,
        totalTaxes: 0
      }
    }
  }

  private async generateShippingMethodScenario(productId: string, method: string): Promise<ScenarioResult> {
    // Implementation for shipping method scenario
    return this.generateBaselineScenario(productId)
  }

  private async generateOriginCountryScenario(productId: string, country: string): Promise<ScenarioResult> {
    // Implementation for origin country scenario
    return this.generateBaselineScenario(productId)
  }

  private async generateDestinationCountryScenario(productId: string, country: string): Promise<ScenarioResult> {
    // Implementation for destination country scenario
    return this.generateBaselineScenario(productId)
  }

  private generateScenarioRecommendations(scenarios: ScenarioResult[], matrix: SavingsMatrix): string[] {
    const recommendations: string[] = []
    
    // Find best shipping method
    const bestShipping = Object.entries(matrix.byShippingMethod)
      .sort(([,a], [,b]) => b - a)[0]
    if (bestShipping && bestShipping[1] > 0) {
      recommendations.push(`Consider ${bestShipping[0]} shipping for ${bestShipping[1].toFixed(2)} savings`)
    }

    // Find best origin country
    const bestOrigin = Object.entries(matrix.byOriginCountry)
      .sort(([,a], [,b]) => b - a)[0]
    if (bestOrigin && bestOrigin[1] > 0) {
      recommendations.push(`Consider sourcing from ${bestOrigin[0]} for ${bestOrigin[1].toFixed(2)} savings`)
    }

    return recommendations
  }

  private generateRiskAnalysis(scenarios: ScenarioResult[]): string[] {
    const risks: string[] = []
    
    if (scenarios.length > 5) {
      risks.push('High number of scenarios may indicate complex optimization requirements')
    }
    
    const highSavingsScenarios = scenarios.filter(s => s.potentialSaving > 1000)
    if (highSavingsScenarios.length > 0) {
      risks.push('High-savings scenarios require careful compliance review')
    }

    return risks
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}