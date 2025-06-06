import { createBrowserClient } from '../supabase'
import { UsitcClient } from '../external/usitc-client'
import { TaricClient } from '../external/taric-client'
import TradeComplianceChecker from '../compliance/trade-compliance'

export interface DutyCalculationRequest {
  hsCode: string
  productValue: number
  quantity?: number
  weight?: number
  originCountry: string
  destinationCountry: string
  shippingMethod?: 'air' | 'sea' | 'express' | 'standard'
  currency?: string
  includeInsurance?: boolean
  insuranceValue?: number
  customsValue?: number
  preferentialTreatment?: boolean
  tradeAgreement?: string
  productCategory?: string
  isCommercialShipment?: boolean
}

export interface DutyCalculationResult {
  success: boolean
  calculation?: EnhancedDutyCalculation
  error?: string
  warnings?: string[]
  recommendations?: string[]
}

export interface EnhancedDutyCalculation {
  // Basic calculation components
  dutyRate: number
  dutyAmount: number
  taxRate: number
  taxAmount: number
  
  // Enhanced components
  additionalDuties: AdditionalDuty[]
  governmentFees: GovernmentFee[]
  shippingCost: number
  insuranceCost: number
  brokerFees: number
  otherFees: number
  
  // Totals and analysis
  totalLandedCost: number
  effectiveDutyRate: number
  confidenceScore: number
  
  // Breakdown and metadata
  breakdown: DutyBreakdown
  dataSource: string
  calculationDate: Date
  validUntil?: Date
  
  // Compliance and optimization
  complianceStatus: 'compliant' | 'warning' | 'non-compliant'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  optimizationOpportunities: OptimizationOpportunity[]
}

export interface AdditionalDuty {
  type: 'antidumping' | 'countervailing' | 'safeguard' | 'retaliatory' | 'special'
  rate: number
  amount: number
  description: string
  authority: string
  effectiveDate?: Date
  expiryDate?: Date
}

export interface GovernmentFee {
  type: 'MPF' | 'HMF' | 'customs_processing' | 'inspection' | 'documentation'
  amount: number
  description: string
  calculation: string
  mandatory: boolean
}

export interface DutyBreakdown {
  productValue: number
  quantity: number
  dutyableValue: number
  taxableValue: number
  
  dutyCalculation: {
    baseRate: number
    additionalRates: number[]
    totalRate: number
    amount: number
    basis: string
  }
  
  taxCalculation: {
    rate: number
    amount: number
    basis: string
    type: 'VAT' | 'GST' | 'sales_tax' | 'none'
  }
  
  fees: {
    shipping: number
    insurance: number
    broker: number
    government: number
    other: number
  }
}

