import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from '@/lib/external/openai-mock'
import { decryptApiKey } from '@/lib/encryption/api-key-encryption'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the test prompt from request body
    const { test_prompt } = await request.json()
    if (!test_prompt) {
      return NextResponse.json(
        { success: false, error: 'Test prompt is required' },
        { status: 400 }
      )
    }

    // Get OpenAI API key from database
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service_name', 'openai')
      .eq('user_id', session.user.id)
      .single()

    if (keyError || !apiKeyData?.api_key) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not found. Please configure it first.' },
        { status: 400 }
      )
    }

    // Decrypt the API key
    let decryptedApiKey: string
    try {
      decryptedApiKey = decryptApiKey(apiKeyData.api_key)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt API key. Please reconfigure it.' },
        { status: 400 }
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: decryptedApiKey
    })

    // Test the API with a simple classification request
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert in HS (Harmonized System) code classification. 
          Classify the given product and provide the most appropriate HS code with a brief explanation.
          Respond in JSON format with: { "hs_code": "XXXX.XX.XX", "description": "brief explanation", "confidence": 0.95 }`
        },
        {
          role: 'user',
          content: `Classify this product: ${test_prompt}`
        }
      ],
      max_tokens: 200,
      temperature: 0.1
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Try to parse the JSON response
    let classificationResult
    try {
      classificationResult = JSON.parse(response)
    } catch {
      // If JSON parsing fails, create a simple response
      classificationResult = {
        hs_code: 'TEST.OK',
        description: 'API test successful',
        confidence: 1.0
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OpenAI API test successful',
      test_result: classificationResult,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0
      }
    })

  } catch (error) {
    console.error('OpenAI API test error:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { success: false, error: 'Invalid OpenAI API key' },
          { status: 400 }
        )
      }
      if (error.message.includes('429')) {
        return NextResponse.json(
          { success: false, error: 'OpenAI API rate limit exceeded' },
          { status: 400 }
        )
      }
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { success: false, error: 'OpenAI API quota exceeded' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'OpenAI API test failed' 
      },
      { status: 500 }
    )
  }
}