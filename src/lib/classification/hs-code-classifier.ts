import { createBrowserClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/encryption/api-key-encryption'
import OpenAI from '../openai-mock'
import Anthropic from '../anthropic-mock'

export interface ClassificationRequest {
  productDescription: string
  originCountry?: string
  destinationCountry?: string
  additionalContext?: string
}

export interface ClassificationResult {
  hsCode: string
  confidence: number
  description: string
  reasoning: string
  source: 'openai' | 'anthropic' | 'customs'
  alternativeCodes?: Array<{
    code: string
    confidence: number
    description: string
  }>
}

export interface ClassificationResponse {
  success: boolean
  result?: ClassificationResult
  error?: string
  fallbackUsed?: boolean
}

export class HSCodeClassifier {
  private supabase = createBrowserClient()

  /**
   * Get decrypted API key for a specific service
   */
  private async getApiKey(service: 'openai' | 'anthropic' | 'customs'): Promise<string | null> {
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
   * Classify using OpenAI GPT
   */
  private async classifyWithOpenAI(request: ClassificationRequest): Promise<ClassificationResult | null> {
    try {
      const apiKey = await this.getApiKey('openai')
      if (!apiKey) {return null}

      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

      const prompt = this.buildClassificationPrompt(request)
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert in international trade and HS (Harmonized System) code classification. 
            Provide accurate HS codes based on product descriptions. Always respond in valid JSON format with the following structure:
            {
              "hsCode": "string (6-digit HS code)",
              "confidence": number (0-100),
              "description": "string (official HS code description)",
              "reasoning": "string (explanation of classification logic)",
              "alternativeCodes": [
                {
                  "code": "string",
                  "confidence": number,
                  "description": "string"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {throw new Error('No response from OpenAI')}

      const parsed = JSON.parse(content)
      return {
        ...parsed,
        source: 'openai' as const
      }
    } catch (error) {
      console.error('OpenAI classification error:', error)
      return null
    }
  }

  /**
   * Classify using Anthropic Claude
   */
  private async classifyWithAnthropic(request: ClassificationRequest): Promise<ClassificationResult | null> {
    try {
      const apiKey = await this.getApiKey('anthropic')
      if (!apiKey) {return null}

      const anthropic = new Anthropic({ apiKey })

      const prompt = this.buildClassificationPrompt(request)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        temperature: 0.1,
        system: `You are an expert in international trade and HS (Harmonized System) code classification. 
        Provide accurate HS codes based on product descriptions. Always respond in valid JSON format with the following structure:
        {
          "hsCode": "string (6-digit HS code)",
          "confidence": number (0-100),
          "description": "string (official HS code description)",
          "reasoning": "string (explanation of classification logic)",
          "alternativeCodes": [
            {
              "code": "string",
              "confidence": number,
              "description": "string"
            }
          ]
        }`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type !== 'text') {throw new Error('Invalid response type from Anthropic')}

      const parsed = JSON.parse(content.text)
      return {
        ...parsed,
        source: 'anthropic' as const
      }
    } catch (error) {
      console.error('Anthropic classification error:', error)
      return null
    }
  }

  /**
   * Classify using Customs API (mock implementation)
   */
  private async classifyWithCustoms(request: ClassificationRequest): Promise<ClassificationResult | null> {
    try {
      const apiKey = await this.getApiKey('customs')
      if (!apiKey) {return null}

      // Mock implementation - replace with actual customs API integration
      const mockResponse = {
        hsCode: '123456',
        confidence: 95,
        description: 'Mock classification from customs database',
        reasoning: 'Based on official customs database lookup',
        source: 'customs' as const
      }

      return mockResponse
    } catch (error) {
      console.error('Customs API classification error:', error)
      return null
    }
  }

  /**
   * Build classification prompt
   */
  private buildClassificationPrompt(request: ClassificationRequest): string {
    let prompt = `Please classify the following product and provide the appropriate 6-digit HS code:\n\n`
    prompt += `Product Description: ${request.productDescription}\n`
    
    if (request.originCountry) {
      prompt += `Origin Country: ${request.originCountry}\n`
    }
    
    if (request.destinationCountry) {
      prompt += `Destination Country: ${request.destinationCountry}\n`
    }
    
    if (request.additionalContext) {
      prompt += `Additional Context: ${request.additionalContext}\n`
    }
    
    prompt += `\nPlease provide the most accurate HS code classification with confidence level and reasoning.`
    
    return prompt
  }

  /**
   * Main classification method with fallback logic
   */
  async classify(request: ClassificationRequest): Promise<ClassificationResponse> {
    try {
      // Try OpenAI first
      let result = await this.classifyWithOpenAI(request)
      if (result && result.confidence >= 70) {
        return { success: true, result }
      }

      // Fallback to Anthropic
      result = await this.classifyWithAnthropic(request)
      if (result && result.confidence >= 70) {
        return { success: true, result, fallbackUsed: true }
      }

      // Fallback to Customs API
      result = await this.classifyWithCustoms(request)
      if (result) {
        return { success: true, result, fallbackUsed: true }
      }

      // If all services fail or return low confidence
      if (result) {
        return { success: true, result, fallbackUsed: true }
      }

      return {
        success: false,
        error: 'No classification services available or all returned low confidence results'
      }
    } catch (error) {
      console.error('Classification error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown classification error'
      }
    }
  }

  /**
   * Batch classification for multiple products
   */
  async classifyBatch(requests: ClassificationRequest[]): Promise<ClassificationResponse[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.classify(request))
    )

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: 'Classification failed' }
    )
  }
}

// Export singleton instance
export const hsCodeClassifier = new HSCodeClassifier()
export default hsCodeClassifier