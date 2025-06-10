import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { HSCodeClassifier } from '@/lib/classification/hs-code-classifier'
import { ClassificationEngine } from '@/lib/duty/classification-engine'
import { enhancedAIClassifier, EnhancedClassificationRequest, EnhancedClassificationResponse } from '@/lib/classification/enhanced-ai-classifier'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

interface ClassificationRequest {
  productDescription: string
  productName?: string
  imageUrl?: string
  originCountry?: string
  destinationCountry?: string
  additionalContext?: string
  existingHsCode?: string
  productCategory?: string
  productId?: string // Added productId
  batch?: boolean
  products?: ClassificationRequest[] // products in batch should also ideally have productId
  useEnhanced?: boolean // Flag to use enhanced classifier
}

interface ClassificationResult {
  hsCode: string
  confidence: number
  description: string
  reasoning: string
  alternativeCodes?: Array<{
    code: string
    confidence: number
    description: string
    reasoning?: string
  }>
  source?: string
  modelVersion?: string
  processingTime?: number
  validationResults?: {
    formatValid: boolean
    categoryMatch: boolean
    countryCompliant: boolean
    warnings: string[]
  }
  imageAnalysis?: {
    detected: boolean
    confidence: number
    features: string[]
  }
}

interface ClassificationResponse {
  success: boolean
  result?: ClassificationResult | ClassificationResult[]
  error?: string
  fallbackUsed?: boolean
  sourcesAttempted?: string[]
  totalProcessingTime?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ClassificationRequest
    const { 
      productDescription, 
      productName, 
      imageUrl,
      originCountry, 
      destinationCountry, 
      additionalContext,
      existingHsCode,
      productCategory,
      productId, // Added productId
      batch, 
      products,
      useEnhanced = true // Default to enhanced classifier
    } = body

    // Validate required fields
    if (!productDescription && !batch) {
      return NextResponse.json(
        { success: false, error: 'Product description is required' },
        { status: 400 }
      )
    }

    if (batch && (!products || !Array.isArray(products) || products.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Products array is required for batch classification' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()

    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'DATA_CREATE')

    if (batch && products) {
      // Handle batch classification
      let results: ClassificationResult[]
      
      if (useEnhanced) {
        // Use enhanced classifier for batch
        const enhancedRequests: EnhancedClassificationRequest[] = products.map(product => ({
          productDescription: product.productDescription,
          productName: product.productName,
          images: product.imageUrl ? [product.imageUrl] : undefined,
          originCountry: product.originCountry,
          destinationCountry: product.destinationCountry,
          additionalContext: product.additionalContext,
          productCategory: product.productCategory
        }))
        
        const enhancedResults = await enhancedAIClassifier.classifyBatch(enhancedRequests)
        results = enhancedResults.map(response => {
          if (response.success && response.result) {
            return response.result
          } else {
            return {
              hsCode: '',
              confidence: 0,
              description: 'Classification failed',
              reasoning: response.error || 'An error occurred during classification'
            }
          }
        })
      } else {
        // Use legacy classifier
        const hsCodeClassifier = new HSCodeClassifier()
        results = await Promise.all(
          products.map(async (product) => {
            try {
              const response = await hsCodeClassifier.classify({
                productDescription: product.productDescription,
                originCountry: product.originCountry,
                destinationCountry: product.destinationCountry,
                additionalContext: product.additionalContext
              })
              return response.result || {
                hsCode: '',
                confidence: 0,
                description: 'Classification failed',
                reasoning: 'No result returned from classifier'
              }
            } catch (error) {
              console.error('Batch classification error:', error)
              return {
                hsCode: '',
                confidence: 0,
                description: 'Classification failed',
                reasoning: 'An error occurred during classification'
              }
            }
          })
        )
      }

      // Log batch classification
      try {
        await supabase
          .from('job_logs')
          .insert({
            job_id: `batch_classification_${Date.now()}`,
            level: 'info',
            message: `Batch classification of ${products.length} products completed`,
            metadata: {
              user_id: user.id,
              workspace_id: workspace_id,
              product_count: products.length,
              hs_codes: results.map(r => r.hsCode).join(', '),
              average_confidence: Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length),
              source: useEnhanced ? 'enhanced_batch_api' : 'batch_api'
            }
          })
      } catch (logError) {
        console.error('Failed to log batch classification:', logError)
      }

      return NextResponse.json({
        success: true,
        result: results
      })
    } else {
      // Handle single classification
      let result: ClassificationResult
      let fallbackUsed = false
      let sourcesAttempted: string[] = []
      let totalProcessingTime = 0
      
      if (useEnhanced) {
        // Use enhanced classifier
        const enhancedRequest: EnhancedClassificationRequest = {
          productDescription,
          productName,
          images: imageUrl ? [imageUrl] : undefined,
          originCountry,
          destinationCountry,
          additionalContext,
          productCategory
        }
        
        const enhancedResponse = await enhancedAIClassifier.classify(enhancedRequest)
        
        if (enhancedResponse.success && enhancedResponse.result) {
          result = enhancedResponse.result
          fallbackUsed = enhancedResponse.fallbackUsed || false
          sourcesAttempted = enhancedResponse.sourcesAttempted
          totalProcessingTime = enhancedResponse.totalProcessingTime
        } else {
          // Fallback to legacy classifier
          console.warn('Enhanced classifier failed, falling back to legacy classifier')
          const hsCodeClassifier = new HSCodeClassifier()
          const legacyResult = await hsCodeClassifier.classify({
            productDescription,
            originCountry,
            destinationCountry,
            additionalContext
          })
          
          if (legacyResult.success && legacyResult.result) {
            result = legacyResult.result
          } else {
            throw new Error(legacyResult.error || 'Legacy classification failed')
          }
          fallbackUsed = true
          sourcesAttempted = ['legacy']
        }
      } else {
        // Use legacy classifier
        const hsCodeClassifier = new HSCodeClassifier()
        const legacyResponse = await hsCodeClassifier.classify({
          productDescription,
          originCountry,
          destinationCountry,
          additionalContext
        })
        
        if (legacyResponse.success && legacyResponse.result) {
          result = legacyResponse.result
        } else {
          throw new Error(legacyResponse.error || 'Classification failed')
        }
        sourcesAttempted = ['legacy']
      }

      // Log the classification request for audit purposes
      try {
        await supabase
          .from('job_logs')
          .insert({
            job_id: `classification_${Date.now()}`,
            level: 'info',
            message: `Classification performed for product: ${productDescription}`,
            metadata: {
              user_id: user.id,
              workspace_id: workspace_id,
              product_id: productId, // Log productId
              product_description: productDescription,
              hs_code: result.hsCode,
              confidence: result.confidence,
              source: useEnhanced ? (result.source || 'enhanced_api') : 'api'
            }
          })
      } catch (logError) {
        console.error('Failed to log classification:', logError)
        // Don't fail the request if logging fails
      }

      const response: ClassificationResponse = {
        success: true,
        result,
        fallbackUsed,
        sourcesAttempted,
        totalProcessingTime
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Classification API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's classification history
    const { data: logs, error } = await supabase
      .from('job_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching classification logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch classification history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: logs || []
    })
  } catch (error) {
    console.error('Classification history API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
