import { createBrowserClient } from '../supabase'
import { decryptApiKey } from '../encryption/api-key-encryption'
import OpenAI from '../openai-mock'
import Anthropic from '../anthropic-mock'
import HSCodeValidator, { ValidationContext, ValidationResult } from '../validation/hs-code-validation'
import ClassificationEngine, { BusinessLogicContext, ClassificationDecision } from '../business-logic/classification-engine'
import TradeComplianceChecker, { ComplianceCheck, ComplianceResult } from '../compliance/trade-compliance'
import ConfidenceThresholdManager, { ConfidenceAssessment, ThresholdResult } from '../confidence/threshold-manager'

export interface EnhancedClassificationRequest {
  productDescription: string
  productName?: string
  productCategory?: string
  originCountry?: string
  destinationCountry?: string
  value?: number
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  materials?: string[]
  manufacturer?: string
  brandName?: string
  model?: string
  intendedUse?: string
  images?: string[]
  imageUrl?: string
  existingHsCode?: string
  additionalContext?: string
  userPreferences?: {
    conservativeApproach?: boolean
    prioritizeDutyOptimization?: boolean
    requireExpertReview?: boolean
  }
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

export interface ClassificationSource {
  name: 'openai' | 'anthropic' | 'zonos' | 'customs'
  priority: number
  enabled: boolean
  confidenceWeight: number
}

export interface AlternativeCode {
  code: string
  confidence: number
  description: string
  reasoning: string
}

export interface EnhancedClassificationResult {
  // Primary classification
  hsCode: string
  confidence: number
  description: string
  reasoning: string
  source: string
  
  // Alternative suggestions
  alternativeCodes: AlternativeCode[]
  alternatives: Array<{
    hsCode: string
    confidence: number
    reasoning: string
  }>
  
  // Image analysis
  imageAnalysis?: {
    detected: boolean
    confidence: number
    features: string[]
  }
  
  // Comprehensive validation results
  validationResults: {
    formatValid: boolean
    categoryMatch: boolean
    countryCompliant: boolean
    warnings: string[]
  }
  validationResult: ValidationResult
  
  // Business logic decision
  businessDecision: ClassificationDecision
  
  // Compliance assessment
  complianceResult: ComplianceResult
  
  // Confidence assessment
  confidenceAssessment: ConfidenceAssessment
  
  // Threshold evaluation results
  thresholdResults: ThresholdResult[]
  
  // Processing metadata
  processingTime: number
  modelVersion: string
  metadata: {
    model: string
    processingTime: number
    tokensUsed: number
    cost: number
    validationScore: number
    businessRuleScore: number
    finalDecision: 'approved' | 'review-required' | 'rejected' | 'escalated'
  }
  
  // Legacy compatibility
  dutyInformation?: {
    estimatedRate: number
    currency: string
    additionalFees: Array<{
      type: string
      amount: number
    }>
  }
  
  complianceFlags?: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    message: string
  }>
}

export interface EnhancedClassificationResponse {
  success: boolean
  result?: EnhancedClassificationResult
  error?: string
  fallbackUsed?: boolean
  sourcesAttempted: string[]
  totalProcessingTime: number
}

class EnhancedAIClassifier {
  private supabase = createBrowserClient()
  private validator: HSCodeValidator
  private businessEngine: ClassificationEngine
  private complianceChecker: TradeComplianceChecker
  private confidenceManager: ConfidenceThresholdManager
  private sources: ClassificationSource[] = [
    { name: 'openai', priority: 1, enabled: true, confidenceWeight: 1.0 },
    { name: 'anthropic', priority: 2, enabled: true, confidenceWeight: 0.95 },
    { name: 'zonos', priority: 3, enabled: true, confidenceWeight: 0.9 },
    { name: 'customs', priority: 4, enabled: false, confidenceWeight: 1.0 }
  ]

  constructor() {
    this.validator = new HSCodeValidator()
    this.businessEngine = new ClassificationEngine()
    this.complianceChecker = new TradeComplianceChecker()
    this.confidenceManager = new ConfidenceThresholdManager()
  }

