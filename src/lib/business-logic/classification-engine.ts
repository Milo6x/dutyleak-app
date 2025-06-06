import { createBrowserClient } from '../supabase'
import HSCodeValidator, { ValidationContext, ValidationResult } from '../validation/hs-code-validation'

export interface ClassificationRule {
  id: string
  name: string
  description: string
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  enabled: boolean
  category?: string
  createdAt: Date
  updatedAt: Date
}

export interface RuleCondition {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'range' | 'in' | 'notIn'
  value: any
  caseSensitive?: boolean
}

export interface RuleAction {
  type: 'suggest' | 'require' | 'warn' | 'block' | 'auto-classify' | 'flag-review'
  target?: string
  value?: any
  message: string
  severity?: 'low' | 'medium' | 'high'
}

export interface ClassificationDecision {
  hsCode: string
  confidence: number
  reasoning: string
  source: 'ai' | 'rules' | 'hybrid'
  appliedRules: string[]
  requiresReview: boolean
  autoApproved: boolean
  flags: ClassificationFlag[]
}

export interface ClassificationFlag {
  type: 'accuracy' | 'compliance' | 'consistency' | 'confidence' | 'manual'
  severity: 'low' | 'medium' | 'high'
  message: string
  ruleId?: string
  recommendation?: string
}

export interface BusinessLogicContext {
  productDescription: string
  productName?: string
  productCategory?: string
  originCountry?: string
  destinationCountry?: string
  value?: number
  weight?: number
  dimensions?: { length: number; width: number; height: number }
  materials?: string[]
  manufacturer?: string
  brandName?: string
  model?: string
  intendedUse?: string
  existingClassifications?: Array<{
    hsCode: string
    confidence: number
    date: Date
    source: string
  }>
  userHistory?: Array<{
    productType: string
    hsCode: string
    accuracy: number
  }>
}

export interface AccuracyMetrics {
  overallAccuracy: number
  categoryAccuracy: Record<string, number>
  confidenceCalibration: number
  consistencyScore: number
  userSatisfactionScore: number
}

// Pre-defined classification rules
const DEFAULT_CLASSIFICATION_RULES: Omit<ClassificationRule, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'electronics-voltage-check',
    name: 'Electronics Voltage Specification',
    description: 'Require voltage specification for electronic products',
    conditions: [
      { field: 'productCategory', operator: 'equals', value: 'Electronics' },
      { field: 'productDescription', operator: 'regex', value: '\\b(electronic|electrical|device|gadget)\\b' }
    ],
    actions: [
      {
        type: 'require',
        target: 'voltage',
        message: 'Voltage specification is required for electronic products',
        severity: 'medium'
      }
    ],
    priority: 1,
    enabled: true,
    category: 'Electronics'
  },
  {
    id: 'textile-fiber-content',
    name: 'Textile Fiber Content Requirement',
    description: 'Require fiber content for textile products',
    conditions: [
      { field: 'productCategory', operator: 'equals', value: 'Textiles' },
      { field: 'productDescription', operator: 'regex', value: '\\b(fabric|textile|clothing|apparel|cotton|wool|silk|polyester)\\b' }
    ],
    actions: [
      {
        type: 'require',
        target: 'fiberContent',
        message: 'Fiber content percentage is required for textile classification',
        severity: 'high'
      }
    ],
    priority: 1,
    enabled: true,
    category: 'Textiles'
  },
  {
    id: 'food-preservation-method',
    name: 'Food Preservation Method',
    description: 'Identify preservation method for food products',
    conditions: [
      { field: 'productCategory', operator: 'in', value: ['Food', 'Beverages'] },
      { field: 'productDescription', operator: 'regex', value: '\\b(food|beverage|edible|consumable)\\b' }
    ],
    actions: [
      {
        type: 'suggest',
        message: 'Consider preservation method (fresh, frozen, dried, canned) for accurate classification',
        severity: 'medium'
      }
    ],
    priority: 2,
    enabled: true,
    category: 'Food'
  },
  {
    id: 'machinery-function-check',
    name: 'Machinery Function Specification',
    description: 'Require function specification for machinery',
    conditions: [
      { field: 'productCategory', operator: 'equals', value: 'Machinery' },
      { field: 'productDescription', operator: 'regex', value: '\\b(machine|equipment|apparatus|tool)\\b' }
    ],
    actions: [
      {
        type: 'require',
        target: 'function',
        message: 'Primary function and operation method must be specified for machinery',
        severity: 'high'
      }
    ],
    priority: 1,
    enabled: true,
    category: 'Machinery'
  },
  {
    id: 'high-value-review',
    name: 'High Value Product Review',
    description: 'Flag high-value products for manual review',
    conditions: [
      { field: 'value', operator: 'range', value: { min: 10000, max: Infinity } }
    ],
    actions: [
      {
        type: 'flag-review',
        message: 'High-value product requires additional review for duty optimization',
        severity: 'medium'
      }
    ],
    priority: 3,
    enabled: true
  },
  {
    id: 'consistency-check',
    name: 'Classification Consistency Check',
    description: 'Check consistency with previous classifications',
    conditions: [
      { field: 'existingClassifications', operator: 'notIn', value: [] }
    ],
    actions: [
      {
        type: 'warn',
        message: 'Classification differs from previous similar products',
        severity: 'low'
      }
    ],
    priority: 4,
    enabled: true
  }
]

