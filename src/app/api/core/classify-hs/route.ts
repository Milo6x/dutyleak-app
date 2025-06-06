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
    const { 
      productId, 
      productName, 
      productDescription, 
      imageUrl,
      existingHsCode,
      addToReviewQueue = false,  // Option to add to review queue
      reviewReason = ''          // Reason for review
    } = body;

    if (!productId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields: productId and productName' },
        { status: 400 }
      );
    }

    // Create classification request
    const classificationRequest: ClassificationRequest = {
      productId,
      productName,
      productDescription,
      imageUrl,
      existingHsCode,
      forceReview: addToReviewQueue,
      reviewReason
    };

    // Use classification engine
    const result = await classificationEngine.classifyProduct(classificationRequest, supabase);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Classification failed', 
          details: result.error 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      classificationId: result.classificationId,
      hsCode: result.hsCode,
      hs6: result.hs6,
      hs8: result.hs8,
      confidenceScore: result.confidenceScore,
      source: result.source,
      rulingReference: result.rulingReference,
      addedToReviewQueue: result.addedToReviewQueue,
      reviewQueueId: result.reviewQueueId
    });
    
  } catch (error) {
    console.error('Classification API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
