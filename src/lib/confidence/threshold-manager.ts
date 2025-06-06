import { createBrowserClient } from '../supabase'

export interface ConfidenceThreshold {
  id: string
  name: string
  description: string
  category?: string
  minConfidence: number
  maxConfidence: number
  action: ThresholdAction
  conditions?: ThresholdCondition[]
  priority: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ThresholdAction {
  type: 'auto-approve' | 'require-review' | 'flag-warning' | 'request-info' | 'escalate' | 'reject'
  parameters?: Record<string, any>
  message: string
  notificationLevel: 'none' | 'low' | 'medium' | 'high'
  assignTo?: string
  deadline?: number // hours
}

export interface ThresholdCondition {
  field: string
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'in' | 'range'
  value: any
  weight?: number
}

export interface ConfidenceAssessment {
  overallConfidence: number
  componentConfidences: {
    aiModel: number
    validation: number
    businessRules: number
    historicalConsistency: number
    userFeedback: number
  }
  factors: ConfidenceFactor[]
  adjustments: ConfidenceAdjustment[]
  finalScore: number
  reliability: 'very-low' | 'low' | 'medium' | 'high' | 'very-high'
}

export interface ConfidenceFactor {
  name: string
  impact: number // -100 to +100
  weight: number // 0 to 1
  description: string
  source: 'ai' | 'validation' | 'rules' | 'history' | 'user'
}

export interface ConfidenceAdjustment {
  reason: string
  adjustment: number
  appliedBy: string
  timestamp: Date
}

export interface ThresholdResult {
  threshold: ConfidenceThreshold
  triggered: boolean
  confidence: number
  action: ThresholdAction
  reasoning: string
  nextSteps: string[]
  estimatedResolutionTime?: number
}

export interface ConfidenceCalibration {
  actualAccuracy: number
  predictedConfidence: number
  calibrationError: number
  sampleSize: number
  category?: string
  timeRange: {
    start: Date
    end: Date
  }
}

// Default confidence thresholds
const DEFAULT_THRESHOLDS: Omit<ConfidenceThreshold, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'auto-approve-high',
    name: 'Auto-Approve High Confidence',
    description: 'Automatically approve classifications with very high confidence',
    minConfidence: 95,
    maxConfidence: 100,
    action: {
      type: 'auto-approve',
      message: 'Classification automatically approved due to high confidence',
      notificationLevel: 'low'
    },
    priority: 1,
    enabled: true
  },
  {
    id: 'review-medium',
    name: 'Review Medium Confidence',
    description: 'Require human review for medium confidence classifications',
    minConfidence: 70,
    maxConfidence: 94,
    action: {
      type: 'require-review',
      message: 'Classification requires human review due to medium confidence',
      notificationLevel: 'medium',
      deadline: 24
    },
    priority: 2,
    enabled: true
  },
  {
    id: 'flag-low',
    name: 'Flag Low Confidence',
    description: 'Flag classifications with low confidence for additional information',
    minConfidence: 50,
    maxConfidence: 69,
    action: {
      type: 'request-info',
      message: 'Additional product information needed to improve classification confidence',
      notificationLevel: 'medium',
      parameters: {
        requiredFields: ['productDescription', 'intendedUse', 'materials']
      }
    },
    priority: 3,
    enabled: true
  },
  {
    id: 'escalate-very-low',
    name: 'Escalate Very Low Confidence',
    description: 'Escalate classifications with very low confidence to experts',
    minConfidence: 0,
    maxConfidence: 49,
    action: {
      type: 'escalate',
      message: 'Classification escalated to expert due to very low confidence',
      notificationLevel: 'high',
      assignTo: 'expert-team',
      deadline: 48
    },
    priority: 4,
    enabled: true
  },
  {
    id: 'electronics-strict',
    name: 'Electronics Strict Review',
    description: 'Stricter thresholds for electronics due to complexity',
    category: 'Electronics',
    minConfidence: 80,
    maxConfidence: 100,
    action: {
      type: 'require-review',
      message: 'Electronics classification requires expert review',
      notificationLevel: 'medium',
      assignTo: 'electronics-specialist'
    },
    conditions: [
      { field: 'category', operator: 'equals', value: 'Electronics' }
    ],
    priority: 1,
    enabled: true
  },
  {
    id: 'high-value-review',
    name: 'High Value Product Review',
    description: 'Additional review for high-value products regardless of confidence',
    minConfidence: 0,
    maxConfidence: 100,
    action: {
      type: 'require-review',
      message: 'High-value product requires additional verification',
      notificationLevel: 'medium'
    },
    conditions: [
      { field: 'productValue', operator: 'greater', value: 10000 }
    ],
    priority: 2,
    enabled: true
  }
]