export interface OptimizationOpportunity {
  type: 'classification' | 'origin' | 'shipping' | 'valuation' | 'trade_agreement'
  description: string
  potentialSaving: number
  savingPercentage: number
  feasibility: 'high' | 'medium' | 'low'
  requirements: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

export interface DutyEngineOptions {
  useExternalAPIs?: boolean
  cacheResults?: boolean
  includeOptimization?: boolean
  includeCompliance?: boolean
  confidenceThreshold?: number
}

// Enhanced shipping cost matrix with more granular pricing
const ENHANCED_SHIPPING_COSTS = {
  air: {
    light: { base: 15, perKg: 8 },    // < 1kg
    medium: { base: 25, perKg: 6 },   // 1-5kg
    heavy: { base: 45, perKg: 4 },    // 5-20kg
    bulk: { base: 85, perKg: 3 }      // > 20kg
  },
  sea: {
    light: { base: 8, perKg: 2 },
    medium: { base: 12, perKg: 1.5 },
    heavy: { base: 20, perKg: 1 },
    bulk: { base: 35, perKg: 0.8 }
  },
  express: {
    light: { base: 25, perKg: 12 },
    medium: { base: 45, perKg: 10 },
    heavy: { base: 85, perKg: 8 },
    bulk: { base: 150, perKg: 6 }
  },
  standard: {
    light: { base: 12, perKg: 5 },
    medium: { base: 18, perKg: 4 },
    heavy: { base: 30, perKg: 3 },
    bulk: { base: 55, perKg: 2.5 }
  }
}

// Enhanced tax rates with more countries and regions
const ENHANCED_TAX_RATES: Record<string, { rate: number; type: string }> = {
  // North America
  'US': { rate: 0, type: 'none' },        // No federal VAT, state sales tax varies
  'CA': { rate: 13, type: 'GST' },        // HST average
  'MX': { rate: 16, type: 'VAT' },
  
  // Europe
  'GB': { rate: 20, type: 'VAT' },
  'DE': { rate: 19, type: 'VAT' },
  'FR': { rate: 20, type: 'VAT' },
  'IT': { rate: 22, type: 'VAT' },
  'ES': { rate: 21, type: 'VAT' },
  'NL': { rate: 21, type: 'VAT' },
  'BE': { rate: 21, type: 'VAT' },
  'SE': { rate: 25, type: 'VAT' },
  'DK': { rate: 25, type: 'VAT' },
  'NO': { rate: 25, type: 'VAT' },
  'CH': { rate: 7.7, type: 'VAT' },
  
  // Asia Pacific
  'AU': { rate: 10, type: 'GST' },
  'NZ': { rate: 15, type: 'GST' },
  'JP': { rate: 10, type: 'VAT' },
  'KR': { rate: 10, type: 'VAT' },
  'SG': { rate: 7, type: 'GST' },
  'HK': { rate: 0, type: 'none' },
  'CN': { rate: 13, type: 'VAT' },
  'IN': { rate: 18, type: 'GST' },
  
  // Default
  'default': { rate: 0, type: 'none' }
}

export class EnhancedDutyEngine {
  private usitcClient: UsitcClient
  private taricClient: TaricClient
  private complianceChecker: TradeComplianceChecker
  private supabase = createBrowserClient()
  private options: DutyEngineOptions
  private cache: Map<string, EnhancedDutyCalculation> = new Map()

  constructor(options: DutyEngineOptions = {}) {
    this.options = {
      useExternalAPIs: options.useExternalAPIs ?? true,
      cacheResults: options.cacheResults ?? true,
      includeOptimization: options.includeOptimization ?? true,
      includeCompliance: options.includeCompliance ?? true,
      confidenceThreshold: options.confidenceThreshold ?? 0.7
    }
    
    this.usitcClient = new UsitcClient()
    this.taricClient = new TaricClient()
    this.complianceChecker = new TradeComplianceChecker()
  }

  /**
   * Calculate comprehensive duty and landed cost with enhanced features
   */
  async calculateDuty(request: DutyCalculationRequest): Promise<DutyCalculationResult> {
    try {
      // Validate request
      const validation = this.validateRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          warnings: validation.warnings
        }
      }

      // Check cache if enabled
      const cacheKey = this.generateCacheKey(request)
      if (this.options.cacheResults && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!
        if (this.isCacheValid(cached)) {
          return { success: true, calculation: cached }
        }
      }

      // Get duty rates from multiple sources
      const dutyRates = await this.getDutyRates(request)
      
      // Calculate base duty and tax
      const baseDutyCalculation = this.calculateBaseDuty(request, dutyRates)
      
      // Calculate additional duties
      const additionalDuties = await this.calculateAdditionalDuties(request)
      
      // Calculate government fees
      const governmentFees = this.calculateGovernmentFees(request)
      
      // Calculate shipping and other costs
      const shippingCost = this.calculateShippingCost(request)
      const insuranceCost = this.calculateInsuranceCost(request)
      const brokerFees = this.calculateBrokerFees(request)
      
      // Perform compliance check if enabled
      let complianceStatus: 'compliant' | 'warning' | 'non-compliant' = 'compliant'
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
      
      if (this.options.includeCompliance) {
        const complianceResult = await this.complianceChecker.checkCompliance({
          hsCode: request.hsCode,
          originCountry: request.originCountry,
          destinationCountry: request.destinationCountry,
          productValue: request.productValue,
          productWeight: request.weight
        })
        
        complianceStatus = complianceResult.compliant ? 'compliant' : 'warning'
        riskLevel = complianceResult.riskLevel
      }
      
