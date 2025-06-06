import { createBrowserClient } from '../supabase'

export interface TradeRestriction {
  id: string
  country: string
  hsCodePattern: string
  restrictionType: 'prohibited' | 'restricted' | 'controlled' | 'quota' | 'license' | 'duty'
  description: string
  requirements: string[]
  exemptions?: string[]
  effectiveDate: Date
  expiryDate?: Date
  authority: string
  referenceUrl?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ComplianceCheck {
  hsCode: string
  originCountry: string
  destinationCountry: string
  productValue?: number
  productWeight?: number
  intendedUse?: string
  endUser?: string
  licenseNumbers?: string[]
}

export interface ComplianceResult {
  compliant: boolean
  restrictions: TradeRestriction[]
  warnings: ComplianceWarning[]
  requirements: ComplianceRequirement[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  estimatedDutyRate?: number
  additionalFees?: Array<{
    type: string
    amount: number
    description: string
  }>
}

export interface ComplianceWarning {
  type: 'documentation' | 'licensing' | 'quota' | 'duty' | 'restriction'
  message: string
  severity: 'low' | 'medium' | 'high'
  actionRequired: boolean
  deadline?: Date
}

export interface ComplianceRequirement {
  type: 'license' | 'permit' | 'certificate' | 'documentation' | 'inspection'
  description: string
  authority: string
  processingTime?: string
  cost?: number
  validityPeriod?: string
  renewalRequired?: boolean
}

export interface DutyCalculation {
  baseRate: number
  additionalDuties: Array<{
    type: 'antidumping' | 'countervailing' | 'safeguard' | 'retaliatory'
    rate: number
    description: string
  }>
  totalRate: number
  estimatedAmount: number
  currency: string
  calculationDate: Date
  validUntil?: Date
}

// Comprehensive trade restrictions database
const TRADE_RESTRICTIONS: TradeRestriction[] = [
  // US Restrictions
  {
    id: 'us-firearms',
    country: 'US',
    hsCodePattern: '^93',
    restrictionType: 'prohibited',
    description: 'Firearms and ammunition import restrictions',
    requirements: ['ATF Import License', 'Background Check', 'Registration'],
    authority: 'Bureau of Alcohol, Tobacco, Firearms and Explosives (ATF)',
    effectiveDate: new Date('1968-10-22'),
    severity: 'critical'
  },
  {
    id: 'us-electronics-china',
    country: 'US',
    hsCodePattern: '^85',
    restrictionType: 'controlled',
    description: 'Electronics from China subject to additional scrutiny',
    requirements: ['Supply Chain Documentation', 'Security Assessment'],
    authority: 'Department of Commerce',
    effectiveDate: new Date('2020-01-01'),
    severity: 'high'
  },
  {
    id: 'us-textiles-quota',
    country: 'US',
    hsCodePattern: '^(50|51|52|53|54|55|56|57|58|59|60|61|62|63)',
    restrictionType: 'quota',
    description: 'Textile and apparel quota restrictions',
    requirements: ['Quota Allocation', 'Country of Origin Certificate'],
    authority: 'Office of Textiles and Apparel (OTEXA)',
    effectiveDate: new Date('2005-01-01'),
    severity: 'medium'
  },
  
  // EU Restrictions
  {
    id: 'eu-chemicals-reach',
    country: 'EU',
    hsCodePattern: '^28|^29|^30|^31|^32|^33|^34|^35|^36|^37|^38',
    restrictionType: 'controlled',
    description: 'REACH regulation for chemicals',
    requirements: ['REACH Registration', 'Safety Data Sheet', 'Authorized Representative'],
    authority: 'European Chemicals Agency (ECHA)',
    effectiveDate: new Date('2007-06-01'),
    severity: 'high'
  },
  {
    id: 'eu-toys-safety',
    country: 'EU',
    hsCodePattern: '^95',
    restrictionType: 'controlled',
    description: 'Toy safety directive compliance',
    requirements: ['CE Marking', 'Safety Testing', 'Technical Documentation'],
    authority: 'European Commission',
    effectiveDate: new Date('2011-07-20'),
    severity: 'high'
  },
  {
    id: 'eu-food-novel',
    country: 'EU',
    hsCodePattern: '^(16|17|18|19|20|21|22)',
    restrictionType: 'controlled',
    description: 'Novel food regulation',
    requirements: ['Novel Food Authorization', 'Health Certificate', 'Labeling Compliance'],
    authority: 'European Food Safety Authority (EFSA)',
    effectiveDate: new Date('2018-01-01'),
    severity: 'high'
  },
  
  // China Restrictions
  {
    id: 'cn-encryption',
    country: 'CN',
    hsCodePattern: '^85',
    restrictionType: 'controlled',
    description: 'Encryption technology import restrictions',
    requirements: ['Encryption Import License', 'Technical Specifications', 'End-User Certificate'],
    authority: 'State Cryptography Administration',
    effectiveDate: new Date('2020-01-01'),
    severity: 'critical'
  },
  {
    id: 'cn-waste-materials',
    country: 'CN',
    hsCodePattern: '^(39|40|47|72|74|76|78|79|81)',
    restrictionType: 'prohibited',
    description: 'Waste material import ban',
    requirements: [],
    authority: 'Ministry of Ecology and Environment',
    effectiveDate: new Date('2018-01-01'),
    severity: 'critical'
  },
  
  // General High-Risk Categories
  {
    id: 'general-narcotics',
    country: '*',
    hsCodePattern: '^29',
    restrictionType: 'controlled',
    description: 'Controlled substances and precursor chemicals',
    requirements: ['DEA License', 'Import Permit', 'End-User Certificate'],
    authority: 'Various National Authorities',
    effectiveDate: new Date('1961-03-30'),
    severity: 'critical'
  },
  {
    id: 'general-dual-use',
    country: '*',
    hsCodePattern: '^(84|85|90)',
    restrictionType: 'controlled',
    description: 'Dual-use technology export controls',
    requirements: ['Export License', 'End-User Statement', 'Technical Specifications'],
    authority: 'Export Control Authorities',
    effectiveDate: new Date('1996-07-01'),
    severity: 'high'
  }
]

// Duty rate database (simplified)
const DUTY_RATES: Record<string, Record<string, number>> = {
  'US': {
    '01': 0,      // Live animals
    '02': 0,      // Meat
    '84': 0,      // Machinery
    '85': 0,      // Electrical equipment
    '87': 2.5,    // Vehicles
    '61': 16.5,   // Knitted apparel
    '62': 16.5,   // Woven apparel
    '64': 37.5,   // Footwear
    '95': 0       // Toys
  },
  'EU': {
    '01': 0,      // Live animals
    '02': 12.8,   // Meat
    '84': 1.7,    // Machinery
    '85': 3.7,    // Electrical equipment
    '87': 10,     // Vehicles
    '61': 12,     // Knitted apparel
    '62': 12,     // Woven apparel
    '64': 17,     // Footwear
    '95': 4.7     // Toys
  },
  'CN': {
    '01': 12,     // Live animals
    '02': 25,     // Meat
    '84': 8.5,    // Machinery
    '85': 10,     // Electrical equipment
    '87': 25,     // Vehicles
    '61': 17.5,   // Knitted apparel
    '62': 17.5,   // Woven apparel
    '64': 24,     // Footwear
    '95': 10      // Toys
  }
}

class TradeComplianceChecker {
  private supabase = createBrowserClient()
  private restrictionsCache: Map<string, TradeRestriction[]> = new Map()
  private dutyRatesCache: Map<string, Record<string, number>> = new Map()

