import { createBrowserClient } from '../supabase'

// Enhanced country-specific duty and tax rules
export interface CountryDutyRule {
  countryCode: string
  countryName: string
  hsChapterRates: Record<string, number> // HS chapter (2-digit) to duty rate
  hsSpecificRates: Record<string, number> // Specific HS codes with different rates
  taxInfo: {
    rate: number
    type: 'VAT' | 'GST' | 'sales_tax' | 'none'
    name: string
  }
  additionalFees: {
    mpf?: { rate: number; min: number; max: number } // Merchandise Processing Fee
    hmf?: { rate: number } // Harbor Maintenance Fee
    brokerFee?: { fixed: number; percentage: number }
    customsFee?: { fixed: number }
  }
  tradeAgreements: string[] // List of applicable trade agreements
  preferentialOrigins: Record<string, number> // Origin country to preferential rate
  effectiveDate: string
  lastUpdated: string
}

export interface TradeAgreement {
  code: string
  name: string
  countries: string[]
  hsCodeBenefits: Record<string, number> // HS code to reduced duty rate
  requirements: string[]
  effectiveDate: string
}

export interface DutyRuleQuery {
  hsCode: string
  destinationCountry: string
  originCountry?: string
  tradeAgreement?: string
  productValue?: number
  effectiveDate?: string
}

export interface DutyRuleResult {
  dutyRate: number
  taxRate: number
  taxType: string
  additionalFees: Array<{
    type: string
    rate?: number
    amount: number
    description: string
  }>
  tradeAgreementApplied?: string
  preferentialTreatment: boolean
  confidence: number
  source: 'database' | 'static' | 'external_api'
}

