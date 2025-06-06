import { SupabaseClient } from '@supabase/supabase-js'
import ConfidenceThresholdManager from '../confidence/threshold-manager'
import { Database } from '../database.types'

type Supabase = SupabaseClient<Database>

export interface FlaggingCriteria {
  confidenceThreshold: number
  inconsistencyThreshold: number
  complexityThreshold: number
  enableHistoricalCheck: boolean
  enableComplianceCheck: boolean
  enableDutyRateCheck: boolean
}

export interface FlaggingResult {
  shouldFlag: boolean
  reasons: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  suggestedAction: 'review' | 'escalate' | 'request-info' | 'expert-review'
  confidence: number
  riskFactors: RiskFactor[]
}

export interface RiskFactor {
  type: 'confidence' | 'inconsistency' | 'complexity' | 'compliance' | 'duty-rate' | 'historical'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: number
  recommendation?: string
}

export interface ClassificationContext {
  productId: string
  hsCode: string
  confidence: number
  productDescription: string
  intendedUse?: string
  materials?: string[]
  countryOfOrigin?: string
  dutyRate?: number
  historicalClassifications?: Array<{
    hsCode: string
    confidence: number
    createdAt: Date
  }>
  complianceFlags?: string[]
}

export class AutomaticFlaggingSystem {
  private supabase: Supabase
  private thresholdManager: ConfidenceThresholdManager
  private criteria: FlaggingCriteria

  constructor(
    supabase: Supabase,
    criteria: Partial<FlaggingCriteria> = {}
  ) {
    this.supabase = supabase
    this.thresholdManager = new ConfidenceThresholdManager()
    this.criteria = {
      confidenceThreshold: 70,
      inconsistencyThreshold: 0.3,
      complexityThreshold: 0.7,
      enableHistoricalCheck: true,
      enableComplianceCheck: true,
      enableDutyRateCheck: true,
      ...criteria
    }
  }

  /**
   * Evaluate if a classification should be flagged for review
   */
  async evaluateClassification(context: ClassificationContext): Promise<FlaggingResult> {
    const riskFactors: RiskFactor[] = []
    const reasons: string[] = []
    let shouldFlag = false
    let priority: FlaggingResult['priority'] = 'low'
    let suggestedAction: FlaggingResult['suggestedAction'] = 'review'

    // 1. Confidence Score Analysis
    const confidenceRisk = this.analyzeConfidenceScore(context.confidence)
    if (confidenceRisk) {
      riskFactors.push(confidenceRisk)
      if (confidenceRisk.severity === 'high' || confidenceRisk.severity === 'critical') {
        shouldFlag = true
        reasons.push(confidenceRisk.description)
      }
    }

    // 2. Historical Consistency Check
    if (this.criteria.enableHistoricalCheck && context.historicalClassifications) {
      const historyRisk = this.analyzeHistoricalConsistency(context)
      if (historyRisk) {
        riskFactors.push(historyRisk)
        if (historyRisk.severity === 'medium' || historyRisk.severity === 'high') {
          shouldFlag = true
          reasons.push(historyRisk.description)
        }
      }
    }

    // 3. Product Complexity Analysis
    const complexityRisk = this.analyzeProductComplexity(context)
    if (complexityRisk) {
      riskFactors.push(complexityRisk)
      if (complexityRisk.severity === 'high') {
        shouldFlag = true
        reasons.push(complexityRisk.description)
      }
    }

    // 4. Compliance Risk Check
    if (this.criteria.enableComplianceCheck && context.complianceFlags) {
      const complianceRisk = this.analyzeComplianceRisk(context.complianceFlags)
      if (complianceRisk) {
        riskFactors.push(complianceRisk)
        if (complianceRisk.severity === 'high' || complianceRisk.severity === 'critical') {
          shouldFlag = true
          reasons.push(complianceRisk.description)
          suggestedAction = 'expert-review'
        }
      }
    }

    // 5. Duty Rate Analysis
    if (this.criteria.enableDutyRateCheck && context.dutyRate !== undefined) {
      const dutyRisk = this.analyzeDutyRate(context.dutyRate, context.hsCode)
      if (dutyRisk) {
        riskFactors.push(dutyRisk)
        if (dutyRisk.severity === 'high') {
          shouldFlag = true
          reasons.push(dutyRisk.description)
        }
      }
    }

    // Determine overall priority and action
    const criticalFactors = riskFactors.filter(f => f.severity === 'critical')
    const highFactors = riskFactors.filter(f => f.severity === 'high')
    const mediumFactors = riskFactors.filter(f => f.severity === 'medium')

    if (criticalFactors.length > 0) {
      priority = 'critical'
      suggestedAction = 'expert-review'
    } else if (highFactors.length > 0) {
      priority = 'high'
      suggestedAction = highFactors.some(f => f.type === 'compliance') ? 'expert-review' : 'escalate'
    } else if (mediumFactors.length > 1) {
      priority = 'medium'
      suggestedAction = 'review'
    } else if (mediumFactors.length === 1) {
      priority = 'low'
      suggestedAction = 'review'
    }

    return {
      shouldFlag,
      reasons,
      priority,
      suggestedAction,
      confidence: context.confidence,
      riskFactors
    }
  }