      // Calculate optimization opportunities if enabled
      let optimizationOpportunities: OptimizationOpportunity[] = []
      if (this.options.includeOptimization) {
        optimizationOpportunities = await this.findOptimizationOpportunities(request, baseDutyCalculation)
      }
      
      // Assemble final calculation
      const calculation = this.assembleCalculation(
        request,
        baseDutyCalculation,
        additionalDuties,
        governmentFees,
        shippingCost,
        insuranceCost,
        brokerFees,
        complianceStatus,
        riskLevel,
        optimizationOpportunities
      )
      
      // Cache result if enabled
      if (this.options.cacheResults) {
        this.cache.set(cacheKey, calculation)
      }
      
      return {
        success: true,
        calculation,
        warnings: validation.warnings
      }
      
    } catch (error) {
      console.error('Error in enhanced duty calculation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private validateRequest(request: DutyCalculationRequest): { valid: boolean; error?: string; warnings?: string[] } {
    const warnings: string[] = []
    
    // Required fields
    if (!request.hsCode || request.hsCode.length < 6) {
      return { valid: false, error: 'HS code must be at least 6 digits' }
    }
    
    if (!request.productValue || request.productValue <= 0) {
      return { valid: false, error: 'Product value must be greater than 0' }
    }
    
    if (!request.originCountry || !request.destinationCountry) {
      return { valid: false, error: 'Origin and destination countries are required' }
    }
    
    // Warnings for optional but recommended fields
    if (!request.weight) {
      warnings.push('Weight not provided - shipping cost estimation may be inaccurate')
    }
    
    if (!request.quantity) {
      warnings.push('Quantity not provided - assuming quantity of 1')
    }
    
    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined }
  }

  private async getDutyRates(request: DutyCalculationRequest) {
    const rates = { base: 0, confidence: 0.5, source: 'internal' }
    
    if (!this.options.useExternalAPIs) {
      // Use internal rates only
      return this.getInternalDutyRates(request)
    }
    
    try {
      // Try external APIs first for better accuracy
      if (request.destinationCountry === 'US') {
        const usitcResult = await this.usitcClient.getDutyRates(request.hsCode, request.originCountry)
        if (usitcResult.success && usitcResult.rates?.[0]) {
          return {
            base: usitcResult.rates[0].dutyPercentage,
            confidence: 0.9,
            source: 'USITC'
          }
        }
      } else if (this.isEUCountry(request.destinationCountry)) {
        const taricResult = await this.taricClient.getDutyRates(
          request.hsCode,
          request.destinationCountry,
          request.originCountry
        )
        if (taricResult.success && taricResult.rates?.[0]) {
          return {
            base: taricResult.rates[0].dutyPercentage,
            confidence: 0.9,
            source: 'TARIC'
          }
        }
      }
    } catch (error) {
      console.warn('External API failed, falling back to internal rates:', error)
    }
    
    // Fallback to internal rates
    return this.getInternalDutyRates(request)
  }

  private getInternalDutyRates(request: DutyCalculationRequest) {
    // Use the existing DUTY_RATES from landed-cost-calculator
    const hsPrefix = request.hsCode.substring(0, 4)
    const chapter = request.hsCode.substring(0, 2)
    
    // Try to get rate by 4-digit HS code first, then 2-digit chapter
    let rate = 0
    const confidence = 0.6
    
    // This would integrate with the existing DUTY_RATES constant
    // For now, using simplified logic
    const rateMap: Record<string, number> = {
      '01': 0, '02': 0, '03': 0, '04': 6.8,
      '84': 2.5, '85': 2.5, '87': 2.5,
      '61': 16.5, '62': 16.5, '64': 37.5,
      '95': 0
    }
    
    rate = rateMap[chapter] || 4.0
    
    return {
      base: rate,
      confidence,
      source: 'internal'
    }
  }