// Comprehensive country duty and tax rules
const MULTI_COUNTRY_RULES: Record<string, CountryDutyRule> = {
  'US': {
    countryCode: 'US',
    countryName: 'United States',
    hsChapterRates: {
      '01': 0,      // Live animals
      '02': 0,      // Meat and edible meat offal
      '03': 0,      // Fish and crustaceans
      '04': 17.5,   // Dairy products
      '05': 1.4,    // Products of animal origin
      '06': 6.8,    // Live trees and plants
      '07': 4.7,    // Edible vegetables
      '08': 5.4,    // Edible fruit and nuts
      '09': 3.2,    // Coffee, tea, spices
      '10': 1.1,    // Cereals
      '11': 3.6,    // Milling products
      '12': 1.2,    // Oil seeds and fruits
      '13': 5.1,    // Lac, gums, resins
      '14': 5.1,    // Vegetable plaiting materials
      '15': 4.6,    // Animal or vegetable fats
      '16': 5.4,    // Preparations of meat
      '17': 15.8,   // Sugars and sugar confectionery
      '18': 5.1,    // Cocoa and cocoa preparations
      '19': 4.5,    // Preparations of cereals
      '20': 11.5,   // Preparations of vegetables
      '21': 6.4,    // Miscellaneous edible preparations
      '22': 6.8,    // Beverages, spirits and vinegar
      '23': 1.4,    // Residues from food industries
      '24': 23.9,   // Tobacco and manufactured tobacco
      '25': 0.8,    // Salt, sulfur, earth and stone
      '26': 0,      // Ores, slag and ash
      '27': 1.3,    // Mineral fuels, oils
      '28': 3.7,    // Inorganic chemicals
      '29': 3.7,    // Organic chemicals
      '30': 0,      // Pharmaceutical products
      '31': 2.8,    // Fertilizers
      '32': 5.8,    // Tanning or dyeing extracts
      '33': 4.9,    // Essential oils and cosmetics
      '34': 2.4,    // Soap, organic surface-active agents
      '35': 3.1,    // Albuminoidal substances
      '36': 6.5,    // Explosives
      '37': 3.7,    // Photographic or cinematographic goods
      '38': 4.2,    // Miscellaneous chemical products
      '39': 3.1,    // Plastics and articles thereof
      '40': 2.5,    // Rubber and articles thereof
      '41': 2.5,    // Raw hides and skins
      '42': 4.6,    // Articles of leather
      '43': 2.7,    // Furskins and artificial fur
      '44': 1.7,    // Wood and articles of wood
      '45': 4.3,    // Cork and articles of cork
      '46': 3.3,    // Manufactures of straw
      '47': 0,      // Pulp of wood
      '48': 0.9,    // Paper and paperboard
      '49': 0,      // Printed books, newspapers
      '50': 7.9,    // Silk
      '51': 5.8,    // Wool, fine or coarse animal hair
      '52': 8.1,    // Cotton
      '53': 4.6,    // Other vegetable textile fibers
      '54': 9.7,    // Man-made filaments
      '55': 8.5,    // Man-made staple fibers
      '56': 8.0,    // Wadding, felt and nonwovens
      '57': 6.2,    // Carpets and other textile floor coverings
      '58': 9.1,    // Special woven fabrics
      '59': 8.0,    // Impregnated, coated, covered textiles
      '60': 10.4,   // Knitted or crocheted fabrics
      '61': 16.5,   // Articles of apparel, knitted
      '62': 16.6,   // Articles of apparel, not knitted
      '63': 11.4,   // Other made-up textile articles
      '64': 37.5,   // Footwear, gaiters
      '65': 5.7,    // Headgear and parts thereof
      '66': 6.5,    // Umbrellas, walking sticks
      '67': 4.1,    // Prepared feathers and down
      '68': 3.9,    // Articles of stone, plaster, cement
      '69': 6.5,    // Ceramic products
      '70': 5.6,    // Glass and glassware
      '71': 5.8,    // Natural or cultured pearls
      '72': 0,      // Iron and steel
      '73': 2.9,    // Articles of iron or steel
      '74': 1.0,    // Copper and articles thereof
      '75': 2.6,    // Nickel and articles thereof
      '76': 2.6,    // Aluminum and articles thereof
      '78': 2.2,    // Lead and articles thereof
      '79': 1.7,    // Zinc and articles thereof
      '80': 2.4,    // Tin and articles thereof
      '81': 4.4,    // Other base metals
      '82': 5.3,    // Tools, implements, cutlery
      '83': 5.7,    // Miscellaneous articles of base metal
      '84': 1.8,    // Nuclear reactors, machinery
      '85': 1.6,    // Electrical machinery and equipment
      '86': 1.4,    // Railway or tramway locomotives
      '87': 2.5,    // Vehicles other than railway
      '88': 0,      // Aircraft, spacecraft
      '89': 1.5,    // Ships, boats
      '90': 1.7,    // Optical, photographic instruments
      '91': 9.8,    // Clocks and watches
      '92': 3.2,    // Musical instruments
      '93': 2.4,    // Arms and ammunition
      '94': 3.4,    // Furniture, bedding, mattresses
      '95': 0,      // Toys, games and sports requisites
      '96': 4.5,    // Miscellaneous manufactured articles
      '97': 0,      // Works of art
      'default': 5.0
    },
    hsSpecificRates: {
      '8517.12': 0,   // Smartphones (duty-free)
      '8471.30': 0,   // Laptops (duty-free)
      '6109.10': 16.5, // Cotton t-shirts
      '9503.00': 0,   // Toys (duty-free)
    },
    taxInfo: {
      rate: 0,
      type: 'none',
      name: 'No Federal VAT'
    },
    additionalFees: {
      mpf: { rate: 0.3464, min: 27.23, max: 528.33 },
      hmf: { rate: 0.125 },
      brokerFee: { fixed: 50, percentage: 0.5 }
    },
    tradeAgreements: ['USMCA', 'CAFTA-DR'],
    preferentialOrigins: {
      'CA': 0,    // USMCA - duty-free for most products
      'MX': 0,    // USMCA - duty-free for most products
      'IL': 0,    // US-Israel FTA
      'JO': 0,    // US-Jordan FTA
    },
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-12-01'
  },
  
  'GB': {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    hsChapterRates: {
      '01': 0,      // Live animals
      '02': 12.8,   // Meat and edible meat offal
      '03': 8.0,    // Fish and crustaceans
      '04': 22.1,   // Dairy products
      '05': 0,      // Products of animal origin
      '06': 8.5,    // Live trees and plants
      '07': 9.6,    // Edible vegetables
      '08': 8.8,    // Edible fruit and nuts
      '09': 7.5,    // Coffee, tea, spices
      '10': 89.0,   // Cereals
      '84': 1.7,    // Machinery
      '85': 3.7,    // Electrical equipment
      '87': 10.0,   // Vehicles
      '61': 12.0,   // Knitted apparel
      '62': 12.0,   // Woven apparel
      '64': 17.0,   // Footwear
      '95': 4.7,    // Toys
      'default': 4.0
    },
    hsSpecificRates: {},
    taxInfo: {
      rate: 20.0,
      type: 'VAT',
      name: 'Value Added Tax'
    },
    additionalFees: {
      customsFee: { fixed: 25 }
    },
    tradeAgreements: ['UK-EU TCA'],
    preferentialOrigins: {
      'EU': 0,    // UK-EU Trade and Cooperation Agreement
    },
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-12-01'
  },
  
  'DE': {
    countryCode: 'DE',
    countryName: 'Germany',
    hsChapterRates: {
      '01': 0,      // Live animals
      '02': 12.8,   // Meat and edible meat offal
      '84': 1.7,    // Machinery
      '85': 3.7,    // Electrical equipment
      '87': 10.0,   // Vehicles
      '61': 12.0,   // Knitted apparel
      '62': 12.0,   // Woven apparel
      '64': 17.0,   // Footwear
      '95': 4.7,    // Toys
      'default': 4.0
    },
    hsSpecificRates: {},
    taxInfo: {
      rate: 19.0,
      type: 'VAT',
      name: 'Mehrwertsteuer'
    },
    additionalFees: {},
    tradeAgreements: ['EU-MERCOSUR', 'EU-Japan EPA'],
    preferentialOrigins: {
      'JP': 0,    // EU-Japan Economic Partnership Agreement
    },
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-12-01'
  },
  
  'FR': {
    countryCode: 'FR',
    countryName: 'France',
    hsChapterRates: {
      '01': 0,      // Live animals
      '02': 12.8,   // Meat and edible meat offal
      '84': 1.7,    // Machinery
      '85': 3.7,    // Electrical equipment
      '87': 10.0,   // Vehicles
      '61': 12.0,   // Knitted apparel
      '62': 12.0,   // Woven apparel
      '64': 17.0,   // Footwear
      '95': 4.7,    // Toys
      'default': 4.0
    },
    hsSpecificRates: {},
    taxInfo: {
      rate: 20.0,
      type: 'VAT',
      name: 'Taxe sur la valeur ajoutée'
    },
    additionalFees: {},
    tradeAgreements: ['EU-MERCOSUR', 'EU-Japan EPA'],
    preferentialOrigins: {
      'JP': 0,    // EU-Japan Economic Partnership Agreement
    },
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-12-01'
  },
  
  'CA': {
    countryCode: 'CA',
    countryName: 'Canada',
    hsChapterRates: {
      '01': 0,      // Live animals
      '02': 26.5,   // Meat and edible meat offal
      '84': 0,      // Machinery
      '85': 0,      // Electrical equipment
      '87': 6.1,    // Vehicles
      '61': 18.0,   // Knitted apparel
      '62': 18.0,   // Woven apparel
      '64': 20.0,   // Footwear
      '95': 0,      // Toys
      'default': 6.5
    },
    hsSpecificRates: {},
    taxInfo: {
      rate: 13.0,
      type: 'GST',
      name: 'Harmonized Sales Tax (average)'
    },
    additionalFees: {},
    tradeAgreements: ['USMCA', 'CPTPP'],
    preferentialOrigins: {
      'US': 0,    // USMCA
      'MX': 0,    // USMCA
    },
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-12-01'
  },
  
  'AU': {
    countryCode: 'AU',
    countryName: 'Australia',
    hsChapterRates: {
      '01': 0,      // Live animals
      '02': 0,      // Meat and edible meat offal
      '84': 0,      // Machinery
      '85': 0,      // Electrical equipment
      '87': 5.0,    // Vehicles
      '61': 10.0,   // Knitted apparel
      '62': 10.0,   // Woven apparel
      '64': 10.0,   // Footwear
      '95': 0,      // Toys
      'default': 5.0
    },
    hsSpecificRates: {},
    taxInfo: {
      rate: 10.0,
      type: 'GST',
      name: 'Goods and Services Tax'
    },
    additionalFees: {},
    tradeAgreements: ['CPTPP', 'RCEP'],
    preferentialOrigins: {
      'NZ': 0,    // Australia-New Zealand Closer Economic Relations
      'SG': 0,    // Singapore-Australia FTA
    },
    effectiveDate: '2024-01-01',
    lastUpdated: '2024-12-01'
  }
}