  /**
   * Automatically add flagged classifications to review queue
   */
  async processAndFlag(
    context: ClassificationContext,
    workspaceId: string,
    classificationId: string
  ): Promise<{ flagged: boolean; reviewQueueId?: string; result: FlaggingResult }> {
    const result = await this.evaluateClassification(context)

    if (result.shouldFlag) {
      const reviewQueueId = await this.addToReviewQueue({
        workspaceId,
        productId: context.productId,
        classificationId,
        confidence: context.confidence,
        reasons: result.reasons,
        priority: result.priority,
        suggestedAction: result.suggestedAction,
        riskFactors: result.riskFactors
      })

      return {
        flagged: true,
        reviewQueueId,
        result
      }
    }

    return {
      flagged: false,
      result
    }
  }

  /**
   * Analyze confidence score and return risk factor if applicable
   */
  private analyzeConfidenceScore(confidence: number): RiskFactor | null {
    if (confidence < 50) {
      return {
        type: 'confidence',
        severity: 'critical',
        description: `Very low confidence score (${confidence.toFixed(1)}%)`,
        impact: 0.9,
        recommendation: 'Requires expert review and additional product information'
      }
    } else if (confidence < this.criteria.confidenceThreshold) {
      return {
        type: 'confidence',
        severity: 'high',
        description: `Low confidence score (${confidence.toFixed(1)}%)`,
        impact: 0.7,
        recommendation: 'Review classification and consider requesting more product details'
      }
    } else if (confidence < 85) {
      return {
        type: 'confidence',
        severity: 'medium',
        description: `Medium confidence score (${confidence.toFixed(1)}%)`,
        impact: 0.4,
        recommendation: 'Consider validation with additional sources'
      }
    }
    return null
  }

  /**
   * Analyze historical classification consistency
   */
  private analyzeHistoricalConsistency(context: ClassificationContext): RiskFactor | null {
    if (!context.historicalClassifications || context.historicalClassifications.length === 0) {
      return null
    }

    const currentChapter = context.hsCode.substring(0, 2)
    const historicalChapters = context.historicalClassifications.map(h => h.hsCode.substring(0, 2))
    const uniqueChapters = new Set(historicalChapters)

    // Check for chapter inconsistency
    if (!historicalChapters.includes(currentChapter) && uniqueChapters.size > 0) {
      return {
        type: 'inconsistency',
        severity: 'high',
        description: `Classification chapter (${currentChapter}) differs from historical patterns (${Array.from(uniqueChapters).join(', ')})`,
        impact: 0.8,
        recommendation: 'Review product description and compare with historical classifications'
      }
    }

    // Check for frequent changes
    if (uniqueChapters.size > 2) {
      return {
        type: 'inconsistency',
        severity: 'medium',
        description: `Multiple different classification chapters used historically (${Array.from(uniqueChapters).join(', ')})`,
        impact: 0.5,
        recommendation: 'Standardize classification approach for this product type'
      }
    }

    return null
  }

  /**
   * Analyze product complexity based on description and attributes
   */
  private analyzeProductComplexity(context: ClassificationContext): RiskFactor | null {
    let complexityScore = 0
    const factors: string[] = []

    // Check description complexity
    const description = context.productDescription.toLowerCase()
    const complexKeywords = ['multi-purpose', 'combination', 'hybrid', 'composite', 'assembly', 'kit', 'set']
    const materialKeywords = ['steel', 'aluminum', 'plastic', 'rubber', 'textile', 'ceramic', 'glass']
    
    if (complexKeywords.some(keyword => description.includes(keyword))) {
      complexityScore += 0.3
      factors.push('multi-purpose or composite product')
    }

    if (context.materials && context.materials.length > 3) {
      complexityScore += 0.2
      factors.push('multiple materials')
    }

    const materialCount = materialKeywords.filter(material => description.includes(material)).length
    if (materialCount > 2) {
      complexityScore += 0.2
      factors.push('complex material composition')
    }

    if (description.length > 500) {
      complexityScore += 0.1
      factors.push('detailed product description')
    }

    if (complexityScore >= this.criteria.complexityThreshold) {
      return {
        type: 'complexity',
        severity: complexityScore > 0.8 ? 'high' : 'medium',
        description: `Complex product requiring careful classification (${factors.join(', ')})`,
        impact: complexityScore,
        recommendation: 'Consider expert review for complex multi-component products'
      }
    }

    return null
  }