  constructor() {
    this.initializeCache()
  }

  private initializeCache(): void {
    // Initialize with static data
    Object.entries(DUTY_RATES).forEach(([country, rates]) => {
      this.dutyRatesCache.set(country, rates)
    })
  }

  async checkCompliance(check: ComplianceCheck): Promise<ComplianceResult> {
    const restrictions = await this.getApplicableRestrictions(check)
    const warnings = await this.generateWarnings(check, restrictions)
    const requirements = await this.generateRequirements(check, restrictions)
    const dutyCalculation = await this.calculateDuty(check)
    
    const riskLevel = this.assessRiskLevel(restrictions, warnings)
    const compliant = this.determineCompliance(restrictions, warnings)
    
    return {
      compliant,
      restrictions,
      warnings,
      requirements,
      recommendations: await this.generateRecommendations(check, restrictions),
      riskLevel,
      estimatedDutyRate: dutyCalculation?.totalRate,
      additionalFees: await this.calculateAdditionalFees(check)
    }
  }

  private async getApplicableRestrictions(check: ComplianceCheck): Promise<TradeRestriction[]> {
    const cacheKey = `${check.destinationCountry}-${check.hsCode.substring(0, 4)}`
    
    if (this.restrictionsCache.has(cacheKey)) {
      return this.restrictionsCache.get(cacheKey)!
    }

    const applicable = TRADE_RESTRICTIONS.filter(restriction => {
      // Check country match (or global restrictions)
      if (restriction.country !== '*' && restriction.country !== check.destinationCountry) {
        return false
      }

      // Check HS code pattern match
      try {
        const pattern = new RegExp(restriction.hsCodePattern)
        return pattern.test(check.hsCode)
      } catch {
        return false
      }
    })

    // Filter by effective dates
    const now = new Date()
    const activeRestrictions = applicable.filter(restriction => {
      if (restriction.effectiveDate > now) {return false}
      if (restriction.expiryDate && restriction.expiryDate < now) {return false}
      return true
    })

    this.restrictionsCache.set(cacheKey, activeRestrictions)
    return activeRestrictions
  }