class ClassificationEngine {
  private supabase = createBrowserClient()
  private validator = new HSCodeValidator()
  private rules: ClassificationRule[] = []
  private accuracyMetrics: AccuracyMetrics = {
    overallAccuracy: 0,
    categoryAccuracy: {},
    confidenceCalibration: 0,
    consistencyScore: 0,
    userSatisfactionScore: 0
  }

  constructor() {
    this.initializeRules()
  }

  private initializeRules(): void {
    const now = new Date()
    this.rules = DEFAULT_CLASSIFICATION_RULES.map(rule => ({
      ...rule,
      createdAt: now,
      updatedAt: now
    }))
  }

  async processClassification(
    context: BusinessLogicContext,
    aiSuggestions: Array<{ hsCode: string; confidence: number; reasoning: string }>
  ): Promise<ClassificationDecision> {
    // Apply business rules
    const ruleResults = await this.applyBusinessRules(context)
    
    // Validate AI suggestions
    const validationResults = await Promise.all(
      aiSuggestions.map(suggestion => 
        this.validateSuggestion(suggestion, context)
      )
    )

    // Determine best classification
    const decision = await this.makeClassificationDecision(
      context,
      aiSuggestions,
      validationResults,
      ruleResults
    )

    // Update accuracy metrics
    await this.updateAccuracyMetrics(decision, context)

    return decision
  }

  private async applyBusinessRules(context: BusinessLogicContext): Promise<{
    appliedRules: string[]
    flags: ClassificationFlag[]
    requirements: string[]
    suggestions: string[]
  }> {
    const result = {
      appliedRules: [],
      flags: [],
      requirements: [],
      suggestions: []
    }

    // Sort rules by priority
    const sortedRules = this.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const rule of sortedRules) {
      if (await this.evaluateRuleConditions(rule.conditions, context)) {
        result.appliedRules.push(rule.id)
        
        for (const action of rule.actions) {
          await this.executeRuleAction(action, context, result)
        }
      }
    }