  /**
   * Analyze compliance risk factors
   */
  private analyzeComplianceRisk(complianceFlags: string[]): RiskFactor | null {
    const criticalFlags = ['restricted', 'prohibited', 'controlled', 'sanctioned']
    const highRiskFlags = ['dual-use', 'export-controlled', 'license-required']
    const mediumRiskFlags = ['quota', 'anti-dumping', 'countervailing']

    const hasCritical = complianceFlags.some(flag => 
      criticalFlags.some(critical => flag.toLowerCase().includes(critical))
    )
    const hasHighRisk = complianceFlags.some(flag => 
      highRiskFlags.some(high => flag.toLowerCase().includes(high))
    )
    const hasMediumRisk = complianceFlags.some(flag => 
      mediumRiskFlags.some(medium => flag.toLowerCase().includes(medium))
    )

    if (hasCritical) {
      return {
        type: 'compliance',
        severity: 'critical',
        description: `Critical compliance issues detected: ${complianceFlags.join(', ')}`,
        impact: 1.0,
        recommendation: 'Immediate expert review required for compliance verification'
      }
    } else if (hasHighRisk) {
      return {
        type: 'compliance',
        severity: 'high',
        description: `High-risk compliance factors: ${complianceFlags.join(', ')}`,
        impact: 0.8,
        recommendation: 'Expert review recommended for compliance validation'
      }
    } else if (hasMediumRisk) {
      return {
        type: 'compliance',
        severity: 'medium',
        description: `Compliance considerations: ${complianceFlags.join(', ')}`,
        impact: 0.5,
        recommendation: 'Review applicable trade measures and restrictions'
      }
    }

    return null
  }

  /**
   * Analyze duty rate for potential optimization opportunities
   */
  private analyzeDutyRate(dutyRate: number, hsCode: string): RiskFactor | null {
    if (dutyRate > 15) {
      return {
        type: 'duty-rate',
        severity: 'high',
        description: `High duty rate (${dutyRate}%) - potential for optimization`,
        impact: 0.6,
        recommendation: 'Consider alternative classifications or origin optimization'
      }
    } else if (dutyRate > 10) {
      return {
        type: 'duty-rate',
        severity: 'medium',
        description: `Moderate duty rate (${dutyRate}%) - review for optimization`,
        impact: 0.4,
        recommendation: 'Evaluate alternative classification options'
      }
    }

    return null
  }

  /**
   * Add classification to review queue with detailed context
   */
  private async addToReviewQueue(params: {
    workspaceId: string
    productId: string
    classificationId: string
    confidence: number
    reasons: string[]
    priority: string
    suggestedAction: string
    riskFactors: RiskFactor[]
  }): Promise<string | null> {
    try {
      const reason = `${params.reasons.join('; ')} | Priority: ${params.priority} | Action: ${params.suggestedAction}`
      
      const { data, error } = await this.supabase
        .from('review_queue')
        .insert({
          workspace_id: params.workspaceId,
          product_id: params.productId,
          classification_id: params.classificationId,
          confidence_score: params.confidence,
          reason,
          status: 'pending'
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to add to review queue:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Error adding to review queue:', error)
      return null
    }
  }

  /**
   * Update flagging criteria
   */
  updateCriteria(newCriteria: Partial<FlaggingCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria }
  }

  /**
   * Get current flagging criteria
   */
  getCriteria(): FlaggingCriteria {
    return { ...this.criteria }
  }

  /**
   * Batch process multiple classifications for flagging
   */
  async batchProcess(
    contexts: Array<ClassificationContext & { workspaceId: string; classificationId: string }>
  ): Promise<Array<{ productId: string; flagged: boolean; reviewQueueId?: string; result: FlaggingResult }>> {
    const results = []

    for (const context of contexts) {
      const { workspaceId, classificationId, ...classificationContext } = context
      const result = await this.processAndFlag(classificationContext, workspaceId, classificationId)
      results.push({
        productId: context.productId,
        ...result
      })
    }

    return results
  }
}

export default AutomaticFlaggingSystem