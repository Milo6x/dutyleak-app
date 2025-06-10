import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { 
  OptimizationEngine, 
  OptimizationRecommendation 
} from '@/lib/duty/optimization-engine' // Assuming this is the correct path

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, productIds } = body; // Allow single productId or an array

    if (!productId && (!productIds || !Array.isArray(productIds) || productIds.length === 0)) {
      return NextResponse.json({ error: 'Missing productId or productIds array.' }, { status: 400 });
    }

    const idsToProcess: string[] = productId ? [productId] : productIds;

    if (idsToProcess.some(id => typeof id !== 'string' || !id.trim())) {
        return NextResponse.json({ error: 'Invalid product ID(s) provided.' }, { status: 400 });
    }
    
    // Initialize the OptimizationEngine. Options can be customized.
    const optimizationEngine = new OptimizationEngine({
      // Default options are fine for now, or customize as needed:
      // confidenceThreshold: 0.7,
      // minPotentialSaving: 100,
      // includeAdvancedOptimizations: true,
      // maxRecommendations: 5, // Limit per product if processing many
    });

    // The generateRecommendations method expects an array of product IDs.
    const recommendations: OptimizationRecommendation[] = await optimizationEngine.generateRecommendations(idsToProcess);

    if (!recommendations) { // generateRecommendations should always return an array, but good to check
      return NextResponse.json(
        { 
          error: 'Failed to generate optimization recommendations.', 
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: recommendations,
    });

  } catch (error) {
    console.error('API /api/duty/get-optimization-recommendations error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