// Trade agreements database
const TRADE_AGREEMENTS: Record<string, TradeAgreement> = {
  'USMCA': {
    code: 'USMCA',
    name: 'United States-Mexico-Canada Agreement',
    countries: ['US', 'CA', 'MX'],
    hsCodeBenefits: {
      '87': 0,    // Vehicles (with origin requirements)
      '84': 0,    // Machinery
      '85': 0,    // Electrical equipment
    },
    requirements: ['Certificate of Origin', 'Regional Value Content'],
    effectiveDate: '2020-07-01'
  },
  'EU-Japan EPA': {
    code: 'EU-Japan EPA',
    name: 'EU-Japan Economic Partnership Agreement',
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'JP'],
    hsCodeBenefits: {
      '87': 0,    // Vehicles
      '22': 0,    // Alcoholic beverages
    },
    requirements: ['EUR.1 Certificate', 'Origin Declaration'],
    effectiveDate: '2019-02-01'
  },
  'CPTPP': {
    code: 'CPTPP',
    name: 'Comprehensive and Progressive Trans-Pacific Partnership',
    countries: ['AU', 'CA', 'JP', 'NZ', 'SG', 'VN'],
    hsCodeBenefits: {
      '84': 0,    // Machinery
      '85': 0,    // Electrical equipment
    },
    requirements: ['Certificate of Origin'],
    effectiveDate: '2018-12-30'
  }
}