  private async generateWarnings(
    check: ComplianceCheck,
    restrictions: TradeRestriction[]
  ): Promise<ComplianceWarning[]> {
    const warnings: ComplianceWarning[] = []

    // Check for high-risk restrictions
    const criticalRestrictions = restrictions.filter(r => r.severity === 'critical')
    if (criticalRestrictions.length > 0) {
      warnings.push({
        type: 'restriction',
        message: `Critical restrictions apply to this product in ${check.destinationCountry}`,
        severity: 'high',
        actionRequired: true
      })
    }

    // Check for licensing requirements
    const licenseRestrictions = restrictions.filter(r => 
      r.restrictionType === 'license' || 
      r.requirements.some(req => req.toLowerCase().includes('license'))
    )
    if (licenseRestrictions.length > 0) {
      warnings.push({
        type: 'licensing',
        message: 'Import/export licenses may be required',
        severity: 'medium',
        actionRequired: true
      })
    }

    // Check for quota restrictions
    const quotaRestrictions = restrictions.filter(r => r.restrictionType === 'quota')
    if (quotaRestrictions.length > 0) {
      warnings.push({
        type: 'quota',
        message: 'Product may be subject to quota limitations',
        severity: 'medium',
        actionRequired: true
      })
    }

    // Check for high-value shipments
    if (check.productValue && check.productValue > 2500) {
      warnings.push({
        type: 'documentation',
        message: 'High-value shipment requires additional documentation',
        severity: 'low',
        actionRequired: false
      })
    }

    // Check for controlled dual-use items
    if (this.isDualUseItem(check.hsCode)) {
      warnings.push({
        type: 'restriction',
        message: 'Product may be subject to dual-use export controls',
        severity: 'high',
        actionRequired: true
      })
    }

    return warnings
  }

  private async generateRequirements(
    check: ComplianceCheck,
    restrictions: TradeRestriction[]
  ): Promise<ComplianceRequirement[]> {
    const requirements: ComplianceRequirement[] = []

    // Extract requirements from restrictions
    for (const restriction of restrictions) {
      for (const req of restriction.requirements) {
        if (req.toLowerCase().includes('license')) {
          requirements.push({
            type: 'license',
            description: req,
            authority: restriction.authority,
            processingTime: this.getProcessingTime(req),
            cost: this.getRequirementCost(req)
          })
        } else if (req.toLowerCase().includes('certificate')) {
          requirements.push({
            type: 'certificate',
            description: req,
            authority: restriction.authority,
            validityPeriod: this.getValidityPeriod(req)
          })
        } else if (req.toLowerCase().includes('inspection')) {
          requirements.push({
            type: 'inspection',
            description: req,
            authority: restriction.authority,
            processingTime: '1-3 business days'
          })
        } else {
          requirements.push({
            type: 'documentation',
            description: req,
            authority: restriction.authority
          })
        }
      }
    }

    // Add standard requirements based on product value
    if (check.productValue && check.productValue > 800) {
      requirements.push({
        type: 'documentation',
        description: 'Commercial Invoice required',
        authority: 'Customs Authority'
      })
    }

    return requirements
  }

