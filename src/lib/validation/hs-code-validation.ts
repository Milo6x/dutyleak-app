// import { createBrowserClient } from '../supabase' // Kept for future database validation features

export interface ValidationRule {
  id: string
  name: string
  description: string
  type: 'format' | 'business' | 'compliance' | 'accuracy'
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
  priority: number
}

export interface ValidationContext {
  hsCode: string
  productDescription?: string
  productCategory?: string
  originCountry?: string
  destinationCountry?: string
  confidence?: number
  source?: string
  existingClassifications?: string[]
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
  complianceChecks: ComplianceResult[]
  businessLogicResults: BusinessLogicResult[]
}

export interface ValidationError {
  ruleId: string
  message: string
  field?: string
  severity: 'error'
  code: string
}

export interface ValidationWarning {
  ruleId: string
  message: string
  field?: string
  severity: 'warning'
  code: string
  suggestion?: string
}

export interface ValidationSuggestion {
  ruleId: string
  message: string
  alternativeCode?: string
  confidence?: number
  reasoning: string
}

export interface ComplianceResult {
  country: string
  isCompliant: boolean
  restrictions: string[]
  requirements: string[]
  dutyRate?: string
  tradeAgreements?: string[]
}

export interface BusinessLogicResult {
  rule: string
  passed: boolean
  message: string
  impact: 'high' | 'medium' | 'low'
  recommendation?: string
}

// HS Code format patterns (currently unused but kept for future use)
// const HS_CODE_PATTERNS = {
//   hs6: /^\d{6}$/,
//   hs8: /^\d{8}$/,
//   hs10: /^\d{10}$/,
//   hsWithDots: /^\d{2}\.\d{2}\.\d{2}(\.\d{2}(\.\d{2})?)?$/,
//   chapter: /^\d{2}$/,
//   heading: /^\d{4}$/
// }

// Confidence thresholds for different actions
const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 95,
  MANUAL_REVIEW: 70,
  REJECT: 50
}

// Country-specific trade restrictions
const TRADE_RESTRICTIONS: Record<string, { chapters: string[], description: string }[]> = {
  'US': [
    { chapters: ['93'], description: 'Arms and ammunition require special licensing' },
    { chapters: ['30'], description: 'Pharmaceutical products require FDA approval' },
    { chapters: ['27'], description: 'Energy products may have export restrictions' }
  ],
  'EU': [
    { chapters: ['93'], description: 'Weapons require special permits' },
    { chapters: ['30'], description: 'Medicines require EMA authorization' },
    { chapters: ['28', '29'], description: 'Chemicals subject to REACH regulation' }
  ],
  'CN': [
    { chapters: ['84', '85'], description: 'Electronics require CCC certification' },
    { chapters: ['87'], description: 'Vehicles require type approval' }
  ]
}

// Product category validation rules
const CATEGORY_VALIDATION_RULES: Record<string, {
  requiredFields: string[]
  forbiddenChapters: string[]
  preferredChapters: string[]
  specificRules: string[]
}> = {
  'Electronics': {
    requiredFields: ['productDescription'],
    forbiddenChapters: ['01', '02', '03', '04', '05'],
    preferredChapters: ['84', '85', '90', '91'],
    specificRules: [
      'Electronic products must specify voltage and frequency',
      'Consider electromagnetic compatibility requirements',
      'Battery-powered devices may have shipping restrictions'
    ]
  },
  'Textiles': {
    requiredFields: ['productDescription'],
    forbiddenChapters: ['84', '85', '90'],
    preferredChapters: ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63'],
    specificRules: [
      'Fiber content percentage is crucial for classification',
      'Manufacturing process affects HS code selection',
      'Consider country of origin labeling requirements'
    ]
  },
  'Machinery': {
    requiredFields: ['productDescription'],
    forbiddenChapters: ['01', '02', '03', '04', '05'],
    preferredChapters: ['84'],
    specificRules: [
      'Function and operation method determine classification',
      'Consider safety standards and certifications',
      'Power source and capacity may affect classification'
    ]
  },
  'Chemicals': {
    requiredFields: ['productDescription'],
    forbiddenChapters: ['84', '85', '94', '95'],
    preferredChapters: ['28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38'],
    specificRules: [
      'Chemical composition determines classification',
      'Purity level affects HS code selection',
      'Consider hazardous material regulations',
      'CAS number may be required for identification'
    ]
  }
}