// Confidence factors that affect the overall score
const CONFIDENCE_FACTORS = {
  // Positive factors
  CLEAR_PRODUCT_DESCRIPTION: { impact: 15, weight: 0.2, description: 'Product description is clear and detailed' },
  CONSISTENT_HISTORY: { impact: 20, weight: 0.15, description: 'Consistent with previous classifications' },
  HIGH_AI_CONFIDENCE: { impact: 25, weight: 0.3, description: 'AI model shows high confidence' },
  VALIDATION_PASSED: { impact: 10, weight: 0.1, description: 'All validation rules passed' },
  EXPERT_VERIFIED: { impact: 30, weight: 0.25, description: 'Previously verified by expert' },
  COMMON_PRODUCT: { impact: 10, weight: 0.1, description: 'Common product type with established patterns' },
  COMPLETE_INFORMATION: { impact: 15, weight: 0.15, description: 'All required product information provided' },
  
  // Negative factors
  AMBIGUOUS_DESCRIPTION: { impact: -20, weight: 0.2, description: 'Product description is ambiguous or unclear' },
  INCONSISTENT_HISTORY: { impact: -25, weight: 0.15, description: 'Inconsistent with previous classifications' },
  LOW_AI_CONFIDENCE: { impact: -30, weight: 0.3, description: 'AI model shows low confidence' },
  VALIDATION_FAILED: { impact: -15, weight: 0.15, description: 'Validation rules failed' },
  NOVEL_PRODUCT: { impact: -10, weight: 0.1, description: 'Novel or unusual product type' },
  MISSING_INFORMATION: { impact: -20, weight: 0.2, description: 'Missing critical product information' },
  CONFLICTING_SIGNALS: { impact: -25, weight: 0.2, description: 'Conflicting classification signals detected' }
}

class ConfidenceThresholdManager {
  private supabase = createBrowserClient()
  private thresholds: ConfidenceThreshold[] = []
  private calibrationData: Map<string, ConfidenceCalibration[]> = new Map()

  constructor() {
    this.initializeThresholds()
  }

  private initializeThresholds(): void {
    const now = new Date()
    this.thresholds = DEFAULT_THRESHOLDS.map(threshold => ({
      ...threshold,
      createdAt: now,
      updatedAt: now
    }))
  }

  async assessConfidence(
    aiConfidence: number,
    validationScore: number,
    businessRuleScore: number,
    context: {
      productDescription?: string
      category?: string
      productValue?: number
      historicalClassifications?: Array<{ hsCode: string; confidence: number }>
      userFeedback?: Array<{ rating: number; comment: string }>
      missingFields?: string[]
    }
  ): Promise<ConfidenceAssessment> {
    // Calculate component confidences
    const componentConfidences = {
      aiModel: aiConfidence,
      validation: validationScore,
      businessRules: businessRuleScore,
      historicalConsistency: this.calculateHistoricalConsistency(context.historicalClassifications),
      userFeedback: this.calculateUserFeedbackScore(context.userFeedback)
    }

    // Identify confidence factors
    const factors = this.identifyConfidenceFactors(context, componentConfidences)
    
    // Calculate weighted confidence score
    const baseConfidence = this.calculateWeightedConfidence(componentConfidences)
    
    // Apply factor adjustments
    const factorAdjustment = this.calculateFactorAdjustment(factors)
    
    // Apply any manual adjustments
    const adjustments = await this.getManualAdjustments(context)
    const manualAdjustment = adjustments.reduce((sum, adj) => sum + adj.adjustment, 0)
    
    // Calculate final score
    const finalScore = Math.max(0, Math.min(100, baseConfidence + factorAdjustment + manualAdjustment))
    
    // Determine reliability level
    const reliability = this.determineReliability(finalScore, factors)
    
    return {
      overallConfidence: baseConfidence,
      componentConfidences,
      factors,
      adjustments,
      finalScore,
      reliability
    }
  }