    return result
  }

  private async evaluateRuleConditions(
    conditions: RuleCondition[],
    context: BusinessLogicContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(condition.field, context)
      
      if (!this.evaluateCondition(condition, fieldValue)) {
        return false
      }
    }
    return true
  }

  private getFieldValue(field: string, context: BusinessLogicContext): any {
    const fieldMap: Record<string, any> = {
      productDescription: context.productDescription,
      productName: context.productName,
      productCategory: context.productCategory,
      originCountry: context.originCountry,
      destinationCountry: context.destinationCountry,
      value: context.value,
      weight: context.weight,
      materials: context.materials,
      manufacturer: context.manufacturer,
      brandName: context.brandName,
      model: context.model,
      intendedUse: context.intendedUse,
      existingClassifications: context.existingClassifications
    }
    
    return fieldMap[field]
  }

  private evaluateCondition(condition: RuleCondition, fieldValue: any): boolean {
    if (fieldValue === undefined || fieldValue === null) {
      return condition.operator === 'notIn' || condition.operator === 'in' && Array.isArray(condition.value) && condition.value.length === 0
    }

    switch (condition.operator) {
      case 'equals':
        return condition.caseSensitive 
          ? fieldValue === condition.value
          : String(fieldValue).toLowerCase() === String(condition.value).toLowerCase()
      
      case 'contains':
        const searchValue = condition.caseSensitive 
          ? String(fieldValue)
          : String(fieldValue).toLowerCase()
        const searchTerm = condition.caseSensitive 
          ? String(condition.value)
          : String(condition.value).toLowerCase()
        return searchValue.includes(searchTerm)
      
      case 'startsWith':
        return String(fieldValue).startsWith(String(condition.value))
      
      case 'endsWith':
        return String(fieldValue).endsWith(String(condition.value))
      
      case 'regex':
        try {
          const regex = new RegExp(condition.value, condition.caseSensitive ? 'g' : 'gi')
          return regex.test(String(fieldValue))
        } catch {
          return false
        }
      
      case 'range':
        const numValue = Number(fieldValue)
        return numValue >= condition.value.min && numValue <= condition.value.max
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      
      case 'notIn':
        return !Array.isArray(condition.value) || !condition.value.includes(fieldValue)
      
      default:
        return false
    }
  }

  private async executeRuleAction(
    action: RuleAction,
    context: BusinessLogicContext,
    result: {
      flags: ClassificationFlag[]
      requirements: string[]
      suggestions: string[]
    }
  ): Promise<void> {
    switch (action.type) {
      case 'require':
        result.requirements.push(action.message)
        break
      
      case 'suggest':
        result.suggestions.push(action.message)
        break
      
      case 'warn':
        result.flags.push({
          type: 'manual',
          severity: action.severity || 'medium',
          message: action.message
        })
        break
      
      case 'flag-review':
        result.flags.push({
          type: 'manual',
          severity: action.severity || 'medium',
          message: action.message,
          recommendation: 'Manual review recommended'
        })
        break
      
      case 'block':
        result.flags.push({
          type: 'compliance',
          severity: 'high',
          message: action.message,
          recommendation: 'Classification blocked - resolve issues before proceeding'
        })
        break
    }
  }

  private async validateSuggestion(
    suggestion: { hsCode: string; confidence: number; reasoning: string },
    context: BusinessLogicContext
  ): Promise<ValidationResult> {
    const validationContext: ValidationContext = {
      hsCode: suggestion.hsCode,
      productDescription: context.productDescription,
      productCategory: context.productCategory,
      originCountry: context.originCountry,
      destinationCountry: context.destinationCountry,
      confidence: suggestion.confidence,
      existingClassifications: context.existingClassifications?.map(c => c.hsCode)
    }

    return await this.validator.validateHSCode(validationContext)
  }

  private async makeClassificationDecision(
    context: BusinessLogicContext,
    aiSuggestions: Array<{ hsCode: string; confidence: number; reasoning: string }>,
    validationResults: ValidationResult[],
    ruleResults: {
      appliedRules: string[]
      flags: ClassificationFlag[]
      requirements: string[]
      suggestions: string[]
    }
  ): Promise<ClassificationDecision> {
    // Score each suggestion based on validation and business rules
    const scoredSuggestions = aiSuggestions.map((suggestion, index) => {
      const validation = validationResults[index]
      let score = suggestion.confidence
      
      // Adjust score based on validation
      score = score * (validation.score / 100)
      
      // Penalize for errors and warnings
      score -= validation.errors.length * 15
      score -= validation.warnings.length * 5
      
      return {
        ...suggestion,
        validationScore: validation.score,
        finalScore: Math.max(0, score),
        validation
      }
    })

    // Select best suggestion
    const bestSuggestion = scoredSuggestions.reduce((best, current) => 
      current.finalScore > best.finalScore ? current : best
    )

    // Determine if manual review is required
    const requiresReview = 
      bestSuggestion.finalScore < 70 ||
      ruleResults.flags.some(f => f.severity === 'high') ||
      ruleResults.requirements.length > 0

    // Determine if auto-approval is possible
    const autoApproved = 
      bestSuggestion.finalScore >= 95 &&
      bestSuggestion.validation.errors.length === 0 &&
      !requiresReview

    // Combine all flags
    const allFlags = [
      ...ruleResults.flags,
      ...bestSuggestion.validation.errors.map(error => ({
        type: 'accuracy' as const,
        severity: 'high' as const,
        message: error.message,
        ruleId: error.ruleId
      })),
      ...bestSuggestion.validation.warnings.map(warning => ({
        type: 'accuracy' as const,
        severity: 'medium' as const,
        message: warning.message,
        ruleId: warning.ruleId,
        recommendation: warning.suggestion
      }))
    ]

    // Add confidence flag if needed
    if (bestSuggestion.confidence < 80) {
      allFlags.push({
        type: 'confidence',
        severity: bestSuggestion.confidence < 60 ? 'high' : 'medium',
        message: `Classification confidence is ${bestSuggestion.confidence}%`,
        recommendation: 'Consider providing more detailed product information'
      })
    }

    return {
      hsCode: bestSuggestion.hsCode,
      confidence: bestSuggestion.finalScore,
      reasoning: this.buildDecisionReasoning(bestSuggestion, ruleResults),
      source: ruleResults.appliedRules.length > 0 ? 'hybrid' : 'ai',
      appliedRules: ruleResults.appliedRules,
      requiresReview,
      autoApproved,
      flags: allFlags
    }
  }

  private buildDecisionReasoning(
    suggestion: any,
    ruleResults: any
  ): string {
    let reasoning = suggestion.reasoning
    
    if (ruleResults.appliedRules.length > 0) {
      reasoning += `\n\nBusiness rules applied: ${ruleResults.appliedRules.join(', ')}`
    }
    
    if (ruleResults.suggestions.length > 0) {
      reasoning += `\n\nSuggestions: ${ruleResults.suggestions.join('; ')}`
    }
    
    reasoning += `\n\nValidation score: ${suggestion.validationScore}/100`
    reasoning += `\nFinal confidence: ${suggestion.finalScore.toFixed(1)}%`
    
    return reasoning
  }

  private async updateAccuracyMetrics(
    decision: ClassificationDecision,
    context: BusinessLogicContext
  ): Promise<void> {
    // This would typically update metrics in the database
    // For now, we'll just update in-memory metrics
    
    // Update category-specific accuracy if we have historical data
    if (context.productCategory && context.userHistory) {
      const categoryHistory = context.userHistory.filter(
        h => h.productType === context.productCategory
      )
      
      if (categoryHistory.length > 0) {
        const avgAccuracy = categoryHistory.reduce((sum, h) => sum + h.accuracy, 0) / categoryHistory.length
        this.accuracyMetrics.categoryAccuracy[context.productCategory] = avgAccuracy
      }
    }
    
    // Update consistency score based on existing classifications
    if (context.existingClassifications && context.existingClassifications.length > 0) {
      const chapter = decision.hsCode.substring(0, 2)
      const existingChapters = context.existingClassifications.map(
        c => c.hsCode.substring(0, 2)
      )
      
      const isConsistent = existingChapters.includes(chapter)
      this.accuracyMetrics.consistencyScore = isConsistent ? 100 : 50
    }
  }

  // Public methods for rule management
  async addRule(rule: Omit<ClassificationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newRule: ClassificationRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.rules.push(newRule)
    return newRule.id
  }

  async updateRule(ruleId: string, updates: Partial<ClassificationRule>): Promise<boolean> {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId)
    if (ruleIndex === -1) {return false}
    
    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      updatedAt: new Date()
    }
    
    return true
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId)
    if (ruleIndex === -1) {return false}
    
    this.rules.splice(ruleIndex, 1)
    return true
  }

  getRules(): ClassificationRule[] {
    return [...this.rules]
  }

  getAccuracyMetrics(): AccuracyMetrics {
    return { ...this.accuracyMetrics }
  }

  // Method to test rules against sample data
  async testRule(
    ruleId: string,
    testContext: BusinessLogicContext
  ): Promise<{
    matches: boolean
    appliedActions: RuleAction[]
    executionTime: number
  }> {
    const rule = this.rules.find(r => r.id === ruleId)
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`)
    }

    const startTime = Date.now()
    const matches = await this.evaluateRuleConditions(rule.conditions, testContext)
    const executionTime = Date.now() - startTime

    return {
      matches,
      appliedActions: matches ? rule.actions : [],
      executionTime
    }
  }
}

export default ClassificationEngine
export { DEFAULT_CLASSIFICATION_RULES }