import { createBrowserClient } from '../supabase'
import { OptimizationEngine, OptimizationRecommendation, OptimizationAnalysis } from './optimization-engine'
import { ScenarioEngine, ScenarioEngineOptions, ScenarioResult } from './scenario-engine'
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
  destinationCountry?: string;
  originCountry?: string;
  shippingMethod?: string;
  hsCode?: string;
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
  risk_factors: { 
    factor: string
    severity: 'low' | 'medium' | 'high'
    probability: number
    impact: string
  }[]
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
  timeHorizon: number 
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

type DetailedCalculationResult = {
  dutyPercentage: number;
  vatPercentage: number;
  dutyAmount: number;
  vatAmount: number;
  totalTaxes: number;
  totalLandedCost: number;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  shippingMethod: string;
  productValue: number;
};


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

  async analyzeBatch(
    products: any[],
    configuration?: any
  ): Promise<BatchSavingsAnalysis> {
    const productIds = products.map(product => 
      typeof product === 'string' ? product : product.id || product.product_id
    );
    return this.analyzeBatchSavings(productIds);
  }

  async analyzeBatchSavings(productIds: string[]): Promise<BatchSavingsAnalysis> {
    const scenarios: ProductSavingsScenario[] = []
    let totalCurrentCost = 0
    let totalOptimizedCost = 0

    const concurrencyLimit = 5
    const chunks = this.chunkArray(productIds, concurrencyLimit)

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(productId => this.analyzeProductSavings(productId))
      )
      scenarios.push(...chunkResults.filter(Boolean) as ProductSavingsScenario[])
    }

    scenarios.forEach(scenario => {
      totalCurrentCost += scenario.baselineCalculation.totalLandedCost
      totalOptimizedCost += scenario.optimizedCalculation.totalLandedCost
    })

    const totalSavings = totalCurrentCost - totalOptimizedCost
    const totalSavingsPercentage = totalCurrentCost > 0 ? (totalSavings / totalCurrentCost) * 100 : 0
    const averageROI = scenarios.length > 0 
      ? scenarios.reduce((sum, s) => sum + s.savingsBreakdown.roi, 0) / scenarios.length 
      : 0

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

  async analyzeProductSavings(productId: string): Promise<ProductSavingsScenario | null> {
    try {
      const { data: productData } = await this.supabase
        .from('products')
        .select('id, title, cost, weight, active_classification_id, yearly_units, origin_country, fba_fee_estimate_usd')
        .eq('id', productId)
        .single()

      if (!productData) { return null }
      const product = productData as any; 

      if (!product.active_classification_id) {
        console.warn(`Product ${productId} has no active classification.`);
        return null;
      }
      const { data: classificationData } = await this.supabase
        .from('classifications')
        .select('id, classification_code') 
        .eq('id', product.active_classification_id)
        .single()

      if (!classificationData) { return null }
      const currentClassification = classificationData as any;

      const baselineCalculation = await this.calculateLandedCost(product, currentClassification)
      const optimizationAnalysis = await this.optimizationEngine.generateOptimizationAnalysis([productId])
      
      if (optimizationAnalysis.recommendations.length === 0) {
        return null; 
      }

      const bestRecommendation = optimizationAnalysis.recommendations[0]
      const optimizedCalculation = await this.calculateOptimizedLandedCost(
        product, 
        currentClassification, 
        bestRecommendation
      )

      const savingsBreakdown = this.calculateSavingsBreakdown(
        baselineCalculation,
        optimizedCalculation,
        product.yearly_units || 1000 
      )

      const implementationRequirements = this.generateImplementationRequirements(bestRecommendation)
      const riskAssessment = this.assessRisks(bestRecommendation, product)

      return {
        id: `savings_${productId}_${Date.now()}`,
        name: `Savings Analysis for ${product.title || 'Unknown Product'}`,
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

  async compareMultipleScenarios(options: ScenarioComparisonOptions): Promise<MultiScenarioComparison> {
    const scenarios: ScenarioResult[] = []
    const savingsMatrix: SavingsMatrix = {
      byShippingMethod: {}, byOriginCountry: {}, byDestinationCountry: {},
      byClassification: {}, byTradeAgreement: {}
    }
    
    const primaryProductId = options.productIds[0];
    if (!primaryProductId) throw new Error("Product ID is required for scenario comparison.");

    const { data: productData } = await this.supabase
      .from('products')
      .select('yearly_units, origin_country') 
      .eq('id', primaryProductId)
      .single();
      
    const product = productData as any; 
    if (!product) throw new Error(`Product data for ${primaryProductId} not found.`);
    
    const yearlyUnits = product.yearly_units || 1000;
    const productOriginCountry = product.origin_country || 'CN'; 

    const baselineDetailedCalc = await this.generateScenarioCalculation(primaryProductId, { 
      destinationCountry: 'US', 
      originCountry: productOriginCountry 
    });

    const baselineScenarioForReturn: ScenarioResult = {
      baseDutyAmount: baselineDetailedCalc.dutyAmount,
      alternativeDutyAmount: baselineDetailedCalc.dutyAmount,
      potentialSaving: 0,
      potentialYearlySaving: 0,
      baseBreakdown: {
        dutyPercentage: baselineDetailedCalc.dutyPercentage,
        vatPercentage: baselineDetailedCalc.vatPercentage,
        dutyAmount: baselineDetailedCalc.dutyAmount,
        vatAmount: baselineDetailedCalc.vatAmount,
        totalTaxes: baselineDetailedCalc.totalTaxes,
      },
      alternativeBreakdown: {
        dutyPercentage: baselineDetailedCalc.dutyPercentage,
        vatPercentage: baselineDetailedCalc.vatPercentage,
        dutyAmount: baselineDetailedCalc.dutyAmount,
        vatAmount: baselineDetailedCalc.vatAmount,
        totalTaxes: baselineDetailedCalc.totalTaxes,
      }
    };
    scenarios.push(baselineScenarioForReturn);

    // Use properties from baselineDetailedCalc for variations
    const actualBaselineDestCountry = baselineDetailedCalc.destinationCountry;
    const actualBaselineOriginCountry = baselineDetailedCalc.originCountry; // This is the origin used for the baseline calc

    if (options.variations.shippingMethods) {
      for (const method of options.variations.shippingMethods) {
        const scenario = await this.generateShippingMethodScenario(primaryProductId, method, baselineDetailedCalc, actualBaselineDestCountry, yearlyUnits);
        scenarios.push(scenario);
        savingsMatrix.byShippingMethod[method] = scenario.potentialSaving;
      }
    }

    if (options.variations.originCountries) {
      for (const country of options.variations.originCountries) {
        const scenario = await this.generateOriginCountryScenario(primaryProductId, country, baselineDetailedCalc, actualBaselineDestCountry, yearlyUnits);
        scenarios.push(scenario);
        savingsMatrix.byOriginCountry[country] = scenario.potentialSaving;
      }
    }

    if (options.variations.destinationCountries) {
      for (const country of options.variations.destinationCountries) {
        // For destination country variations, the baselineProductOrigin is the product's inherent origin,
        // not necessarily the one used in baselineDetailedCalc if that was varied.
        const scenario = await this.generateDestinationCountryScenario(primaryProductId, country, productOriginCountry, yearlyUnits);
        scenarios.push(scenario);
        savingsMatrix.byDestinationCountry[country] = scenario.potentialSaving; 
      }
    }
    
    const sortedScenarios = scenarios.filter(s => typeof s.potentialSaving === 'number').sort((a, b) => b.potentialSaving - a.potentialSaving);
    const bestScenario = sortedScenarios[0] || baselineScenarioForReturn;
    const worstScenario = sortedScenarios[sortedScenarios.length - 1] || baselineScenarioForReturn;

    const recommendations = this.generateScenarioRecommendations(scenarios, savingsMatrix);
    const riskAnalysis = this.generateRiskAnalysis(scenarios);

    return {
      baselineScenario: baselineScenarioForReturn,
      alternativeScenarios: scenarios.slice(1),
      bestScenario,
      worstScenario,
      savingsMatrix,
      recommendations,
      riskAnalysis
    };
  }
  
  private async calculateLandedCost(product: any, classification: any): Promise<LandedCostBreakdown> {
    const dutyRequest: DutyCalculationRequest = {
      hsCode: classification.classification_code,
      productValue: product.cost || 0,
      quantity: 1,
      weight: product.weight || 1,
      originCountry: product.origin_country || 'CN', 
      destinationCountry: 'US', 
      shippingMethod: 'standard',
      includeInsurance: true,
      isCommercialShipment: true
    };

    const calculation = await this.dutyEngine.calculateDuty(dutyRequest);
    if (!calculation.success || !calculation.calculation) {
      throw new Error('Failed to calculate duty for baseline');
    }
    const calc = calculation.calculation;
    
    return {
      productValue: product.cost || 0,
      dutyAmount: calc.dutyAmount,
      vatAmount: calc.taxAmount,
      shippingCost: calc.shippingCost || 0,
      insuranceCost: calc.insuranceCost || 0,
      fbaFees: product.fba_fee_estimate_usd || 0,
      brokerFees: calc.brokerFees || 0,
      totalLandedCost: calc.totalLandedCost,
      profitMargin: product.profit_margin, 
      sellingPrice: product.selling_price,
      destinationCountry: dutyRequest.destinationCountry, 
      originCountry: dutyRequest.originCountry,       
      shippingMethod: dutyRequest.shippingMethod,     
      hsCode: dutyRequest.hsCode,                     
    };
  }

  private async calculateOptimizedLandedCost(
    product: any, 
    currentClassification: any, 
    recommendation: OptimizationRecommendation
  ): Promise<LandedCostBreakdown> {
    let originCountryRec = product.origin_country || 'CN';
    if (recommendation.type === 'origin' && recommendation.alternativeOptions?.[0]?.description.includes("Source from")) {
        const parts = recommendation.alternativeOptions[0].description.split(" ");
        originCountryRec = parts[parts.length -1];
    }

    let shippingMethodRec = 'standard';
    if (recommendation.type === 'shipping' && recommendation.description.includes(" to ")) {
        const shippingParts = recommendation.description.split(" to ")[1]?.split(" ");
        if (shippingParts && shippingParts.length > 0) {
            shippingMethodRec = shippingParts[0].toLowerCase();
        }
    }

    const dutyRequest: DutyCalculationRequest = {
      hsCode: recommendation.recommendedHsCode || currentClassification.classification_code,
      productValue: product.cost || 0,
      quantity: 1,
      weight: product.weight || 1,
      originCountry: originCountryRec,
      destinationCountry: 'US', 
      shippingMethod: shippingMethodRec as any,
      includeInsurance: true,
      isCommercialShipment: true
    };

    const calculation = await this.dutyEngine.calculateDuty(dutyRequest);
    if (!calculation.success || !calculation.calculation) {
      throw new Error('Failed to calculate optimized duty');
    }
    const calc = calculation.calculation;
    
    return {
      productValue: product.cost || 0,
      dutyAmount: calc.dutyAmount,
      vatAmount: calc.taxAmount,
      shippingCost: calc.shippingCost || 0,
      insuranceCost: calc.insuranceCost || 0,
      fbaFees: product.fba_fee_estimate_usd || 0,
      brokerFees: calc.brokerFees || 0,
      totalLandedCost: calc.totalLandedCost,
      profitMargin: product.profit_margin,
      sellingPrice: product.selling_price,
      destinationCountry: dutyRequest.destinationCountry, 
      originCountry: dutyRequest.originCountry,       
      shippingMethod: dutyRequest.shippingMethod,     
      hsCode: dutyRequest.hsCode,                     
    };
  }

  private calculateSavingsBreakdown(
    baseline: LandedCostBreakdown,
    optimized: LandedCostBreakdown,
    yearlyUnits: number
  ): SavingsBreakdown {
    const dutyReduction = baseline.dutyAmount - optimized.dutyAmount;
    const vatReduction = baseline.vatAmount - optimized.vatAmount;
    const shippingReduction = baseline.shippingCost - optimized.shippingCost;
    const fbaReduction = baseline.fbaFees - optimized.fbaFees;
    
    const totalSavingsPerUnit = baseline.totalLandedCost - optimized.totalLandedCost;
    const totalSavingsPercentage = baseline.totalLandedCost > 0 
      ? (totalSavingsPerUnit / baseline.totalLandedCost) * 100 
      : 0;
    
    const annualSavings = totalSavingsPerUnit * yearlyUnits;
    const estimatedImplementationCost = 1; 
    const roi = estimatedImplementationCost > 0 ? (annualSavings / estimatedImplementationCost) * 100 : (annualSavings > 0 ? Infinity : 0);
    
    return {
      dutyReduction, vatReduction, shippingReduction, fbaReduction,
      totalSavingsPerUnit, totalSavingsPercentage, annualSavings, roi,
      paybackPeriod: roi > 0 && roi !== Infinity ? `${Math.ceil(12 / (roi / 100))} months` : 'N/A'
    };
  }

  private generateImplementationRequirements(recommendation: OptimizationRecommendation): ImplementationRequirement[] {
    const requirements: ImplementationRequirement[] = [];
    if (recommendation.type === 'classification') {
      requirements.push({
        type: 'documentation',
        description: 'Update product classification documentation and customs filings.',
        estimatedCost: 500, timeRequired: '2-4 weeks', complexity: 'medium'
      });
      requirements.push({
        type: 'legal_review',
        description: 'Legal review of new HS code applicability and compliance.',
        estimatedCost: 1000, timeRequired: '1-2 weeks', complexity: 'medium'
      });
    } else if (recommendation.type === 'origin') {
      requirements.push({
        type: 'supplier_change',
        description: 'Identify, vet, and onboard new supplier in recommended origin country.',
        estimatedCost: 5000, timeRequired: '3-6 months', complexity: 'high'
      });
      requirements.push({
        type: 'certification',
        description: 'Obtain Certificate of Origin and other required trade documents.',
        estimatedCost: 500, timeRequired: '2-4 weeks', complexity: 'medium'
      });
    } else if (recommendation.type === 'shipping') {
       requirements.push({
        type: 'process_change',
        description: `Negotiate rates and update logistics for ${recommendation.description.split(" to ")[1]}.`,
        estimatedCost: 200, timeRequired: '1-3 weeks', complexity: 'low'
      });
    } else if (recommendation.type === 'trade_agreement') {
       requirements.push({
        type: 'documentation',
        description: `Compile documentation for ${recommendation.description.split(" ")[1]} compliance.`, 
        estimatedCost: 700, timeRequired: '2-4 weeks', complexity: 'medium'
      });
    }
    return requirements;
  }

  private assessRisks(recommendation: OptimizationRecommendation, product: any): RiskAssessment {
    let complianceRisk: 'low' | 'medium' | 'high' = 'low';
    let supplierRisk: 'low' | 'medium' | 'high' = 'low';
    let marketRisk: 'low' | 'medium' | 'high' = 'low';
    let operationalRiskLevel: 'low' | 'medium' | 'high' = 'low'; 

    if (recommendation.type === 'classification') {
      complianceRisk = recommendation.confidenceScore < 0.7 ? 'high' : recommendation.confidenceScore < 0.9 ? 'medium' : 'low';
      operationalRiskLevel = 'medium'; 
    } else if (recommendation.type === 'origin') {
      complianceRisk = 'high'; 
      supplierRisk = 'high'; 
      operationalRiskLevel = 'high'; 
    } else if (recommendation.type === 'shipping') {
      operationalRiskLevel = 'medium'; 
    } else if (recommendation.type === 'trade_agreement') {
      complianceRisk = 'medium'; 
    }
    
    const productValue = product?.cost || 0;
    if (productValue > 5000) marketRisk = 'medium';
    if (productValue > 20000) marketRisk = 'high';

    const riskLevels = { low: 1, medium: 2, high: 3 };
    const tempOverallRiskScore = Math.max(riskLevels[complianceRisk], riskLevels[supplierRisk], riskLevels[marketRisk]);
    const overallRisk: 'low' | 'medium' | 'high' = Object.keys(riskLevels).find(key => riskLevels[key as keyof typeof riskLevels] === tempOverallRiskScore) as 'low' | 'medium' | 'high' || 'medium';

    return {
      complianceRisk, supplierRisk, marketRisk, overallRisk, 
      mitigationStrategies: ['Detailed due diligence', 'Phased rollout', 'Contingency planning'],
      risk_factors: [ 
        { factor: "Operational Change Complexity", severity: operationalRiskLevel, probability: 0.5, impact: "Process adjustment delays" }
      ]
    };
  }
  
  private generateSummary(scenarios: ProductSavingsScenario[]): SavingsAnalysisSummary {
    const highImpactScenarios = scenarios.filter(s => s.savingsBreakdown.annualSavings > ((s.baselineCalculation.productValue * (s.productId.length || 1)) * 0.1)).length; 
    const quickWins = scenarios.filter(s => 
      s.savingsBreakdown.roi > 200 && 
      s.implementationRequirements.every(r => r.complexity === 'low') &&
      parseInt((s.timeToImplement.split('-')[1] || "3").replace (/\D/g, '')) <= 3 
    ).length;
    const longTermOpportunities = scenarios.filter(s => 
      s.savingsBreakdown.annualSavings > ((s.baselineCalculation.productValue * (s.productId.length || 1)) * 0.05) && 
      parseInt((s.timeToImplement.split('-')[0] || "6").replace (/\D/g, '')) >= 6 
    ).length;

    const totalImplementationCost = scenarios.reduce((sum, s) => 
      sum + s.implementationRequirements.reduce((reqSum, req) => reqSum + req.estimatedCost, 0), 0
    );
    const totalAnnualSavings = scenarios.reduce((sum, s) => sum + s.savingsBreakdown.annualSavings, 0);
    const netSavings = totalAnnualSavings - totalImplementationCost;

    const priorityOrder = scenarios
      .sort((a, b) => b.savingsBreakdown.roi - a.savingsBreakdown.roi) 
      .map(s => s.id);

    return {
      highImpactScenarios,
      quickWins,
      longTermOpportunities,
      totalImplementationCost,
      netSavings,
      priorityOrder
    };
  }

  private generatePortfolioRecommendations(scenarios: ProductSavingsScenario[]): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = [];

    const quickWinScenarios = scenarios.filter(s => 
      s.savingsBreakdown.roi > 200 &&
      s.implementationRequirements.every(r => r.complexity === 'low') &&
      parseInt((s.timeToImplement.split('-')[1] || "3").replace (/\D/g, '')) <= 3
    );

    if (quickWinScenarios.length > 0) {
      recommendations.push({
        id: 'portfolio_quick_wins',
        type: 'immediate',
        title: 'Implement Quick Wins',
        description: `Focus on ${quickWinScenarios.length} opportunities with high ROI and low complexity.`,
        affectedProducts: quickWinScenarios.map(s => s.productId),
        totalSavings: quickWinScenarios.reduce((sum, s) => sum + s.savingsBreakdown.annualSavings, 0),
        implementationCost: quickWinScenarios.reduce((sum, s) => sum + s.implementationRequirements.reduce((reqSum, req) => reqSum + req.estimatedCost, 0),0),
        timeframe: '1-3 months',
        priority: 'high'
      });
    }
    return recommendations;
  }

  private async generateScenarioCalculation(
    productId: string, 
    variationOptions: Partial<DutyCalculationRequest> = {}
  ): Promise<DetailedCalculationResult> {
    const { data: productData } = await this.supabase
      .from('products')
      .select('cost, weight, active_classification_id, yearly_units, origin_country') 
      .eq('id', productId)
      .single();

    if (!productData) throw new Error(`Product ${productId} not found for scenario generation.`);
    const product = productData as any; 

    if (!product.active_classification_id) {
      throw new Error(`Product ${productId} does not have an active classification.`);
    }

    const { data: classificationData } = await this.supabase
      .from('classifications')
      .select('classification_code')
      .eq('id', product.active_classification_id)
      .single();
    
    const classification = classificationData as any;

    if (!classification || !classification.classification_code) throw new Error(`Active classification not found for product ${productId}.`);

    const baseRequest: DutyCalculationRequest = {
      hsCode: classification.classification_code,
      productValue: product.cost || 0,
      quantity: 1, 
      weight: product.weight || 1,
      originCountry: variationOptions.originCountry || product.origin_country || 'CN', 
      destinationCountry: variationOptions.destinationCountry || 'US', 
      shippingMethod: variationOptions.shippingMethod || 'standard', 
      includeInsurance: true,
      isCommercialShipment: true,
      ...variationOptions 
    };

    const calculationResult = await this.dutyEngine.calculateDuty(baseRequest);
    if (!calculationResult.success || !calculationResult.calculation) {
      throw new Error(`Duty calculation failed for product ${productId} with options ${JSON.stringify(variationOptions)}: ${calculationResult.error}`);
    }
    const calc = calculationResult.calculation; 
    return {
      dutyPercentage: calc.dutyRate,
      vatPercentage: calc.taxRate,
      dutyAmount: calc.dutyAmount,
      vatAmount: calc.taxAmount,
      totalTaxes: calc.dutyAmount + calc.taxAmount,
      totalLandedCost: calc.totalLandedCost,
      hsCode: baseRequest.hsCode, 
      originCountry: baseRequest.originCountry, 
      destinationCountry: baseRequest.destinationCountry, 
      shippingMethod: baseRequest.shippingMethod || 'standard', 
      productValue: baseRequest.productValue, 
    };
  }
  
  private async generateBaselineScenario(productId: string, destinationCountry?: string, productOrigin?: string, yearlyUnitsParam?: number): Promise<ScenarioResult> {
    const baselineCalc = await this.generateScenarioCalculation(productId, { 
      destinationCountry: destinationCountry || 'US',
      originCountry: productOrigin || 'CN' 
    });
    
    const simpleBreakdown = { 
      dutyPercentage: baselineCalc.dutyPercentage,
      vatPercentage: baselineCalc.vatPercentage,
      dutyAmount: baselineCalc.dutyAmount,
      vatAmount: baselineCalc.vatAmount,
      totalTaxes: baselineCalc.totalTaxes,
    };

    return {
      baseDutyAmount: baselineCalc.dutyAmount,
      alternativeDutyAmount: baselineCalc.dutyAmount,
      potentialSaving: 0,
      potentialYearlySaving: 0,
      baseBreakdown: simpleBreakdown,
      alternativeBreakdown: simpleBreakdown 
    };
  }

  private async generateShippingMethodScenario(productId: string, method: string, baselineDetailedCalc: DetailedCalculationResult, destinationCountry: string, yearlyUnits: number): Promise<ScenarioResult> {
    const altCalc = await this.generateScenarioCalculation(productId, { 
      shippingMethod: method as 'air' | 'sea' | 'express' | 'standard', 
      destinationCountry: destinationCountry, 
      originCountry: baselineDetailedCalc.originCountry 
    });
    
    const savingPerUnit = baselineDetailedCalc.totalLandedCost - altCalc.totalLandedCost;
    const timeHorizon = this.options.timeHorizonMonths ?? 12; // Ensure defined
    const units = yearlyUnits ?? 0; // Ensure defined
    
    return {
      baseDutyAmount: baselineDetailedCalc.dutyAmount,
      alternativeDutyAmount: altCalc.dutyAmount,
      potentialSaving: savingPerUnit,
      potentialYearlySaving: savingPerUnit * (timeHorizon / 12 * units),
      baseBreakdown: { 
        dutyPercentage: baselineDetailedCalc.dutyPercentage,
        vatPercentage: baselineDetailedCalc.vatPercentage,
        dutyAmount: baselineDetailedCalc.dutyAmount,
        vatAmount: baselineDetailedCalc.vatAmount,
        totalTaxes: baselineDetailedCalc.totalTaxes,
      },
      alternativeBreakdown: {
        dutyPercentage: altCalc.dutyPercentage,
        vatPercentage: altCalc.vatPercentage,
        dutyAmount: altCalc.dutyAmount,
        vatAmount: altCalc.vatAmount,
        totalTaxes: altCalc.totalTaxes,
      }
    };
  }

  private async generateOriginCountryScenario(productId: string, country: string, baselineDetailedCalc: DetailedCalculationResult, destinationCountry: string, yearlyUnits: number): Promise<ScenarioResult> {
    const altCalc = await this.generateScenarioCalculation(productId, { 
      originCountry: country, 
      destinationCountry: destinationCountry,
      shippingMethod: baselineDetailedCalc.shippingMethod as any 
    });
    const savingPerUnit = baselineDetailedCalc.totalLandedCost - altCalc.totalLandedCost;
    const timeHorizon = this.options.timeHorizonMonths ?? 12; // Ensure defined
    const units = yearlyUnits ?? 0; // Ensure defined

    return {
      baseDutyAmount: baselineDetailedCalc.dutyAmount,
      alternativeDutyAmount: altCalc.dutyAmount,
      potentialSaving: savingPerUnit,
      potentialYearlySaving: savingPerUnit * (timeHorizon / 12 * units),
      baseBreakdown: {
        dutyPercentage: baselineDetailedCalc.dutyPercentage,
        vatPercentage: baselineDetailedCalc.vatPercentage,
        dutyAmount: baselineDetailedCalc.dutyAmount,
        vatAmount: baselineDetailedCalc.vatAmount,
        totalTaxes: baselineDetailedCalc.totalTaxes,
      },
      alternativeBreakdown: {
        dutyPercentage: altCalc.dutyPercentage,
        vatPercentage: altCalc.vatPercentage,
        dutyAmount: altCalc.dutyAmount,
        vatAmount: altCalc.vatAmount,
        totalTaxes: altCalc.totalTaxes,
      }
    };
  }

  private async generateDestinationCountryScenario(productId: string, country: string, baselineProductOrigin: string, yearlyUnits: number): Promise<ScenarioResult> {
    const scenarioCalc = await this.generateScenarioCalculation(productId, { 
      destinationCountry: country, 
      originCountry: baselineProductOrigin 
    });
    const simpleBreakdown = {
      dutyPercentage: scenarioCalc.dutyPercentage,
      vatPercentage: scenarioCalc.vatPercentage,
      dutyAmount: scenarioCalc.dutyAmount,
      vatAmount: scenarioCalc.vatAmount,
      totalTaxes: scenarioCalc.totalTaxes,
    };
    return {
      baseDutyAmount: scenarioCalc.dutyAmount, 
      alternativeDutyAmount: scenarioCalc.dutyAmount,
      potentialSaving: 0, 
      potentialYearlySaving: 0, 
      baseBreakdown: simpleBreakdown,
      alternativeBreakdown: simpleBreakdown
    };
  }

  private generateScenarioRecommendations(scenarios: ScenarioResult[], matrix: SavingsMatrix): string[] {
    const recommendations: string[] = []
    
    const bestShipping = Object.entries(matrix.byShippingMethod)
      .filter(([, saving]) => typeof saving === 'number' && saving > 0)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]
    if (bestShipping) {
      recommendations.push(`Consider ${bestShipping[0]} shipping for ${bestShipping[1].toFixed(2)} savings`)
    }

    const bestOrigin = Object.entries(matrix.byOriginCountry)
      .filter(([, saving]) => typeof saving === 'number' && saving > 0)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]
    if (bestOrigin) {
      recommendations.push(`Consider sourcing from ${bestOrigin[0]} for ${bestOrigin[1].toFixed(2)} savings`)
    }

    return recommendations
  }

  private generateRiskAnalysis(scenarios: ScenarioResult[]): string[] {
    const risks: string[] = []
    
    if (scenarios.length > 5) {
      risks.push('High number of scenarios may indicate complex optimization requirements')
    }
    
    const highSavingsScenarios = scenarios.filter(s => typeof s.potentialSaving === 'number' && s.potentialSaving > 1000)
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
