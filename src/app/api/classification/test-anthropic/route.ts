import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Anthropic from '@/lib/external/anthropic-mock'
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

    // Get Anthropic API key from database
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service_name', 'anthropic')
      .eq('user_id', session.user.id)
      .single()

    if (keyError || !apiKeyData?.api_key) {
      return NextResponse.json(
        { success: false, error: 'Anthropic API key not found. Please configure it first.' },
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

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: decryptedApiKey
    })

    // Test the API with a simple classification request
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 200,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: `You are an expert in HS (Harmonized System) code classification. 
          Classify the given product and provide the most appropriate HS code with a brief explanation.
          Respond in JSON format with: { "hs_code": "XXXX.XX.XX", "description": "brief explanation", "confidence": 0.95 }
          
          Product to classify: ${test_prompt}`
        }
      ]
    })

    const response = message.content[0]
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }

    // Try to parse the JSON response
    let classificationResult
    try {
      classificationResult = JSON.parse(response.text)
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
      message: 'Anthropic API test successful',
      test_result: classificationResult,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        total_tokens: message.usage.input_tokens + message.usage.output_tokens
      }
    })

  } catch (error) {
    console.error('Anthropic API test error:', error)
    
    // Handle specific Anthropic errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { success: false, error: 'Invalid Anthropic API key' },
          { status: 400 }
        )
      }
      if (error.message.includes('429')) {
        return NextResponse.json(
          { success: false, error: 'Anthropic API rate limit exceeded' },
          { status: 400 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('credit')) {
        return NextResponse.json(
          { success: false, error: 'Anthropic API quota exceeded' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Anthropic API test failed' 
      },
      { status: 500 }
    )
  }
}