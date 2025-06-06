import { EnhancedDutyEngine, DutyCalculationRequest, OptimizationOpportunity } from './enhanced-duty-engine'
import { createBrowserClient } from '../supabase'
import { LandedCostCalculator } from './landed-cost-calculator'
import { ScenarioEngine } from './scenario-engine'

export interface OptimizationEngineOptions {
  confidenceThreshold: number
  minPotentialSaving: number
  includeAdvancedOptimizations?: boolean
  maxRecommendations?: number
  prioritizeByROI?: boolean
}

export interface OptimizationRecommendation {
  id: string
  productId?: string
  type: 'classification' | 'origin' | 'shipping' | 'valuation' | 'trade_agreement' | 'timing'
  currentHsCode: string
  currentClassificationId?: string
  recommendedHsCode?: string
  recommendedClassificationId?: string
  currentDutyRate: number
  recommendedDutyRate: number
  potentialSaving: number
  savingPercentage: number
  confidenceScore: number
  description: string
  requirements: string[]
  riskLevel: 'low' | 'medium' | 'high'
  implementationComplexity: 'simple' | 'moderate' | 'complex'
  timeToImplement: string
  roi: number
  feasibility: 'high' | 'medium' | 'low'
  complianceImpact: string
  justification: string
  alternativeOptions?: AlternativeOption[]
}

export interface AlternativeOption {
  description: string
  saving: number
  complexity: 'simple' | 'moderate' | 'complex'
  timeframe: string
  requirements: string[]
}

export interface OptimizationAnalysis {
  totalPotentialSaving: number
  totalSavingPercentage: number
  recommendationCount: number
  highPriorityCount: number
  averageROI: number
  implementationTimeline: string
  riskAssessment: string
  recommendations: OptimizationRecommendation[]
}

export class OptimizationEngine {
  private supabase = createBrowserClient()
  private enhancedDutyEngine: EnhancedDutyEngine
  private options: OptimizationEngineOptions