  /**
   * Enhanced classification with multiple AI models and improved confidence scoring
   */
  async classify(request: EnhancedClassificationRequest): Promise<EnhancedClassificationResponse> {
    const startTime = Date.now()
    const sourcesAttempted: string[] = []
    let bestResult: EnhancedClassificationResult | null = null
    let fallbackUsed = false

    // Sort sources by priority
    const enabledSources = this.sources
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority)

    for (const source of enabledSources) {
      try {
        sourcesAttempted.push(source.name)
        const result = await this.classifyWithSource(request, source)
        
        if (result) {
          // Apply confidence weighting
          const adjustedConfidence = result.confidence * source.confidenceWeight
          result.confidence = Math.min(adjustedConfidence, 100)
          
          // If confidence is high enough, use this result
          if (result.confidence >= 75) {
            bestResult = result
            break
          }
          
          // Keep track of best result so far
          if (!bestResult || result.confidence > bestResult.confidence) {
            bestResult = result
            fallbackUsed = sourcesAttempted.length > 1
          }
        }
      } catch (error) {
        console.error(`Classification failed for source ${source.name}:`, error)
        continue
      }
    }

    const totalProcessingTime = Date.now() - startTime

    if (!bestResult) {
      return {
        success: false,
        error: 'All classification sources failed',
        fallbackUsed: false,
        sourcesAttempted,
        totalProcessingTime
      }
    }

    // Step 4: Comprehensive validation
    const validationContext: ValidationContext = {
      hsCode: bestResult.hsCode,
      productDescription: request.productDescription,
      productCategory: request.productCategory,
      originCountry: request.originCountry,
      destinationCountry: request.destinationCountry,
      confidence: bestResult.confidence,
      existingClassifications: request.existingClassifications?.map(c => c.hsCode)
    }
    
    const validationResult = await this.validator.validateHSCode(validationContext)
    
    // Step 5: Business logic processing
    const businessContext: BusinessLogicContext = {
      productDescription: request.productDescription,
      productName: request.productName,
      productCategory: request.productCategory,
      originCountry: request.originCountry,
      destinationCountry: request.destinationCountry,
      value: request.value,
      weight: request.weight,
      dimensions: request.dimensions,
      materials: request.materials,
      manufacturer: request.manufacturer,
      brandName: request.brandName,
      model: request.model,
      intendedUse: request.intendedUse,
      existingClassifications: request.existingClassifications,
      userHistory: request.userHistory
    }
    
    const aiSuggestions = [{
      hsCode: bestResult.hsCode,
      confidence: bestResult.confidence,
      reasoning: bestResult.reasoning
    }]
    
    const businessDecision = await this.businessEngine.processClassification(
      businessContext,
      aiSuggestions
    )
    
    // Step 6: Compliance checking
    const complianceCheck: ComplianceCheck = {
      hsCode: businessDecision.hsCode,
      originCountry: request.originCountry || 'XX',
      destinationCountry: request.destinationCountry || 'XX',
      productValue: request.value,
      productWeight: request.weight,
      intendedUse: request.intendedUse
    }
    
    const complianceResult = await this.complianceChecker.checkCompliance(complianceCheck)
    
    // Step 7: Confidence assessment
    const confidenceAssessment = await this.confidenceManager.assessConfidence(
      bestResult.confidence,
      validationResult.score,
      businessDecision.confidence,
      {
        productDescription: request.productDescription,
        category: request.productCategory,
        productValue: request.value,
        historicalClassifications: request.existingClassifications,
        userFeedback: request.userHistory?.map(h => ({ rating: h.accuracy / 20, comment: '' })),
        missingFields: this.identifyMissingFields(request)
      }
    )
    
    // Step 8: Threshold evaluation
    const thresholdResults = await this.confidenceManager.evaluateThresholds(
      confidenceAssessment.finalScore,
      {
        category: request.productCategory,
        productValue: request.value
      }
    )
    
    // Step 9: Determine final decision
    const finalDecision = this.determineFinalDecision(thresholdResults, complianceResult)
    
    // Enhance result with all new components
    bestResult.validationResult = validationResult
    bestResult.businessDecision = businessDecision
    bestResult.complianceResult = complianceResult
    bestResult.confidenceAssessment = confidenceAssessment
    bestResult.thresholdResults = thresholdResults
    bestResult.validationResults = await this.validateClassification(bestResult, request)
    bestResult.processingTime = totalProcessingTime
    