  private async calculateDuty(check: ComplianceCheck): Promise<DutyCalculation | null> {
    const countryRates = this.dutyRatesCache.get(check.destinationCountry)
    if (!countryRates || !check.productValue) {
      return null
    }

    const chapter = check.hsCode.substring(0, 2)
    const baseRate = countryRates[chapter] || 0

    // Check for additional duties (simplified)
    const additionalDuties = await this.getAdditionalDuties(check)
    const totalRate = baseRate + additionalDuties.reduce((sum, duty) => sum + duty.rate, 0)
    
    return {
      baseRate,
      additionalDuties,
      totalRate,
      estimatedAmount: (check.productValue * totalRate) / 100,
      currency: this.getCurrency(check.destinationCountry),
      calculationDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  }

  private async getAdditionalDuties(check: ComplianceCheck): Promise<Array<{
    type: 'antidumping' | 'countervailing' | 'safeguard' | 'retaliatory'
    rate: number
    description: string
  }>> {
    const additionalDuties = []

    // Example: Steel products from China to US
    if (check.destinationCountry === 'US' && 
        check.originCountry === 'CN' && 
        check.hsCode.startsWith('72')) {
      additionalDuties.push({
        type: 'antidumping' as const,
        rate: 25.8,
        description: 'Antidumping duty on steel products from China'
      })
    }

    // Example: Solar panels
    if (check.hsCode.startsWith('8541') && check.originCountry === 'CN') {
      additionalDuties.push({
        type: 'safeguard' as const,
        rate: 30,
        description: 'Safeguard tariff on solar cells'
      })
    }

    return additionalDuties
  }

  private async calculateAdditionalFees(check: ComplianceCheck): Promise<Array<{
    type: string
    amount: number
    description: string
  }>> {
    const fees = []

    // Merchandise Processing Fee (US)
    if (check.destinationCountry === 'US' && check.productValue) {
      const mpf = Math.min(Math.max(check.productValue * 0.003464, 27.23), 528.33)
      fees.push({
        type: 'MPF',
        amount: mpf,
        description: 'Merchandise Processing Fee'
      })
    }

    // Harbor Maintenance Fee (US)
    if (check.destinationCountry === 'US' && check.productValue) {
      fees.push({
        type: 'HMF',
        amount: check.productValue * 0.00125,
        description: 'Harbor Maintenance Fee'
      })
    }

    return fees
  }

  private assessRiskLevel(
    restrictions: TradeRestriction[],
    warnings: ComplianceWarning[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (restrictions.some(r => r.severity === 'critical') || 
        warnings.some(w => w.severity === 'high' && w.actionRequired)) {
      return 'critical'
    }
    
    if (restrictions.some(r => r.severity === 'high') || 
        warnings.some(w => w.severity === 'high')) {
      return 'high'
    }
    
    if (restrictions.some(r => r.severity === 'medium') || 
        warnings.some(w => w.severity === 'medium')) {
      return 'medium'
    }
    
    return 'low'
  }

  private determineCompliance(
    restrictions: TradeRestriction[],
    warnings: ComplianceWarning[]
  ): boolean {
    // Not compliant if there are prohibited items
    if (restrictions.some(r => r.restrictionType === 'prohibited')) {
      return false
    }
    
    // Not compliant if there are critical warnings requiring action
    if (warnings.some(w => w.severity === 'high' && w.actionRequired)) {
      return false
    }
    
    return true
  }

  private async generateRecommendations(
    check: ComplianceCheck,
    restrictions: TradeRestriction[]
  ): Promise<string[]> {
    const recommendations = []

    if (restrictions.length === 0) {
      recommendations.push('No specific trade restrictions identified for this product')
    }

    if (restrictions.some(r => r.restrictionType === 'license')) {
      recommendations.push('Apply for required import/export licenses well in advance')
    }

    if (restrictions.some(r => r.restrictionType === 'controlled')) {
      recommendations.push('Ensure all documentation and certifications are complete')
    }

    if (check.productValue && check.productValue > 2500) {
      recommendations.push('Consider using a licensed customs broker for high-value shipments')
    }

    if (this.isDualUseItem(check.hsCode)) {
      recommendations.push('Verify end-user and end-use to ensure compliance with export controls')
    }

    recommendations.push('Verify HS code classification with customs authorities if uncertain')
    recommendations.push('Keep all trade documentation for audit purposes')

    return recommendations
  }

  private isDualUseItem(hsCode: string): boolean {
    const dualUseChapters = ['84', '85', '90', '91']
    return dualUseChapters.includes(hsCode.substring(0, 2))
  }

  private getProcessingTime(requirement: string): string {
    if (requirement.toLowerCase().includes('license')) {
      return '2-8 weeks'
    }
    if (requirement.toLowerCase().includes('permit')) {
      return '1-4 weeks'
    }
    return '1-2 weeks'
  }

  private getRequirementCost(requirement: string): number {
    if (requirement.toLowerCase().includes('license')) {
      return 500
    }
    if (requirement.toLowerCase().includes('permit')) {
      return 200
    }
    return 100
  }

  private getValidityPeriod(requirement: string): string {
    if (requirement.toLowerCase().includes('certificate')) {
      return '1 year'
    }
    return '6 months'
  }

  private getCurrency(country: string): string {
    const currencies: Record<string, string> = {
      'US': 'USD',
      'EU': 'EUR',
      'CN': 'CNY',
      'GB': 'GBP',
      'JP': 'JPY',
      'CA': 'CAD'
    }
    return currencies[country] || 'USD'
  }

  // Public methods for managing restrictions
  async addRestriction(restriction: Omit<TradeRestriction, 'id'>): Promise<string> {
    const newRestriction: TradeRestriction = {
      ...restriction,
      id: `restriction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    
    TRADE_RESTRICTIONS.push(newRestriction)
    this.restrictionsCache.clear() // Clear cache to force refresh
    
    return newRestriction.id
  }

  async updateRestriction(restrictionId: string, updates: Partial<TradeRestriction>): Promise<boolean> {
    const index = TRADE_RESTRICTIONS.findIndex(r => r.id === restrictionId)
    if (index === -1) {return false}
    
    TRADE_RESTRICTIONS[index] = { ...TRADE_RESTRICTIONS[index], ...updates }
    this.restrictionsCache.clear()
    
    return true
  }

  async deleteRestriction(restrictionId: string): Promise<boolean> {
    const index = TRADE_RESTRICTIONS.findIndex(r => r.id === restrictionId)
    if (index === -1) {return false}
    
    TRADE_RESTRICTIONS.splice(index, 1)
    this.restrictionsCache.clear()
    
    return true
  }

  getRestrictions(country?: string): TradeRestriction[] {
    if (country) {
      return TRADE_RESTRICTIONS.filter(r => r.country === country || r.country === '*')
    }
    return [...TRADE_RESTRICTIONS]
  }

  // Method to check specific restriction types
  async checkSpecificRestriction(
    hsCode: string,
    country: string,
    restrictionType: TradeRestriction['restrictionType']
  ): Promise<TradeRestriction[]> {
    const check: ComplianceCheck = {
      hsCode,
      originCountry: 'XX',
      destinationCountry: country
    }
    
    const restrictions = await this.getApplicableRestrictions(check)
    return restrictions.filter(r => r.restrictionType === restrictionType)
  }
}

export default TradeComplianceChecker
export { TRADE_RESTRICTIONS, DUTY_RATES }