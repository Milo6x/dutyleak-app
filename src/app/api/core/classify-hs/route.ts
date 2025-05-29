import { createDutyLeakServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ZonosClient } from '@/lib/external/zonos-client';
import { OpenAIClient } from '@/lib/external/openai-client';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createDutyLeakServerClient(cookieStore);
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      productId, 
      productName, 
      productDescription, 
      imageUrl,
      existingHsCode,
      addToReviewQueue = false,  // NEW: Option to add to review queue
      reviewReason = ''          // NEW: Reason for review
    } = body;

    if (!productId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields: productId and productName' },
        { status: 400 }
      );
    }

    // Get product from database to verify access rights
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, workspace_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Initialize classification clients
    const zonosClient = new ZonosClient();
    const openaiClient = new OpenAIClient();
    
    // Try Zonos classification first (if API key is configured)
    let classificationResult;
    let source = '';
    let confidenceScore = 0;
    
    if (process.env.ZONOS_API_KEY) {
      classificationResult = await zonosClient.classifyProduct(
        productName,
        productDescription,
        existingHsCode
      );
      
      if (classificationResult.success) {
        source = 'zonos';
        confidenceScore = classificationResult.confidenceScore || 0;
      }
    }
    
    // If Zonos fails or is not configured, try OpenAI
    if (!classificationResult?.success && process.env.OPENAI_API_KEY) {
      classificationResult = await openaiClient.classifyProduct(
        productName,
        productDescription,
        imageUrl
      );
      
      if (classificationResult.success) {
        source = 'openai';
        confidenceScore = classificationResult.confidenceScore || 0;
      }
    }
    
    // If both fail, return error
    if (!classificationResult?.success) {
      return NextResponse.json(
        { 
          error: 'Classification failed', 
          details: classificationResult?.error || 'Unknown error' 
        },
        { status: 500 }
      );
    }
    
    // Extract HS code
    const hsCode = classificationResult.hsCode || '';
    if (!hsCode) {
      return NextResponse.json(
        { error: 'No HS code returned from classification service' },
        { status: 500 }
      );
    }
    
    // Determine HS6 and HS8
    const hs6 = hsCode.substring(0, 6);
    const hs8 = hsCode.length >= 8 ? hsCode : null;
    
    // Store classification in database
    const { data: classification, error: classificationError } = await supabase
      .from('classifications')
      .insert({
        product_id: productId,
        hs6,
        hs8,
        confidence_score: confidenceScore,
        source,
        ruling_reference: classificationResult.rulingReference || source,
        is_active: !addToReviewQueue // If adding to review queue, don't make active yet
      })
      .select()
      .single();
    
    if (classificationError) {
      return NextResponse.json(
        { error: 'Failed to store classification', details: classificationError.message },
        { status: 500 }
      );
    }
    
    // If confidence is low or explicitly requested, add to review queue
    let reviewQueueId = null;
    let addedToReviewQueue = false;
    
    if (addToReviewQueue || confidenceScore < 0.7) {
      const reason = reviewReason || 
        (confidenceScore < 0.7 ? `Low confidence score (${confidenceScore})` : 'Manual review requested');
      
      const { data: reviewItem, error: reviewError } = await supabase
        .from('review_queue')
        .insert({
          workspace_id: product.workspace_id,
          product_id: productId,
          classification_id: classification.id,
          confidence_score: confidenceScore,
          reason,
          status: 'pending'
        })
        .select()
        .single();
      
      if (!reviewError && reviewItem) {
        reviewQueueId = reviewItem.id;
        addedToReviewQueue = true;
      } else {
        console.error('Failed to add to review queue:', reviewError);
        // Continue anyway to return the classification to the user
      }
    } else {
      // If not adding to review queue, update product with active classification
      await supabase
        .from('products')
        .update({
          active_classification_id: classification.id
        })
        .eq('id', productId);
    }
    
    return NextResponse.json({
      success: true,
      classificationId: classification.id,
      hsCode,
      confidenceScore,
      source,
      addedToReviewQueue,
      reviewQueueId
    });
    
  } catch (error) {
    console.error('Classification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