  private calculateBaseDuty(request: DutyCalculationRequest, dutyRates: any) {
    const quantity = request.quantity || 1
    const customsValue = request.customsValue || request.productValue
    
    // Calculate dutyable value (CIF - Cost, Insurance, Freight)
    const shippingCost = this.calculateShippingCost(request)
    const insuranceCost = this.calculateInsuranceCost(request)
    const dutyableValue = (customsValue * quantity) + shippingCost + insuranceCost
    
    // Calculate duty amount
    const dutyAmount = (dutyableValue * dutyRates.base) / 100
    
    // Calculate tax
    const taxInfo = ENHANCED_TAX_RATES[request.destinationCountry] || ENHANCED_TAX_RATES['default']
    const taxableValue = dutyableValue + dutyAmount
    const taxAmount = (taxableValue * taxInfo.rate) / 100
    
    return {
      dutyRate: dutyRates.base,
      dutyAmount,
      taxRate: taxInfo.rate,
      taxAmount,
      taxType: taxInfo.type,
      dutyableValue,
      taxableValue,
      confidence: dutyRates.confidence,
      source: dutyRates.source
    }
  }

  private async calculateAdditionalDuties(request: DutyCalculationRequest): Promise<AdditionalDuty[]> {
    const additionalDuties: AdditionalDuty[] = []
    
    // Check for antidumping duties
    if (request.destinationCountry === 'US' && request.originCountry === 'CN') {
      // Steel products
      if (request.hsCode.startsWith('72')) {
        additionalDuties.push({
          type: 'antidumping',
          rate: 25.8,
          amount: (request.productValue * 25.8) / 100,
          description: 'Antidumping duty on steel products from China',
          authority: 'US Department of Commerce'
        })
      }
      
      // Solar panels
      if (request.hsCode.startsWith('8541')) {
        additionalDuties.push({
          type: 'safeguard',
          rate: 30,
          amount: (request.productValue * 30) / 100,
          description: 'Safeguard tariff on solar cells',
          authority: 'US Trade Representative'
        })
      }
    }
    
    return additionalDuties
  }

  private calculateGovernmentFees(request: DutyCalculationRequest): GovernmentFee[] {
    const fees: GovernmentFee[] = []
    
    if (request.destinationCountry === 'US') {
      // Merchandise Processing Fee
      const mpfRate = 0.003464
      const mpfAmount = Math.min(Math.max(request.productValue * mpfRate, 27.23), 528.33)
      
      fees.push({
        type: 'MPF',
        amount: mpfAmount,
        description: 'Merchandise Processing Fee',
        calculation: `${(mpfRate * 100).toFixed(4)}% of value (min $27.23, max $528.33)`,
        mandatory: true
      })
      
      // Harbor Maintenance Fee
      const hmfAmount = request.productValue * 0.00125
      fees.push({
        type: 'HMF',
        amount: hmfAmount,
        description: 'Harbor Maintenance Fee',
        calculation: '0.125% of value',
        mandatory: true
      })
    }
    
    return fees
  }

  private calculateShippingCost(request: DutyCalculationRequest): number {
    const weight = request.weight || 1
    const method = request.shippingMethod || 'standard'
    
    let weightCategory: 'light' | 'medium' | 'heavy' | 'bulk'
    if (weight < 1) {weightCategory = 'light'}
    else if (weight <= 5) {weightCategory = 'medium'}
    else if (weight <= 20) {weightCategory = 'heavy'}
    else {weightCategory = 'bulk'}
    
    const costs = ENHANCED_SHIPPING_COSTS[method][weightCategory]
    return costs.base + (costs.perKg * weight)
  }

  private calculateInsuranceCost(request: DutyCalculationRequest): number {
    if (!request.includeInsurance) {return 0}
    
    const insuredValue = request.insuranceValue || request.productValue
    return insuredValue * 0.005 // 0.5% insurance rate
  }

  private calculateBrokerFees(request: DutyCalculationRequest): number {
    const isCommercial = request.isCommercialShipment ?? true
    if (!isCommercial) {return 0}
    
    // Broker fees typically 2-5% of shipment value
    const shipmentValue = request.productValue + this.calculateShippingCost(request)
    return shipmentValue * 0.03 // 3% broker fee
  }

  private async findOptimizationOpportunities(
    request: DutyCalculationRequest,
    baseDutyCalculation: any
  ): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = []
    
    // Classification optimization
    if (baseDutyCalculation.dutyRate > 5) {
      opportunities.push({
        type: 'classification',
        description: 'Consider reviewing HS code classification for potential lower duty rates',
        potentialSaving: request.productValue * 0.05, // Estimated 5% saving
        savingPercentage: 5,
        feasibility: 'medium',
        requirements: ['Product analysis', 'Classification review', 'Customs ruling'],
        riskLevel: 'low'
      })
    }
    