export class MultiCountryRuleManager {
  private supabase = createBrowserClient()
  private cache: Map<string, DutyRuleResult> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Get duty and tax rules for a specific query
   */
  async getDutyRules(query: DutyRuleQuery): Promise<DutyRuleResult> {
    const cacheKey = this.generateCacheKey(query)
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (cached) {return cached}
    }

    try {
      // Try database first
      const dbResult = await this.getDutyRulesFromDatabase(query)
      if (dbResult && dbResult.confidence > 0.8) {
        this.setCacheValue(cacheKey, dbResult)
        return dbResult
      }

      // Fall back to static rules
      const staticResult = this.getDutyRulesFromStatic(query)
      this.setCacheValue(cacheKey, staticResult)
      return staticResult

    } catch (error) {
      console.error('Error getting duty rules:', error)
      // Fall back to static rules on error
      const staticResult = this.getDutyRulesFromStatic(query)
      return staticResult
    }
  }

  /**
   * Get duty rules from database
   */
  private async getDutyRulesFromDatabase(query: DutyRuleQuery): Promise<DutyRuleResult | null> {
    const { data, error } = await this.supabase
      .from('duty_rates')
      .select(`
        duty_percentage,
        vat_percentage,
        country_code,
        effective_date,
        classifications!inner(
          hs6,
          hs8
        )
      `)
      .eq('country_code', query.destinationCountry)
      .or(`classifications.hs6.eq.${query.hsCode.substring(0, 6)},classifications.hs8.eq.${query.hsCode}`)
      .order('effective_date', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return null
    }

    const record = data[0]
    return {
      dutyRate: record.duty_percentage,
      taxRate: record.vat_percentage || 0,
      taxType: this.getTaxTypeForCountry(query.destinationCountry),
      additionalFees: this.calculateAdditionalFees(query),
      preferentialTreatment: false,
      confidence: 0.9,
      source: 'database'
    }
  }

  /**
   * Get duty rules from static data
   */
  private getDutyRulesFromStatic(query: DutyRuleQuery): DutyRuleResult {
    const countryRules = MULTI_COUNTRY_RULES[query.destinationCountry]
    if (!countryRules) {
      // Return default rates for unknown countries
      return {
        dutyRate: 5.0,
        taxRate: 10.0,
        taxType: 'VAT',
        additionalFees: [],
        preferentialTreatment: false,
        confidence: 0.3,
        source: 'static'
      }
    }

    // Check for specific HS code rates first
    let dutyRate = countryRules.hsSpecificRates[query.hsCode]
    
    // Fall back to chapter rates
    if (dutyRate === undefined) {
      const hsChapter = query.hsCode.substring(0, 2)
      dutyRate = countryRules.hsChapterRates[hsChapter] || countryRules.hsChapterRates['default'] || 5.0
    }

    // Check for preferential treatment
    let preferentialTreatment = false
    if (query.originCountry && countryRules.preferentialOrigins[query.originCountry] !== undefined) {
      dutyRate = countryRules.preferentialOrigins[query.originCountry]
      preferentialTreatment = true
    }

    // Check trade agreements
    let tradeAgreementApplied: string | undefined
    if (query.tradeAgreement && query.originCountry) {
      const agreement = TRADE_AGREEMENTS[query.tradeAgreement]
      if (agreement && 
          agreement.countries.includes(query.destinationCountry) && 
          agreement.countries.includes(query.originCountry)) {
        const benefitRate = agreement.hsCodeBenefits[query.hsCode.substring(0, 2)]
        if (benefitRate !== undefined && benefitRate < dutyRate) {
          dutyRate = benefitRate
          tradeAgreementApplied = query.tradeAgreement
          preferentialTreatment = true
        }
      }
    }

    const additionalFees = this.calculateAdditionalFees(query, countryRules)

    return {
      dutyRate,
      taxRate: countryRules.taxInfo.rate,
      taxType: countryRules.taxInfo.type,
      additionalFees,
      tradeAgreementApplied,
      preferentialTreatment,
      confidence: 0.8,
      source: 'static'
    }
  }

  /**
   * Calculate additional fees based on country rules
   */
  private calculateAdditionalFees(
    query: DutyRuleQuery, 
    countryRules?: CountryDutyRule
  ): Array<{ type: string; rate?: number; amount: number; description: string }> {
    const fees: Array<{ type: string; rate?: number; amount: number; description: string }> = []
    
    if (!countryRules || !query.productValue) {return fees}

    // Merchandise Processing Fee (US)
    if (countryRules.additionalFees.mpf) {
      const mpf = countryRules.additionalFees.mpf
      const mpfAmount = Math.min(
        Math.max(query.productValue * (mpf.rate / 100), mpf.min),
        mpf.max
      )
      fees.push({
        type: 'MPF',
        rate: mpf.rate,
        amount: mpfAmount,
        description: 'Merchandise Processing Fee'
      })
    }

    // Harbor Maintenance Fee (US)
    if (countryRules.additionalFees.hmf) {
      const hmf = countryRules.additionalFees.hmf
      fees.push({
        type: 'HMF',
        rate: hmf.rate,
        amount: query.productValue * (hmf.rate / 100),
        description: 'Harbor Maintenance Fee'
      })
    }

    // Broker Fee
    if (countryRules.additionalFees.brokerFee) {
      const brokerFee = countryRules.additionalFees.brokerFee
      fees.push({
        type: 'broker',
        amount: brokerFee.fixed + (query.productValue * (brokerFee.percentage / 100)),
        description: 'Customs Broker Fee'
      })
    }

    // Customs Fee
    if (countryRules.additionalFees.customsFee) {
      fees.push({
        type: 'customs',
        amount: countryRules.additionalFees.customsFee.fixed,
        description: 'Customs Processing Fee'
      })
    }

    return fees
  }

  /**
   * Get available countries
   */
  getAvailableCountries(): Array<{ code: string; name: string }> {
    return Object.values(MULTI_COUNTRY_RULES).map(rule => ({
      code: rule.countryCode,
      name: rule.countryName
    }))
  }

  /**
   * Get available trade agreements for a country
   */
  getTradeAgreements(countryCode: string): TradeAgreement[] {
    return Object.values(TRADE_AGREEMENTS).filter(agreement => 
      agreement.countries.includes(countryCode)
    )
  }

  /**
   * Update duty rules in database
   */
  async updateDutyRules(
    hsCode: string,
    countryCode: string,
    dutyPercentage: number,
    vatPercentage?: number
  ): Promise<boolean> {
    try {
      // First, get or create classification
      let { data: classification } = await this.supabase
        .from('classifications')
        .select('id')
        .or(`hs6.eq.${hsCode.substring(0, 6)},hs8.eq.${hsCode}`)
        .single()

      if (!classification) {
        const { data: newClassification, error: classError } = await this.supabase
          .from('classifications')
          .insert({
            hs6: hsCode.substring(0, 6),
            hs8: hsCode.length >= 8 ? hsCode : null,
            description: `HS Code ${hsCode}`,
            product_id: 'temp-product-id', // This should be passed as a parameter
            workspace_id: 'temp-workspace-id' // This should be passed as a parameter
          })
          .select('id')
          .single()

        if (classError) {throw classError}
        classification = newClassification
      }

      // Insert or update duty rate
      const { error } = await this.supabase
        .from('duty_rates')
        .upsert({
          classification_id: classification.id,
          country_code: countryCode,
          duty_percentage: dutyPercentage,
          vat_percentage: vatPercentage,
          effective_date: new Date().toISOString()
        })

      if (error) {throw error}

      // Clear cache for this country
      this.clearCacheForCountry(countryCode)
      return true

    } catch (error) {
      console.error('Error updating duty rules:', error)
      return false
    }
  }

  // Private helper methods
  private generateCacheKey(query: DutyRuleQuery): string {
    return `${query.hsCode}-${query.destinationCountry}-${query.originCountry || 'none'}-${query.tradeAgreement || 'none'}`
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry ? expiry > Date.now() : false
  }

  private setCacheValue(key: string, value: DutyRuleResult): void {
    this.cache.set(key, value)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  private clearCacheForCountry(countryCode: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(`-${countryCode}-`)) {
        this.cache.delete(key)
        this.cacheExpiry.delete(key)
      }
    }
  }

  private getTaxTypeForCountry(countryCode: string): string {
    const countryRules = MULTI_COUNTRY_RULES[countryCode]
    return countryRules?.taxInfo.type || 'VAT'
  }
}

// Export static data for use in other modules
export { MULTI_COUNTRY_RULES, TRADE_AGREEMENTS }