  async evaluateThresholds(
    confidence: number,
    context: {
      category?: string
      productValue?: number
      userRole?: string
      [key: string]: any
    }
  ): Promise<ThresholdResult[]> {
    const results: ThresholdResult[] = []
    
    // Sort thresholds by priority
    const sortedThresholds = this.thresholds
      .filter(t => t.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const threshold of sortedThresholds) {
      // Check if confidence falls within threshold range
      if (confidence < threshold.minConfidence || confidence > threshold.maxConfidence) {
        continue
      }

      // Check additional conditions
      if (threshold.conditions && !this.evaluateConditions(threshold.conditions, context)) {
        continue
      }

      // Check category-specific thresholds
      if (threshold.category && threshold.category !== context.category) {
        continue
      }

      const result: ThresholdResult = {
        threshold,
        triggered: true,
        confidence,
        action: threshold.action,
        reasoning: this.buildThresholdReasoning(threshold, confidence, context),
        nextSteps: this.generateNextSteps(threshold.action),
        estimatedResolutionTime: this.estimateResolutionTime(threshold.action)
      }

      results.push(result)

      // If this is a blocking action, don't evaluate further thresholds
      if (['reject', 'escalate', 'require-review'].includes(threshold.action.type)) {
        break
      }
    }

    return results
  }

  private calculateHistoricalConsistency(
    historicalClassifications?: Array<{ hsCode: string; confidence: number }>
  ): number {
    if (!historicalClassifications || historicalClassifications.length === 0) {
      return 50 // Neutral score when no history
    }

    // Calculate consistency based on HS code chapters
    const chapters = historicalClassifications.map(h => h.hsCode.substring(0, 2))
    const uniqueChapters = new Set(chapters)
    
    // More consistent if classifications fall within same chapters
    const consistencyRatio = 1 - (uniqueChapters.size - 1) / chapters.length
    
    // Weight by average confidence of historical classifications
    const avgHistoricalConfidence = historicalClassifications.reduce(
      (sum, h) => sum + h.confidence, 0
    ) / historicalClassifications.length
    
    return Math.min(100, consistencyRatio * avgHistoricalConfidence)
  }

  private calculateUserFeedbackScore(
    userFeedback?: Array<{ rating: number; comment: string }>
  ): number {
    if (!userFeedback || userFeedback.length === 0) {
      return 50 // Neutral score when no feedback
    }

    const avgRating = userFeedback.reduce((sum, f) => sum + f.rating, 0) / userFeedback.length
    return (avgRating / 5) * 100 // Convert 1-5 rating to 0-100 scale
  }

  private identifyConfidenceFactors(
    context: any,
    componentConfidences: any
  ): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = []

    // Check product description quality
    if (context.productDescription) {
      const descLength = context.productDescription.length
      const wordCount = context.productDescription.split(/\s+/).length
      
      if (descLength > 100 && wordCount > 15) {
        factors.push({
          name: 'CLEAR_PRODUCT_DESCRIPTION',
          ...CONFIDENCE_FACTORS.CLEAR_PRODUCT_DESCRIPTION,
          source: 'user'
        })
      } else if (descLength < 50 || wordCount < 8) {
        factors.push({
          name: 'AMBIGUOUS_DESCRIPTION',
          ...CONFIDENCE_FACTORS.AMBIGUOUS_DESCRIPTION,
          source: 'user'
        })
      }
    }