    // Update metadata with final decision
    if (!bestResult.metadata) {
      bestResult.metadata = {
        model: bestResult.source,
        processingTime: totalProcessingTime,
        tokensUsed: 0,
        cost: 0,
        validationScore: validationResult.score,
        businessRuleScore: businessDecision.confidence,
        finalDecision
      }
    } else {
      bestResult.metadata.finalDecision = finalDecision
      bestResult.metadata.validationScore = validationResult.score
      bestResult.metadata.businessRuleScore = businessDecision.confidence
    }

    return {
      success: true,
      result: bestResult,
      fallbackUsed,
      sourcesAttempted,
      totalProcessingTime
    }
  }

  /**
   * Identify missing fields in the request
   */
  private identifyMissingFields(request: EnhancedClassificationRequest): string[] {
    const missingFields: string[] = []
    
    if (!request.productName) {missingFields.push('productName')}
    if (!request.productCategory) {missingFields.push('productCategory')}
    if (!request.originCountry) {missingFields.push('originCountry')}
    if (!request.destinationCountry) {missingFields.push('destinationCountry')}
    if (!request.value) {missingFields.push('value')}
    if (!request.weight) {missingFields.push('weight')}
    if (!request.materials || request.materials.length === 0) {missingFields.push('materials')}
    if (!request.intendedUse) {missingFields.push('intendedUse')}
    
    return missingFields
  }

  /**
   * Determine final decision based on thresholds and compliance
   */
  private determineFinalDecision(
    thresholdResults: ThresholdResult[],
    complianceResult: ComplianceResult
  ): 'approved' | 'review-required' | 'rejected' | 'escalated' {
    // Check for high-risk compliance issues
    if (complianceResult.riskLevel === 'high') {
      return 'escalated'
    }
    
    // Check threshold results
    const hasFailedThreshold = thresholdResults.some(result => result.triggered)
    if (hasFailedThreshold) {
      const criticalFailure = thresholdResults.some(result => 
        result.triggered && (result.threshold.action.type === 'reject' || result.threshold.action.type === 'escalate')
      )
      return criticalFailure ? 'rejected' : 'review-required'
    }
    
    // Check for medium risk compliance issues
    if (complianceResult.riskLevel === 'medium') {
      return 'review-required'
    }
    
    return 'approved'
  }

  /**
   * Classify with a specific source
   */
  private async classifyWithSource(
    request: EnhancedClassificationRequest, 
    source: ClassificationSource
  ): Promise<EnhancedClassificationResult | null> {
    switch (source.name) {
      case 'openai':
        return await this.classifyWithOpenAI(request)
      case 'anthropic':
        return await this.classifyWithAnthropic(request)
      case 'zonos':
        return await this.classifyWithZonos(request)
      case 'customs':
        return await this.classifyWithCustoms(request)
      default:
        return null
    }
  }

  /**
   * Enhanced OpenAI classification with image support
   */
  private async classifyWithOpenAI(request: EnhancedClassificationRequest): Promise<EnhancedClassificationResult | null> {
    try {
      const apiKey = await this.getApiKey('openai')
      if (!apiKey) {return null}

      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
      const prompt = this.buildEnhancedPrompt(request)
      
      const messages: any[] = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ]

      // Add image analysis if image URL provided
      if (request.imageUrl) {
        messages[1].content = [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: request.imageUrl } }
        ]
      }

      const response = await openai.chat.completions.create({
        model: request.imageUrl ? 'gpt-4-vision-preview' : 'gpt-4-turbo-preview',
        messages,
        temperature: 0.1,
        max_tokens: 2000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {throw new Error('No response from OpenAI')}

      const parsed = JSON.parse(content)
      return {
        ...parsed,
        source: 'openai',
        modelVersion: 'gpt-4-turbo-preview'
      }
    } catch (error) {
      console.error('Enhanced OpenAI classification error:', error)
      return null
    }
  }

  /**
   * Enhanced Anthropic classification
   */
  private async classifyWithAnthropic(request: EnhancedClassificationRequest): Promise<EnhancedClassificationResult | null> {
    try {
      const apiKey = await this.getApiKey('anthropic')
      if (!apiKey) {return null}

      const anthropic = new Anthropic({ apiKey })
      const prompt = this.buildEnhancedPrompt(request)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.1,
        system: this.getSystemPrompt(),
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const content = response.content[0]?.text
      if (!content) {throw new Error('No response from Anthropic')}

      const parsed = JSON.parse(content)
      return {
        ...parsed,
        source: 'anthropic',
        modelVersion: 'claude-3-sonnet-20240229'
      }
    } catch (error) {
      console.error('Enhanced Anthropic classification error:', error)
      return null
    }
  }

  /**
   * Zonos API classification (placeholder)
   */
  private async classifyWithZonos(request: EnhancedClassificationRequest): Promise<EnhancedClassificationResult | null> {
    // Mock implementation - replace with actual Zonos API integration
    console.log(`Mock classifyWithZonos called for: ${request.productDescription.substring(0,30)}...`);
    // Simulate a delay and a possible null response or a basic result
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    if (Math.random() < 0.3) return null; // Simulate occasional failure

    return {
      hsCode: '999999', // Placeholder Zonos HS Code
      confidence: 65,
      description: 'Mock classification from Zonos API',
      reasoning: 'Based on Zonos API mock lookup (fictional).',
      source: 'zonos',
      alternativeCodes: [],
      alternatives: [],
      validationResult: {} as ValidationResult, // Placeholder, will be filled later
      businessDecision: {} as ClassificationDecision, // Placeholder
      complianceResult: {} as ComplianceResult, // Placeholder
      confidenceAssessment: {} as ConfidenceAssessment, // Placeholder
      thresholdResults: [], // Placeholder
      validationResults: { formatValid: true, categoryMatch: true, countryCompliant: true, warnings: [] }, // Basic valid placeholder
      processingTime: 100,
      modelVersion: 'zonos-mock-v1',
      metadata: {
        model: 'zonos-mock-v1',
        processingTime: 100,
        tokensUsed: 0, // Mock, no actual tokens
        cost: 0, // Mock
        validationScore: 0, // Placeholder
        businessRuleScore: 0, // Placeholder
        finalDecision: 'review-required' // Default mock decision
      }
    }
  }

  /**
   * Customs database classification (placeholder)
   */
  private async classifyWithCustoms(request: EnhancedClassificationRequest): Promise<EnhancedClassificationResult | null> {
    // Mock implementation - replace with actual customs database integration
    console.log(`Mock classifyWithCustoms called for: ${request.productDescription.substring(0,30)}...`);
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB lookup delay
    if (Math.random() < 0.1) return null; // Simulate occasional failure

    return {
      hsCode: '000000', // Placeholder Customs DB HS Code
      confidence: 90, // Typically higher confidence from direct DB lookup
      description: 'Mock classification from Customs Database',
      reasoning: 'Direct match found in mock Customs Database.',
      source: 'customs',
      alternativeCodes: [],
      alternatives: [],
      validationResult: {} as ValidationResult, // Placeholder
      businessDecision: {} as ClassificationDecision, // Placeholder
      complianceResult: {} as ComplianceResult, // Placeholder
      confidenceAssessment: {} as ConfidenceAssessment, // Placeholder
      thresholdResults: [], // Placeholder
      validationResults: { formatValid: true, categoryMatch: true, countryCompliant: true, warnings: [] }, // Basic valid placeholder
      processingTime: 50,
      modelVersion: 'customs-db-mock-v1',
      metadata: {
        model: 'customs-db-mock-v1',
        processingTime: 50,
        tokensUsed: 0,
        cost: 0,
        validationScore: 0,
        businessRuleScore: 0,
        finalDecision: 'approved' // Default mock decision
      }
    }
  }

  /**
   * Build enhanced prompt with more context
   */
  private buildEnhancedPrompt(request: EnhancedClassificationRequest): string {
    let prompt = `Classify the following product for HS code determination:\n\n`
    
    if (request.productName) {
      prompt += `Product Name: ${request.productName}\n`
    }
    
    prompt += `Product Description: ${request.productDescription}\n`
    
    if (request.productCategory) {
      prompt += `Product Category: ${request.productCategory}\n`
    }
    
    if (request.originCountry) {
      prompt += `Origin Country: ${request.originCountry}\n`
    }
    
    if (request.destinationCountry) {
      prompt += `Destination Country: ${request.destinationCountry}\n`
    }
    
    if (request.existingHsCode) {
      prompt += `Existing HS Code (for reference): ${request.existingHsCode}\n`
    }
    
    if (request.additionalContext) {
      prompt += `Additional Context: ${request.additionalContext}\n`
    }
    
    prompt += `\nPlease provide a detailed classification analysis.`
    
    if (request.imageUrl) {
      prompt += ` Analyze the provided image to enhance classification accuracy.`
    }
    
    return prompt
  }

  /**
   * Enhanced system prompt for better classification
   */
  private getSystemPrompt(): string {
    return `You are an expert in international trade and HS (Harmonized System) code classification with deep knowledge of:
    - WCO Harmonized System nomenclature
    - Trade regulations and compliance
    - Product categorization and material composition
    - Country-specific trade rules
    
    Provide accurate HS code classifications with detailed reasoning. Always respond in valid JSON format:
    {
      "hsCode": "string (6-digit HS code)",
      "confidence": number (0-100, be conservative with high scores),
      "description": "string (official HS code description)",
      "reasoning": "string (detailed explanation of classification logic)",
      "alternativeCodes": [
        {
          "code": "string",
          "confidence": number,
          "description": "string",
          "reasoning": "string"
        }
      ],
      "imageAnalysis": {
        "detected": boolean,
        "confidence": number,
        "features": ["string array of detected features"]
      }
    }
    
    Guidelines:
    - Be conservative with confidence scores
    - Provide 2-3 alternative codes when uncertain
    - Include detailed reasoning for classification decisions
    - Consider material composition, intended use, and manufacturing process
    - Flag potential compliance issues or special considerations`
  }

  /**
   * Validate classification result
   */
  private async validateClassification(
    result: EnhancedClassificationResult, 
    request: EnhancedClassificationRequest
  ): Promise<any> {
    const warnings: string[] = []
    
    // Format validation
    const formatValid = /^\d{6}(\.\d{2}(\.\d{2})?)?$/.test(result.hsCode)
    if (!formatValid) {
      warnings.push('HS code format is invalid')
    }
    
    // Category matching (simplified)
    const categoryMatch = request.productCategory ? 
      this.checkCategoryMatch(result.hsCode, request.productCategory) : true
    
    // Country compliance (placeholder)
    const countryCompliant = true
    
    // Confidence warnings
    if (result.confidence < 70) {
      warnings.push('Low confidence classification - consider manual review')
    }
    
    return {
      formatValid,
      categoryMatch,
      countryCompliant,
      warnings
    }
  }

  /**
   * Check if HS code matches expected category
   */
  private checkCategoryMatch(hsCode: string, category: string): boolean {
    // Simplified category matching - would be more sophisticated in production
    const categoryMap: { [key: string]: string[] } = {
      'Electronics': ['84', '85'],
      'Textiles': ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63'],
      'Machinery': ['84'],
      'Chemicals': ['28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38']
    }
    
    const expectedChapters = categoryMap[category] || []
    const hsChapter = hsCode.substring(0, 2)
    
    return expectedChapters.length === 0 || expectedChapters.includes(hsChapter)
  }

  /**
   * Get decrypted API key for a specific service
   */
  private async getApiKey(service: 'openai' | 'anthropic' | 'zonos' | 'customs'): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {throw new Error('User not authenticated')}

      const { data: apiKeyData, error } = await this.supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('service_name', service)
        .eq('is_active', true)
        .single()

      if (error || !apiKeyData) {
        console.warn(`No API key found for service: ${service}`)
        return null
      }

      return decryptApiKey(apiKeyData.api_key)
    } catch (error) {
      console.error(`Error getting API key for ${service}:`, error)
      return null
    }
  }

  /**
   * Batch classification with enhanced processing
   */
  async classifyBatch(requests: EnhancedClassificationRequest[]): Promise<EnhancedClassificationResponse[]> {
    const results: EnhancedClassificationResponse[] = []
    
    // Process in parallel with concurrency limit
    const concurrencyLimit = 3
    const chunks = this.chunkArray(requests, concurrencyLimit)
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(request => this.classify(request))
      )
      results.push(...chunkResults)
    }
    
    return results
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

export const enhancedAIClassifier = new EnhancedAIClassifier()