  constructor(options: Partial<OptimizationEngineOptions> = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold ?? 0.7,
      minPotentialSaving: options.minPotentialSaving ?? 100,
      includeAdvancedOptimizations: options.includeAdvancedOptimizations ?? true,
      maxRecommendations: options.maxRecommendations ?? 10,
      prioritizeByROI: options.prioritizeByROI ?? true
    }
    this.enhancedDutyEngine = new EnhancedDutyEngine({
      useExternalAPIs: true,
      includeOptimization: true,
      includeCompliance: true
    })
  }

  /**
   * Generate comprehensive optimization recommendations for products
   */
  async generateRecommendations(productIds: string[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    for (const productId of productIds) {
      try {
        const productRecommendations = await this.generateProductRecommendations(productId)
        recommendations.push(...productRecommendations)
      } catch (error) {
        console.error(`Error generating recommendations for product ${productId}:`, error)
      }
    }

    // Sort and limit recommendations
    const sortedRecommendations = this.options.prioritizeByROI
      ? recommendations.sort((a, b) => b.roi - a.roi)
      : recommendations.sort((a, b) => b.potentialSaving - a.potentialSaving)

    return sortedRecommendations.slice(0, this.options.maxRecommendations)
  }

  /**
   * Generate optimization analysis for a set of products
   */
  async generateOptimizationAnalysis(productIds: string[]): Promise<OptimizationAnalysis> {
    const recommendations = await this.generateRecommendations(productIds)
    
    const totalPotentialSaving = recommendations.reduce((sum, rec) => sum + rec.potentialSaving, 0)
    const totalCurrentCost = recommendations.reduce((sum, rec) => 
      sum + (rec.potentialSaving / (rec.savingPercentage / 100)), 0)
    const totalSavingPercentage = totalCurrentCost > 0 ? (totalPotentialSaving / totalCurrentCost) * 100 : 0
    
    const highPriorityCount = recommendations.filter(rec => 
      rec.riskLevel === 'low' && rec.feasibility === 'high' && rec.roi > 200
    ).length
    
    const averageROI = recommendations.length > 0 
      ? recommendations.reduce((sum, rec) => sum + rec.roi, 0) / recommendations.length 
      : 0

    return {
      totalPotentialSaving,
      totalSavingPercentage,
      recommendationCount: recommendations.length,
      highPriorityCount,
      averageROI,
      implementationTimeline: this.calculateImplementationTimeline(recommendations),
      riskAssessment: this.assessOverallRisk(recommendations),
      recommendations
    }
  }

  private async generateProductRecommendations(productId: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Get product details
    const { data: product } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (!product) {return recommendations}

    // Get current classification
    const { data: currentClassification } = await this.supabase
      .from('classifications')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single()

    if (!currentClassification) {return recommendations}

    // Create duty calculation request
    const dutyRequest: DutyCalculationRequest = {
      hsCode: currentClassification.classification_code,
      productValue: product.cost || 0,
      quantity: 1,
      weight: product.weight || 1,
      originCountry: 'CN', // Default origin country
      destinationCountry: 'US', // Default destination country
      shippingMethod: 'standard', // Default shipping method
      includeInsurance: true,
      isCommercialShipment: true
    }

    // Get current duty calculation
    const currentCalculation = await this.enhancedDutyEngine.calculateDuty(dutyRequest)
    
    if (!currentCalculation.success || !currentCalculation.calculation) {
      return recommendations
    }

    // Generate classification optimization recommendations
    const classificationRecs = await this.generateClassificationRecommendations(
      product, currentClassification, currentCalculation.calculation
    )
    recommendations.push(...classificationRecs)

    // Generate origin optimization recommendations
    if (this.options.includeAdvancedOptimizations) {
      const originRecs = await this.generateOriginRecommendations(
        product, dutyRequest, currentCalculation.calculation
      )
      recommendations.push(...originRecs)

      // Generate shipping optimization recommendations
      const shippingRecs = await this.generateShippingRecommendations(
        product, dutyRequest, currentCalculation.calculation
      )
      recommendations.push(...shippingRecs)

      // Generate trade agreement recommendations
      const tradeAgreementRecs = await this.generateTradeAgreementRecommendations(
        product, dutyRequest, currentCalculation.calculation
      )
      recommendations.push(...tradeAgreementRecs)
    }

    // Filter by thresholds
    return recommendations.filter(rec => 
      rec.confidenceScore >= this.options.confidenceThreshold &&
      rec.potentialSaving >= this.options.minPotentialSaving
    )
  }

  private async generateClassificationRecommendations(
    product: any,
    currentClassification: any,
    currentCalculation: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Get current duty rate
    const { data: currentDutyRate } = await this.supabase
      .from('duty_rates')
      .select('duty_percentage')
      .eq('classification_id', currentClassification.id)
      .single()

    if (!currentDutyRate) {return recommendations}

    // Find alternative classifications with lower duty rates
    const { data: alternatives } = await this.supabase
      .from('classifications')
      .select(`
        *,
        duty_rates!inner(duty_percentage)
      `)
      .eq('workspace_id', product.workspace_id)
      .neq('id', currentClassification.id)
      .lt('duty_rates.duty_percentage', currentDutyRate.duty_percentage)
      .order('duty_rates.duty_percentage', { ascending: true })
      .limit(5)

    for (const alternative of alternatives || []) {
      const alternativeDutyRate = alternative.duty_rates?.[0]?.duty_percentage || 0
      const potentialSaving = (currentDutyRate.duty_percentage - alternativeDutyRate) * product.value / 100
      const savingPercentage = ((currentDutyRate.duty_percentage - alternativeDutyRate) / currentDutyRate.duty_percentage) * 100
      const confidenceScore = this.calculateClassificationConfidenceScore(
        product, 
        currentClassification, 
        alternative, 
        currentDutyRate.duty_percentage, 
        alternativeDutyRate
      )
      const roi = this.calculateROI(potentialSaving, 5000) // Estimated implementation cost

      if (potentialSaving > 0) {
        recommendations.push({
          id: `class-${product.id}-${alternative.id}`,
          productId: product.id,
          type: 'classification',
          currentHsCode: currentClassification.classification_code,
          currentClassificationId: currentClassification.id,
          recommendedHsCode: alternative.classification_code,
          recommendedClassificationId: alternative.id,
          currentDutyRate: currentDutyRate.duty_percentage,
          recommendedDutyRate: alternativeDutyRate,
          potentialSaving,
          savingPercentage,
          confidenceScore,
          description: `Reclassify from ${currentClassification.classification_code} to ${alternative.classification_code} to reduce duty rate from ${currentDutyRate.duty_percentage}% to ${alternativeDutyRate}%`,
          requirements: [
            'Product analysis and documentation',
            'Customs ruling request',
            'Legal review of classification change'
          ],
          riskLevel: this.assessClassificationRisk(currentClassification, alternative),
          implementationComplexity: 'moderate',
          timeToImplement: '3-6 months',
          roi,
          feasibility: confidenceScore > 0.8 ? 'high' : confidenceScore > 0.6 ? 'medium' : 'low',
          complianceImpact: 'Requires customs ruling and documentation updates',
          justification: `Classification change from ${currentClassification.classification_code} to ${alternative.classification_code} reduces duty rate by ${(currentDutyRate.duty_percentage - alternativeDutyRate).toFixed(2)}% with ${(confidenceScore * 100).toFixed(0)}% confidence based on product analysis`,
          alternativeOptions: [
            {
              description: 'Request binding ruling for classification certainty',
              saving: potentialSaving * 0.9,
              complexity: 'complex',
              timeframe: '6-12 months',
              requirements: ['Legal counsel', 'Detailed product analysis', 'Customs ruling fee']
            }
          ]
        })
      }
    }

    return recommendations
  }

  private async generateOriginRecommendations(
    product: any,
    dutyRequest: DutyCalculationRequest,
    currentCalculation: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Check FTA partner countries
    const ftaCountries = this.getFTAPartners(dutyRequest.destinationCountry)
    
    for (const ftaCountry of ftaCountries) {
      const alternativeRequest = { ...dutyRequest, originCountry: ftaCountry }
      const alternativeCalculation = await this.enhancedDutyEngine.calculateDuty(alternativeRequest)
      
      if (alternativeCalculation.success && alternativeCalculation.calculation) {
        const potentialSaving = currentCalculation.dutyAmount - alternativeCalculation.calculation.dutyAmount
        
        if (potentialSaving > 0) {
          const savingPercentage = (potentialSaving / currentCalculation.dutyAmount) * 100
          const roi = this.calculateROI(potentialSaving, 50000) // Higher implementation cost for origin change
          
          recommendations.push({
            id: `origin-${product.id}-${ftaCountry}`,
            type: 'origin',
            currentHsCode: dutyRequest.hsCode,
            currentDutyRate: currentCalculation.dutyRate,
            recommendedDutyRate: alternativeCalculation.calculation.dutyRate,
            potentialSaving,
            savingPercentage,
            confidenceScore: 0.7,
            description: `Source from ${ftaCountry} to benefit from preferential duty rates under trade agreement`,
            requirements: [
              'Supplier identification and qualification',
              'Supply chain restructuring',
              'Origin documentation and certification',
              'Quality assurance processes'
            ],
            riskLevel: 'medium',
            implementationComplexity: 'complex',
            timeToImplement: '6-18 months',
            roi,
            feasibility: 'medium',
            complianceImpact: 'Requires origin certification and supply chain documentation',
            justification: `Sourcing from ${ftaCountry} leverages trade agreement benefits to reduce duty rate from ${currentCalculation.dutyRate}% to ${alternativeCalculation.calculation.dutyRate}%, saving ${savingPercentage.toFixed(1)}% on total costs`
          })
        }
      }
    }

    return recommendations
  }

  private async generateShippingRecommendations(
    product: any,
    dutyRequest: DutyCalculationRequest,
    currentCalculation: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Test different shipping methods
    const shippingMethods: Array<'air' | 'sea' | 'express' | 'standard'> = ['air', 'sea', 'express', 'standard']
    
    for (const method of shippingMethods) {
      if (method === dutyRequest.shippingMethod) {continue}
      
      const alternativeRequest = { ...dutyRequest, shippingMethod: method }
      const alternativeCalculation = await this.enhancedDutyEngine.calculateDuty(alternativeRequest)
      
      if (alternativeCalculation.success && alternativeCalculation.calculation) {
        const potentialSaving = currentCalculation.totalLandedCost - alternativeCalculation.calculation.totalLandedCost
        
        if (potentialSaving > 0) {
          const savingPercentage = (potentialSaving / currentCalculation.totalLandedCost) * 100
          const roi = this.calculateROI(potentialSaving, 1000) // Low implementation cost for shipping change
          
          recommendations.push({
            id: `shipping-${product.id}-${method}`,
            type: 'shipping',
            currentHsCode: dutyRequest.hsCode,
            currentDutyRate: currentCalculation.dutyRate,
            recommendedDutyRate: alternativeCalculation.calculation.dutyRate,
            potentialSaving,
            savingPercentage,
            confidenceScore: 0.9,
            description: `Switch from ${dutyRequest.shippingMethod} to ${method} shipping to reduce total landed cost`,
            requirements: [
              'Shipping provider evaluation',
              'Transit time analysis',
              'Insurance coverage review'
            ],
            riskLevel: 'low',
            implementationComplexity: 'simple',
            timeToImplement: '1-2 months',
            roi,
            feasibility: 'high',
            complianceImpact: 'Minimal - only affects shipping documentation',
            justification: `Switching from ${dutyRequest.shippingMethod} to ${method} shipping reduces total landed cost by ${savingPercentage.toFixed(1)}% with minimal implementation complexity and high feasibility`
          })
        }
      }
    }

    return recommendations
  }

  private async generateTradeAgreementRecommendations(
    product: any,
    dutyRequest: DutyCalculationRequest,
    currentCalculation: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // Check if product qualifies for trade agreement benefits
    const tradeAgreements = this.getApplicableTradeAgreements(dutyRequest.originCountry, dutyRequest.destinationCountry)
    
    for (const agreement of tradeAgreements) {
      if (currentCalculation.dutyRate > 0) {
        const potentialSaving = currentCalculation.dutyAmount * 0.5 // Assume 50% reduction
        const savingPercentage = 50
        const roi = this.calculateROI(potentialSaving, 10000) // Moderate implementation cost
        
        recommendations.push({
          id: `trade-${product.id}-${agreement.name}`,
          type: 'trade_agreement',
          currentHsCode: dutyRequest.hsCode,
          currentDutyRate: currentCalculation.dutyRate,
          recommendedDutyRate: currentCalculation.dutyRate * 0.5,
          potentialSaving,
          savingPercentage,
          confidenceScore: 0.8,
          description: `Utilize ${agreement.name} preferential rates to reduce duty burden`,
          requirements: [
            'Origin certification',
            'Trade agreement documentation',
            'Compliance with rules of origin',
            'Customs declaration updates'
          ],
          riskLevel: 'low',
          implementationComplexity: 'moderate',
          timeToImplement: '2-4 months',
          roi,
          feasibility: 'high',
          complianceImpact: 'Requires additional documentation and origin certification',
          justification: `${agreement.name} provides preferential duty rates that can reduce costs by approximately ${savingPercentage}% with proper origin certification and compliance documentation`
        })
      }
    }

    return recommendations
  }

  private calculateClassificationConfidenceScore(
    product: any,
    current: any,
    alternative: any,
    currentDutyRate?: number,
    alternativeDutyRate?: number
  ): number {
    let score = 0.5

    // Boost confidence if products are in similar categories
    if (current.classification_code?.substring(0, 4) === alternative.classification_code?.substring(0, 4)) {
      score += 0.2
    }

    // Boost confidence if alternative has been used successfully before
    if (alternative.usage_count > 10) {
      score += 0.1
    }

    // Reduce confidence for large duty rate differences
    if (currentDutyRate !== undefined && alternativeDutyRate !== undefined) {
      const rateDifference = Math.abs(currentDutyRate - alternativeDutyRate)
      if (rateDifference > 20) {
        score -= 0.2
      }
    }

    // Boost confidence if product descriptions are similar
    if (product.description && alternative.description) {
      const similarity = this.calculateTextSimilarity(product.description, alternative.description)
      score += similarity * 0.2
    }

    return Math.max(0, Math.min(1, score))
  }

  private calculateROI(saving: number, implementationCost: number): number {
    if (implementationCost === 0) {return Infinity}
    return (saving / implementationCost) * 100
  }

  private assessClassificationRisk(
    current: any, 
    alternative: any, 
    currentDutyRate?: number, 
    alternativeDutyRate?: number
  ): 'low' | 'medium' | 'high' {
    const categoryDifference = current.classification_code?.substring(0, 2) !== alternative.classification_code?.substring(0, 2)
    
    if (categoryDifference) {return 'high'}
    
    if (currentDutyRate !== undefined && alternativeDutyRate !== undefined) {
      const rateDifference = Math.abs(currentDutyRate - alternativeDutyRate)
      if (rateDifference > 15) {return 'high'}
      if (rateDifference > 5) {return 'medium'}
    }
    
    return 'low'
  }

  private getFTAPartners(destinationCountry: string): string[] {
    const ftaMap: Record<string, string[]> = {
      'US': ['CA', 'MX', 'AU', 'SG', 'CL', 'PE', 'CO'],
      'CA': ['US', 'MX', 'EU', 'JP', 'KR'],
      'EU': ['CA', 'JP', 'KR', 'SG', 'VN'],
      'AU': ['US', 'JP', 'KR', 'SG', 'TH', 'NZ']
    }
    
    return ftaMap[destinationCountry] || []
  }

  private getApplicableTradeAgreements(originCountry: string, destinationCountry: string) {
    const agreements = [
      { name: 'USMCA', countries: ['US', 'CA', 'MX'] },
      { name: 'CPTPP', countries: ['AU', 'CA', 'JP', 'NZ', 'SG', 'VN'] },
      { name: 'EU-Japan EPA', countries: ['EU', 'JP'] },
      { name: 'ASEAN', countries: ['SG', 'TH', 'VN', 'MY', 'ID', 'PH'] }
    ]
    
    return agreements.filter(agreement => 
      agreement.countries.includes(originCountry) && 
      agreement.countries.includes(destinationCountry)
    )
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple text similarity calculation
    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)
    const intersection = words1.filter(word => words2.includes(word))
    const union = Array.from(new Set([...words1, ...words2]))
    
    return intersection.length / union.length
  }

  private calculateImplementationTimeline(recommendations: OptimizationRecommendation[]): string {
    const complexities = recommendations.map(rec => rec.implementationComplexity)
    const hasComplex = complexities.includes('complex')
    const hasModerate = complexities.includes('moderate')
    
    if (hasComplex) {return '6-18 months'}
    if (hasModerate) {return '3-6 months'}
    return '1-3 months'
  }

  private assessOverallRisk(recommendations: OptimizationRecommendation[]): string {
    const riskLevels = recommendations.map(rec => rec.riskLevel)
    const highRiskCount = riskLevels.filter(level => level === 'high').length
    const mediumRiskCount = riskLevels.filter(level => level === 'medium').length
    
    const totalCount = recommendations.length
    const highRiskPercentage = (highRiskCount / totalCount) * 100
    const mediumRiskPercentage = (mediumRiskCount / totalCount) * 100
    
    if (highRiskPercentage > 30) {return 'High risk - requires careful evaluation and legal review'}
    if (mediumRiskPercentage > 50) {return 'Medium risk - recommend phased implementation'}
    return 'Low risk - can proceed with confidence'
  }
  
  /**
   * Find alternative classifications with lower duty rates
   * @param currentClassification - Current classification
   * @param productId - Product ID
   * @param supabase - Supabase client
   * @returns List of alternative classifications with potential savings
   */
  private async findAlternativeClassifications(
    currentClassification: { id: string, hs6: string, hs8?: string },
    productId: string,
    supabase: any
  ): Promise<Array<{
    classificationId: string,
    hsCode: string,
    confidenceScore: number,
    potentialSaving: number,
    justification: string
  }>> {
    // Get all classifications for this product
    const { data: classifications, error: classError } = await supabase
      .from('classifications')
      .select('id, hs6, hs8, confidence_score, source')
      .eq('product_id', productId)
      .neq('id', currentClassification.id) // Exclude current classification
      .order('confidence_score', { ascending: false });
      
    if (classError || !classifications || classifications.length === 0) {
      return [];
    }
    
    const result = [];
    
    // Get product details for savings calculation
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('yearly_units')
      .eq('id', productId)
      .single();
      
    const yearlyUnits = product?.yearly_units || 1;
    
    // Process each alternative classification
    for (const alt of classifications) {
      try {
        // Create a scenario engine to compare classifications
        const scenarioEngine = new ScenarioEngine();
        
        // Compare with a standard product value for consistency
        const comparison = await scenarioEngine.compareClassifications({
          baseClassificationId: currentClassification.id,
          alternativeClassificationId: alt.id,
          destinationCountry: 'US', // Default to US for comparison
          productValue: 100, // Standard value for comparison
          yearlyUnits
        }, supabase);
        
        // If alternative has lower duty, add to results
        if (comparison.potentialSaving > 0) {
          result.push({
            classificationId: alt.id,
            hsCode: alt.hs8 || alt.hs6,
            confidenceScore: alt.confidence_score || 0,
            potentialSaving: comparison.potentialYearlySaving,
            justification: this.generateJustification(
              currentClassification,
              alt,
              comparison
            )
          });
        }
      } catch (error) {
        console.error(`Error comparing classification ${alt.id}:`, error);
        // Continue with next classification
      }
    }
    
    // Sort by potential saving (highest first)
    return result.sort((a, b) => b.potentialSaving - a.potentialSaving);
  }
  
  /**
   * Generate justification text for a recommendation
   */
  private generateJustification(
    current: { hs6: string, hs8?: string },
    alternative: { hs6: string, hs8?: string, source: string },
    comparison: any
  ): string {
    const currentHs = current.hs8 || current.hs6;
    const alternativeHs = alternative.hs8 || alternative.hs6;
    
    return `Reclassifying from ${currentHs} to ${alternativeHs} could reduce duty rate from ${comparison.baseBreakdown.dutyPercentage}% to ${comparison.alternativeBreakdown.dutyPercentage}%, saving approximately $${comparison.potentialYearlySaving.toFixed(2)} annually based on your current volume. This alternative classification was identified via ${alternative.source}.`;
  }
  
  /**
   * Store recommendations in the database
   * @param recommendations - List of optimization recommendations
   * @param workspaceId - Workspace ID
   * @param supabase - Supabase client
   * @returns Number of recommendations stored
   */
  async storeRecommendations(
    recommendations: OptimizationRecommendation[],
    workspaceId: string,
    supabase: any
  ): Promise<number> {
    if (recommendations.length === 0) {
      return 0;
    }
    
    // Prepare data for insertion
    const data = recommendations.map(rec => ({
      workspace_id: workspaceId,
      name: `Optimization for Product ${rec.productId}`,
      description: rec.justification,
      parameters: {
        product_id: rec.productId,
        current_classification_id: rec.currentClassificationId,
        recommended_classification_id: rec.recommendedClassificationId,
        confidence_score: rec.confidenceScore
      },
      potential_savings: rec.potentialSaving,
      status: 'pending',
      total_products: 1
    }));
    
    // Insert recommendations
    const { data: inserted, error } = await supabase
      .from('duty_scenarios')
      .insert(data)
      .select('id');
      
    if (error) {
      console.error('Failed to store recommendations:', error);
      throw new Error(`Failed to store recommendations: ${error.message}`);
    }
    
    return inserted.length;
  }
}