class HSCodeValidator {
  // private _supabase = createBrowserClient() // Kept for future database validation features
  private validationRules: ValidationRule[] = []

  constructor() {
    this.initializeValidationRules()
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      {
        id: 'format-basic',
        name: 'Basic Format Validation',
        description: 'Validates HS code format and length',
        type: 'format',
        severity: 'error',
        enabled: true,
        priority: 1
      },
      {
        id: 'format-chapter',
        name: 'Chapter Validation',
        description: 'Validates HS chapter exists and is valid',
        type: 'format',
        severity: 'error',
        enabled: true,
        priority: 2
      },
      {
        id: 'business-category-match',
        name: 'Category Matching',
        description: 'Validates HS code matches product category',
        type: 'business',
        severity: 'warning',
        enabled: true,
        priority: 3
      },
      {
        id: 'business-confidence',
        name: 'Confidence Threshold',
        description: 'Validates classification confidence meets minimum threshold',
        type: 'business',
        severity: 'warning',
        enabled: true,
        priority: 4
      },
      {
        id: 'compliance-country',
        name: 'Country Compliance',
        description: 'Validates compliance with country-specific trade regulations',
        type: 'compliance',
        severity: 'warning',
        enabled: true,
        priority: 5
      },
      {
        id: 'accuracy-consistency',
        name: 'Classification Consistency',
        description: 'Validates consistency with previous classifications',
        type: 'accuracy',
        severity: 'info',
        enabled: true,
        priority: 6
      }
    ]
  }

  async validateHSCode(context: ValidationContext): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      score: 100,
      errors: [],
      warnings: [],
      suggestions: [],
      complianceChecks: [],
      businessLogicResults: []
    }

    // Run all validation rules
    for (const rule of this.validationRules.filter(r => r.enabled)) {
      try {
        await this.executeValidationRule(rule, context, result)
      } catch (error) {
        console.error(`Error executing validation rule ${rule.id}:`, error)
        result.warnings.push({
          ruleId: rule.id,
          message: `Validation rule failed: ${rule.name}`,
          severity: 'warning',
          code: 'RULE_EXECUTION_ERROR'
        })
      }
    }

    // Calculate overall validation score
    result.score = this.calculateValidationScore(result)
    result.isValid = result.errors.length === 0 && result.score >= CONFIDENCE_THRESHOLDS.MANUAL_REVIEW

    return result
  }

  private async executeValidationRule(
    rule: ValidationRule,
    context: ValidationContext,
    result: ValidationResult
  ): Promise<void> {
    switch (rule.id) {
      case 'format-basic':
        this.validateBasicFormat(context, result)
        break
      case 'format-chapter':
        this.validateChapter(context, result)
        break
      case 'business-category-match':
        this.validateCategoryMatch(context, result)
        break
      case 'business-confidence':
        this.validateConfidence(context, result)
        break
      case 'compliance-country':
        await this.validateCountryCompliance(context, result)
        break
      case 'accuracy-consistency':
        await this.validateConsistency(context, result)
        break
    }
  }

  private validateBasicFormat(context: ValidationContext, result: ValidationResult): void {
    const { hsCode } = context
    const cleanCode = hsCode.replace(/[^0-9]/g, '')

    if (!cleanCode) {
      result.errors.push({
        ruleId: 'format-basic',
        message: 'HS code cannot be empty',
        field: 'hsCode',
        severity: 'error',
        code: 'EMPTY_HS_CODE'
      })
      return
    }

    if (cleanCode.length < 6) {
      result.errors.push({
        ruleId: 'format-basic',
        message: 'HS code must be at least 6 digits (HS6 level)',
        field: 'hsCode',
        severity: 'error',
        code: 'INVALID_LENGTH_SHORT'
      })
    }

    if (cleanCode.length > 10) {
      result.errors.push({
        ruleId: 'format-basic',
        message: 'HS code cannot exceed 10 digits',
        field: 'hsCode',
        severity: 'error',
        code: 'INVALID_LENGTH_LONG'
      })
    }

    if (cleanCode.startsWith('00')) {
      result.errors.push({
        ruleId: 'format-basic',
        message: 'HS codes cannot start with 00',
        field: 'hsCode',
        severity: 'error',
        code: 'INVALID_CHAPTER_00'
      })
    }

    // Check for suspicious patterns
    if (/0{4,}/.test(cleanCode)) {
      result.warnings.push({
        ruleId: 'format-basic',
        message: 'Multiple consecutive zeros detected. Please verify this is correct',
        field: 'hsCode',
        severity: 'warning',
        code: 'SUSPICIOUS_ZEROS'
      })
    }
  }

  private validateChapter(context: ValidationContext, result: ValidationResult): void {
    const { hsCode } = context
    const cleanCode = hsCode.replace(/[^0-9]/g, '')
    
    if (cleanCode.length >= 2) {
      const chapter = cleanCode.substring(0, 2)
      const chapterNum = parseInt(chapter)
      
      if (chapterNum < 1 || chapterNum > 97) {
        result.errors.push({
          ruleId: 'format-chapter',
          message: `Invalid HS chapter: ${chapter}. Must be between 01-97`,
          field: 'hsCode',
          severity: 'error',
          code: 'INVALID_CHAPTER_RANGE'
        })
      }

      // Check for reserved chapters
      if (['77'].includes(chapter)) {
        result.errors.push({
          ruleId: 'format-chapter',
          message: `Chapter ${chapter} is reserved and not used in HS classification`,
          field: 'hsCode',
          severity: 'error',
          code: 'RESERVED_CHAPTER'
        })
      }
    }
  }

  private validateCategoryMatch(context: ValidationContext, result: ValidationResult): void {
    const { hsCode, productCategory } = context
    
    if (!productCategory) {
      return
    }

    const cleanCode = hsCode.replace(/[^0-9]/g, '')
    if (cleanCode.length < 2) {
      return
    }

    const chapter = cleanCode.substring(0, 2)
    const categoryRules = CATEGORY_VALIDATION_RULES[productCategory]

    if (categoryRules) {
      // Check forbidden chapters
      if (categoryRules.forbiddenChapters.includes(chapter)) {
        result.warnings.push({
          ruleId: 'business-category-match',
          message: `HS chapter ${chapter} is not typically used for ${productCategory} products`,
          field: 'productCategory',
          severity: 'warning',
          code: 'CATEGORY_CHAPTER_MISMATCH',
          suggestion: `Consider chapters: ${categoryRules.preferredChapters.join(', ')}`
        })
      }

      // Check preferred chapters
      if (!categoryRules.preferredChapters.includes(chapter)) {
        result.suggestions.push({
          ruleId: 'business-category-match',
          message: `Consider using chapters typically associated with ${productCategory}`,
          reasoning: `Chapters ${categoryRules.preferredChapters.join(', ')} are commonly used for ${productCategory} products`
        })
      }

      // Add specific rules as suggestions
      categoryRules.specificRules.forEach(rule => {
        result.suggestions.push({
          ruleId: 'business-category-match',
          message: rule,
          reasoning: `Category-specific guidance for ${productCategory}`
        })
      })
    }
  }

  private validateConfidence(context: ValidationContext, result: ValidationResult): void {
    const { confidence } = context
    
    if (confidence === undefined) {
      return
    }

    if (confidence < CONFIDENCE_THRESHOLDS.REJECT) {
      result.errors.push({
        ruleId: 'business-confidence',
        message: `Classification confidence (${confidence}%) is below minimum threshold (${CONFIDENCE_THRESHOLDS.REJECT}%)`,
        severity: 'error',
        code: 'LOW_CONFIDENCE'
      })
    } else if (confidence < CONFIDENCE_THRESHOLDS.MANUAL_REVIEW) {
      result.warnings.push({
        ruleId: 'business-confidence',
        message: `Classification confidence (${confidence}%) requires manual review`,
        severity: 'warning',
        code: 'MANUAL_REVIEW_REQUIRED',
        suggestion: 'Consider providing more detailed product information to improve confidence'
      })
    } else if (confidence < CONFIDENCE_THRESHOLDS.AUTO_APPROVE) {
      result.suggestions.push({
        ruleId: 'business-confidence',
        message: 'Good confidence level, but consider verification',
        reasoning: `Confidence of ${confidence}% is acceptable but below auto-approval threshold`
      })
    }
  }

  private async validateCountryCompliance(
    context: ValidationContext,
    result: ValidationResult
  ): Promise<void> {
    const { hsCode, originCountry, destinationCountry } = context
    const cleanCode = hsCode.replace(/[^0-9]/g, '')
    
    if (cleanCode.length < 2) {
      return
    }

    const chapter = cleanCode.substring(0, 2)
    const countries = [originCountry, destinationCountry].filter(Boolean)

    for (const country of countries) {
      if (!country) {
        continue
      }

      const complianceResult: ComplianceResult = {
        country,
        isCompliant: true,
        restrictions: [],
        requirements: []
      }

      const restrictions = TRADE_RESTRICTIONS[country] || []
      const applicableRestrictions = restrictions.filter(r => r.chapters.includes(chapter))

      if (applicableRestrictions.length > 0) {
        complianceResult.isCompliant = false
        complianceResult.restrictions = applicableRestrictions.map(r => r.description)
        
        result.warnings.push({
          ruleId: 'compliance-country',
          message: `Trade restrictions may apply for ${country}`,
          severity: 'warning',
          code: 'TRADE_RESTRICTIONS',
          suggestion: 'Verify compliance with country-specific regulations'
        })
      }

      result.complianceChecks.push(complianceResult)
    }
  }

  private async validateConsistency(
    context: ValidationContext,
    result: ValidationResult
  ): Promise<void> {
    const { hsCode, existingClassifications } = context
    
    if (!existingClassifications || existingClassifications.length === 0) {
      return
    }

    const cleanCode = hsCode.replace(/[^0-9]/g, '')
    const chapter = cleanCode.substring(0, 2)
    
    // Check if this classification is consistent with previous ones
    const previousChapters = existingClassifications
      .map(code => code.replace(/[^0-9]/g, '').substring(0, 2))
      .filter(Boolean)

    const uniqueChapters = Array.from(new Set(previousChapters))
    
    if (uniqueChapters.length > 1 && !uniqueChapters.includes(chapter)) {
      result.warnings.push({
        ruleId: 'accuracy-consistency',
        message: 'This classification differs from previous classifications for similar products',
        severity: 'warning',
        code: 'INCONSISTENT_CLASSIFICATION',
        suggestion: `Previous classifications used chapters: ${uniqueChapters.join(', ')}`
      })
    }

    // Business logic result
    result.businessLogicResults.push({
      rule: 'Classification Consistency Check',
      passed: uniqueChapters.includes(chapter),
      message: uniqueChapters.includes(chapter) 
        ? 'Classification is consistent with previous classifications'
        : 'Classification differs from previous patterns',
      impact: 'medium',
      recommendation: uniqueChapters.includes(chapter)
        ? undefined
        : 'Review classification logic and consider if product characteristics have changed'
    })
  }

  private calculateValidationScore(result: ValidationResult): number {
    let score = 100
    
    // Deduct points for errors and warnings
    score -= result.errors.length * 25
    score -= result.warnings.length * 10
    
    // Bonus for compliance
    const compliantChecks = result.complianceChecks.filter(c => c.isCompliant).length
    const totalChecks = result.complianceChecks.length
    if (totalChecks > 0) {
      score += (compliantChecks / totalChecks) * 10
    }
    
    // Bonus for passing business logic
    const passedLogic = result.businessLogicResults.filter(r => r.passed).length
    const totalLogic = result.businessLogicResults.length
    if (totalLogic > 0) {
      score += (passedLogic / totalLogic) * 5
    }
    
    return Math.max(0, Math.min(100, score))
  }

  // Public method to get validation rules
  getValidationRules(): ValidationRule[] {
    return [...this.validationRules]
  }

  // Public method to update validation rules
  updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): boolean {
    const ruleIndex = this.validationRules.findIndex(r => r.id === ruleId)
    if (ruleIndex === -1) {
      return false
    }
    
    this.validationRules[ruleIndex] = { ...this.validationRules[ruleIndex], ...updates }
    return true
  }
}

export default HSCodeValidator
export { CONFIDENCE_THRESHOLDS, TRADE_RESTRICTIONS, CATEGORY_VALIDATION_RULES }