    // Check AI confidence level
    if (componentConfidences.aiModel >= 90) {
      factors.push({
        name: 'HIGH_AI_CONFIDENCE',
        ...CONFIDENCE_FACTORS.HIGH_AI_CONFIDENCE,
        source: 'ai'
      })
    } else if (componentConfidences.aiModel < 60) {
      factors.push({
        name: 'LOW_AI_CONFIDENCE',
        ...CONFIDENCE_FACTORS.LOW_AI_CONFIDENCE,
        source: 'ai'
      })
    }

    // Check validation results
    if (componentConfidences.validation >= 90) {
      factors.push({
        name: 'VALIDATION_PASSED',
        ...CONFIDENCE_FACTORS.VALIDATION_PASSED,
        source: 'validation'
      })
    } else if (componentConfidences.validation < 70) {
      factors.push({
        name: 'VALIDATION_FAILED',
        ...CONFIDENCE_FACTORS.VALIDATION_FAILED,
        source: 'validation'
      })
    }

    // Check historical consistency
    if (componentConfidences.historicalConsistency >= 80) {
      factors.push({
        name: 'CONSISTENT_HISTORY',
        ...CONFIDENCE_FACTORS.CONSISTENT_HISTORY,
        source: 'history'
      })
    } else if (componentConfidences.historicalConsistency < 40) {
      factors.push({
        name: 'INCONSISTENT_HISTORY',
        ...CONFIDENCE_FACTORS.INCONSISTENT_HISTORY,
        source: 'history'
      })
    }

    // Check for missing information
    if (context.missingFields && context.missingFields.length > 0) {
      factors.push({
        name: 'MISSING_INFORMATION',
        impact: CONFIDENCE_FACTORS.MISSING_INFORMATION.impact * context.missingFields.length,
        ...CONFIDENCE_FACTORS.MISSING_INFORMATION,
        source: 'user'
      })
    }