    // Origin optimization
    if (request.originCountry === 'CN' && request.destinationCountry === 'US') {
      opportunities.push({
        type: 'origin',
        description: 'Consider sourcing from FTA partner countries for duty-free treatment',
        potentialSaving: baseDutyCalculation.dutyAmount,
        savingPercentage: (baseDutyCalculation.dutyAmount / request.productValue) * 100,
        feasibility: 'low',
        requirements: ['Supplier diversification', 'Supply chain restructuring'],
        riskLevel: 'medium'
      })
    }
    
    return opportunities
  }

  private assembleCalculation(
    request: DutyCalculationRequest,
    baseDutyCalculation: any,
    additionalDuties: AdditionalDuty[],
    governmentFees: GovernmentFee[],
    shippingCost: number,
    insuranceCost: number,
    brokerFees: number,
    complianceStatus: 'compliant' | 'warning' | 'non-compliant',
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    optimizationOpportunities: OptimizationOpportunity[]
  ): EnhancedDutyCalculation {
    const totalAdditionalDutyAmount = additionalDuties.reduce((sum, duty) => sum + duty.amount, 0)
    const totalGovernmentFees = governmentFees.reduce((sum, fee) => sum + fee.amount, 0)
    const otherFees = 25 // Documentation and handling fees
    
    const totalLandedCost = baseDutyCalculation.dutyableValue + 
                           baseDutyCalculation.dutyAmount + 
                           totalAdditionalDutyAmount + 
                           baseDutyCalculation.taxAmount + 
                           totalGovernmentFees + 
                           brokerFees + 
                           otherFees
    
    const effectiveDutyRate = ((baseDutyCalculation.dutyAmount + totalAdditionalDutyAmount) / request.productValue) * 100
    
    return {
      dutyRate: baseDutyCalculation.dutyRate,
      dutyAmount: baseDutyCalculation.dutyAmount,
      taxRate: baseDutyCalculation.taxRate,
      taxAmount: baseDutyCalculation.taxAmount,
      additionalDuties,
      governmentFees,
      shippingCost,
      insuranceCost,
      brokerFees,
      otherFees,
      totalLandedCost,
      effectiveDutyRate,
      confidenceScore: baseDutyCalculation.confidence,
      breakdown: {
        productValue: request.productValue,
        quantity: request.quantity || 1,
        dutyableValue: baseDutyCalculation.dutyableValue,
        taxableValue: baseDutyCalculation.taxableValue,
        dutyCalculation: {
          baseRate: baseDutyCalculation.dutyRate,
          additionalRates: additionalDuties.map(d => d.rate),
          totalRate: baseDutyCalculation.dutyRate + additionalDuties.reduce((sum, d) => sum + d.rate, 0),
          amount: baseDutyCalculation.dutyAmount + totalAdditionalDutyAmount,
          basis: 'CIF Value'
        },
        taxCalculation: {
          rate: baseDutyCalculation.taxRate,
          amount: baseDutyCalculation.taxAmount,
          basis: 'CIF + Duty',
          type: baseDutyCalculation.taxType
        },
        fees: {
          shipping: shippingCost,
          insurance: insuranceCost,
          broker: brokerFees,
          government: totalGovernmentFees,
          other: otherFees
        }
      },
      dataSource: baseDutyCalculation.source,
      calculationDate: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      complianceStatus,
      riskLevel,
      optimizationOpportunities
    }
  }

  private generateCacheKey(request: DutyCalculationRequest): string {
    return `${request.hsCode}-${request.originCountry}-${request.destinationCountry}-${request.productValue}-${request.weight || 0}`
  }

  private isCacheValid(calculation: EnhancedDutyCalculation): boolean {
    if (!calculation.validUntil) {return false}
    return new Date() < calculation.validUntil
  }

  private isEUCountry(countryCode: string): boolean {
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 
                        'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE']
    return euCountries.includes(countryCode)
  }

  /**
   * Clear the calculation cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const enhancedDutyEngine = new EnhancedDutyEngine()