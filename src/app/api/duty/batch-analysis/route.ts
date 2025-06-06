import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SavingsAnalysisEngine, BatchSavingsAnalysis, ScenarioComparisonOptions } from '@/lib/duty/savings-analysis-engine'
import { z } from 'zod'

const batchAnalysisSchema = z.object({
  productIds: z.array(z.string()).min(1, 'At least one product ID is required'),
  options: z.object({
    includeShippingVariations: z.boolean().optional().default(true),
    includeOriginCountryVariations: z.boolean().optional().default(true),
    includeClassificationVariations: z.boolean().optional().default(true),
    includeTradeAgreements: z.boolean().optional().default(true),
    includeFBAOptimizations: z.boolean().optional().default(true),
    timeHorizonMonths: z.number().min(1).max(60).optional().default(12),
    confidenceThreshold: z.number().min(0).max(1).optional().default(0.7),
    minSavingThreshold: z.number().min(0).optional().default(50),
    maxScenarios: z.number().min(1).max(50).optional().default(20)
  }).optional().default({})
})

const scenarioComparisonSchema = z.object({
  productIds: z.array(z.string()).min(1, 'At least one product ID is required'),
  variations: z.object({
    shippingMethods: z.array(z.string()).optional(),
    originCountries: z.array(z.string()).optional(),
    destinationCountries: z.array(z.string()).optional(),
    hsCodeAlternatives: z.boolean().optional().default(true),
    tradeAgreements: z.boolean().optional().default(true),
    fbaOptimizations: z.boolean().optional().default(true)
  }).optional().default({}),
  analysisDepth: z.enum(['basic', 'comprehensive', 'exhaustive']).optional().default('comprehensive'),
  timeHorizon: z.number().min(1).max(60).optional().default(12)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const analysisType = searchParams.get('type') || 'batch'

    if (analysisType === 'batch') {
      return await handleBatchAnalysis(body, session.user.id)
    } else if (analysisType === 'comparison') {
      return await handleScenarioComparison(body, session.user.id)
    } else {
      return NextResponse.json(
        { error: 'Invalid analysis type. Use "batch" or "comparison"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Batch analysis API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleBatchAnalysis(body: any, userId: string): Promise<NextResponse> {
  try {
    const validatedData = batchAnalysisSchema.parse(body)
    const { productIds, options } = validatedData

    // Verify user has access to these products
    const supabase = createRouteHandlerClient({ cookies })
    const { data: userProducts, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', userId)
      .in('id', productIds)

    if (productsError) {
      throw new Error('Failed to verify product access')
    }

    const accessibleProductIds = userProducts?.map(p => p.id) || []
    const unauthorizedProducts = productIds.filter(id => !accessibleProductIds.includes(id))
    
    if (unauthorizedProducts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Access denied to some products',
          unauthorizedProducts 
        },
        { status: 403 }
      )
    }

    // Initialize savings analysis engine
    const savingsEngine = new SavingsAnalysisEngine(options)
    
    // Perform batch analysis
    const analysis = await savingsEngine.analyzeBatchSavings(productIds)
    
    // Store analysis results for future reference
    const { error: insertError } = await supabase
      .from('savings_analyses')
      .insert({
        user_id: userId,
        product_ids: productIds,
        analysis_type: 'batch',
        configuration: options,
        results: analysis,
        total_savings: analysis.totalSavings,
        total_savings_percentage: analysis.totalSavingsPercentage,
        average_roi: analysis.averageROI,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to store analysis results:', insertError)
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        analysisType: 'batch',
        productsAnalyzed: productIds.length,
        timestamp: new Date().toISOString(),
        configuration: options
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    console.error('Batch analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to perform batch analysis' },
      { status: 500 }
    )
  }
}

async function handleScenarioComparison(body: any, userId: string): Promise<NextResponse> {
  try {
    const validatedData = scenarioComparisonSchema.parse(body)
    const { productIds, variations, analysisDepth, timeHorizon } = validatedData

    // Verify user has access to these products
    const supabase = createRouteHandlerClient({ cookies })
    const { data: userProducts, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', userId)
      .in('id', productIds)

    if (productsError) {
      throw new Error('Failed to verify product access')
    }

    const accessibleProductIds = userProducts?.map(p => p.id) || []
    const unauthorizedProducts = productIds.filter(id => !accessibleProductIds.includes(id))
    
    if (unauthorizedProducts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Access denied to some products',
          unauthorizedProducts 
        },
        { status: 403 }
      )
    }

    // Initialize savings analysis engine with default options
    const savingsEngine = new SavingsAnalysisEngine()
    
    // Prepare comparison options
    const comparisonOptions: ScenarioComparisonOptions = {
      productIds,
      variations,
      analysisDepth,
      timeHorizon
    }
    
    // Perform scenario comparison
    const comparison = await savingsEngine.compareMultipleScenarios(comparisonOptions)
    
    // Store comparison results
    const { error: insertError } = await supabase
      .from('savings_analyses')
      .insert({
        user_id: userId,
        product_ids: productIds,
        analysis_type: 'comparison',
        configuration: comparisonOptions,
        results: comparison,
        total_savings: comparison.bestScenario.potentialSaving,
        total_savings_percentage: 0, // Calculate if needed
        average_roi: 0, // Calculate if needed
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to store comparison results:', insertError)
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({
      success: true,
      comparison,
      metadata: {
        analysisType: 'comparison',
        productsAnalyzed: productIds.length,
        scenariosGenerated: comparison.alternativeScenarios.length + 1, // +1 for baseline
        timestamp: new Date().toISOString(),
        configuration: comparisonOptions
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    console.error('Scenario comparison error:', error)
    return NextResponse.json(
      { error: 'Failed to perform scenario comparison' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const analysisType = searchParams.get('type')

    // Build query
    let query = supabase
      .from('savings_analyses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (analysisType) {
      query = query.eq('analysis_type', analysisType)
    }

    const { data: analyses, error } = await query

    if (error) {
      throw error
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('savings_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    if (analysisType) {
      countQuery = countQuery.eq('analysis_type', analysisType)
    }

    const { count } = await countQuery

    return NextResponse.json({
      success: true,
      analyses: analyses || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    console.error('Get analyses error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analyses' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('id')

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    // Delete the analysis (only if it belongs to the user)
    const { error } = await supabase
      .from('savings_analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', session.user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully'
    })
  } catch (error) {
    console.error('Delete analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to delete analysis' },
      { status: 500 }
    )
  }
}