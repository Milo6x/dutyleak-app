import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { classificationEngine, ClassificationRequest } from '@/lib/duty/classification-engine';

export async function POST(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
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
    const { products, forceReview = false, reviewReason = '' } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid products array' },
        { status: 400 }
      );
    }

    // Validate each product has required fields
    for (const product of products) {
      if (!product.productId || !product.productName) {
        return NextResponse.json(
          { error: 'Each product must have productId and productName' },
          { status: 400 }
        );
      }
    }

    // Convert to classification requests
    const classificationRequests: ClassificationRequest[] = products.map(product => ({
      productId: product.productId,
      productName: product.productName,
      productDescription: product.productDescription,
      imageUrl: product.imageUrl,
      existingHsCode: product.existingHsCode,
      forceReview: product.forceReview || forceReview,
      reviewReason: product.reviewReason || reviewReason
    }));

    // Process batch classification
    const batchResult = await classificationEngine.classifyBatch(classificationRequests, supabase);
    
    return NextResponse.json({
      success: batchResult.success,
      totalProcessed: batchResult.totalProcessed,
      successCount: batchResult.successCount,
      errorCount: batchResult.errorCount,
      results: batchResult.results,
      errors: batchResult.errors
    });
    
  } catch (error) {
    console.error('Batch classification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}