    return factors
  }

  private calculateWeightedConfidence(componentConfidences: any): number {
    const weights = {
      aiModel: 0.4,
      validation: 0.2,
      businessRules: 0.2,
      historicalConsistency: 0.1,
      userFeedback: 0.1
    }

    return Object.entries(componentConfidences).reduce(
      (sum, [component, confidence]) => {
        const weight = weights[component as keyof typeof weights] || 0
        return sum + (confidence as number) * weight
      },
      0
    )
  }

  private calculateFactorAdjustment(factors: ConfidenceFactor[]): number {
    return factors.reduce((sum, factor) => {
      return sum + (factor.impact * factor.weight)
    }, 0)
  }

  private async getManualAdjustments(context: any): Promise<ConfidenceAdjustment[]> {
    // In a real implementation, this would fetch from database
    return []
  }

  private determineReliability(
    finalScore: number,
    factors: ConfidenceFactor[]
  ): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
    const negativeFactors = factors.filter(f => f.impact < 0).length
    const positiveFactors = factors.filter(f => f.impact > 0).length
    
    if (finalScore >= 95 && negativeFactors === 0) {return 'very-high'}
    if (finalScore >= 85 && negativeFactors <= 1) {return 'high'}
    if (finalScore >= 70 && negativeFactors <= 2) {return 'medium'}
    if (finalScore >= 50) {return 'low'}
    return 'very-low'
  }

  private evaluateConditions(
    conditions: ThresholdCondition[],
    context: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const value = context[condition.field]
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value
        case 'greater':
          return Number(value) > Number(condition.value)
        case 'less':
          return Number(value) < Number(condition.value)
        case 'contains':
          return String(value).includes(String(condition.value))
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value)
        case 'range':
          const numValue = Number(value)
          return numValue >= condition.value.min && numValue <= condition.value.max
        default:
          return false
      }
    })
  }

  private buildThresholdReasoning(
    threshold: ConfidenceThreshold,
    confidence: number,
    context: any
  ): string {
    let reasoning = `Confidence score of ${confidence.toFixed(1)}% falls within the ${threshold.name} threshold (${threshold.minConfidence}-${threshold.maxConfidence}%).`
    
    if (threshold.conditions) {
      reasoning += ` Additional conditions were met: ${threshold.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}.`
    }
    
    if (threshold.category) {
      reasoning += ` Category-specific threshold applied for ${threshold.category}.`
    }
    
    return reasoning
  }

  private generateNextSteps(action: ThresholdAction): string[] {
    const steps: string[] = []
    
    switch (action.type) {
      case 'auto-approve':
        steps.push('Classification has been automatically approved')
        steps.push('No further action required')
        break
      
      case 'require-review':
        steps.push('Submit classification for human review')
        if (action.assignTo) {
          steps.push(`Assign to: ${action.assignTo}`)
        }
        if (action.deadline) {
          steps.push(`Review deadline: ${action.deadline} hours`)
        }
        break
      
      case 'request-info':
        steps.push('Request additional product information')
        if (action.parameters?.requiredFields) {
          steps.push(`Required fields: ${action.parameters.requiredFields.join(', ')}`)
        }
        break
      
      case 'escalate':
        steps.push('Escalate to expert team')
        steps.push('Provide detailed product documentation')
        if (action.deadline) {
          steps.push(`Expert review deadline: ${action.deadline} hours`)
        }
        break
      
      case 'flag-warning':
        steps.push('Classification flagged with warning')
        steps.push('Proceed with caution')
        break
      
      case 'reject':
        steps.push('Classification rejected')
        steps.push('Review and resubmit with additional information')
        break
    }
    
    return steps
  }

  private estimateResolutionTime(action: ThresholdAction): number {
    const baseTimes: Record<string, number> = {
      'auto-approve': 0,
      'require-review': 24,
      'request-info': 48,
      'escalate': 72,
      'flag-warning': 4,
      'reject': 24
    }
    
    return action.deadline || baseTimes[action.type] || 24
  }

  // Public methods for threshold management
  async addThreshold(threshold: Omit<ConfidenceThreshold, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newThreshold: ConfidenceThreshold = {
      ...threshold,
      id: `threshold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.thresholds.push(newThreshold)
    return newThreshold.id
  }

  async updateThreshold(thresholdId: string, updates: Partial<ConfidenceThreshold>): Promise<boolean> {
    const index = this.thresholds.findIndex(t => t.id === thresholdId)
    if (index === -1) {return false}
    
    this.thresholds[index] = {
      ...this.thresholds[index],
      ...updates,
      updatedAt: new Date()
    }
    
    return true
  }

  async deleteThreshold(thresholdId: string): Promise<boolean> {
    const index = this.thresholds.findIndex(t => t.id === thresholdId)
    if (index === -1) {return false}
    
    this.thresholds.splice(index, 1)
    return true
  }

  getThresholds(category?: string): ConfidenceThreshold[] {
    if (category) {
      return this.thresholds.filter(t => !t.category || t.category === category)
    }
    return [...this.thresholds]
  }

  // Calibration methods
  async updateCalibration(
    predictedConfidence: number,
    actualAccuracy: number,
    category?: string
  ): Promise<void> {
    const key = category || 'general'
    const calibrations = this.calibrationData.get(key) || []
    
    calibrations.push({
      actualAccuracy,
      predictedConfidence,
      calibrationError: Math.abs(predictedConfidence - actualAccuracy),
      sampleSize: 1,
      category,
      timeRange: {
        start: new Date(),
        end: new Date()
      }
    })
    
    this.calibrationData.set(key, calibrations)
  }

  getCalibrationMetrics(category?: string): {
    averageCalibrationError: number
    reliability: number
    sampleSize: number
  } {
    const key = category || 'general'
    const calibrations = this.calibrationData.get(key) || []
    
    if (calibrations.length === 0) {
      return {
        averageCalibrationError: 0,
        reliability: 0,
        sampleSize: 0
      }
    }
    
    const avgError = calibrations.reduce((sum, c) => sum + c.calibrationError, 0) / calibrations.length
    const reliability = Math.max(0, 100 - avgError)
    
    return {
      averageCalibrationError: avgError,
      reliability,
      sampleSize: calibrations.length
    }
  }
}

export default ConfidenceThresholdManager
export { DEFAULT_THRESHOLDS, CONFIDENCE_FACTORS }