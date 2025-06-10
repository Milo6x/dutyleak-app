import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { 
  EnhancedDutyEngine, 
  DutyCalculationRequest, 
  DutyCalculationResult 
} from '@/lib/duty/enhanced-duty-engine'

// It's often better to use the singleton instance if its state is not user-specific
// or if it's designed to be stateless for requests.
// However, if options need to be configured per request or user, a new instance might be needed.
// For now, let's assume we can create a new instance or use a shared one appropriately.
// const dutyEngine = new EnhancedDutyEngine(); // Or import the singleton instance if available

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient(); // For auth or other DB access if needed
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody: DutyCalculationRequest = await request.json();

    // Validate essential parameters (EnhancedDutyEngine also validates, but good to have a basic check)
    if (!requestBody.hsCode || !requestBody.productValue || !requestBody.originCountry || !requestBody.destinationCountry) {
      return NextResponse.json({ error: 'Missing required parameters for duty calculation.' }, { status: 400 });
    }
    
    // Initialize the engine. Options can be customized if needed.
    const dutyEngine = new EnhancedDutyEngine({
        useExternalAPIs: true, // Example: enable external APIs for more accuracy
        cacheResults: true,    // Example: enable caching within the engine instance
        includeOptimization: false, // For pure calculation, optimization might not be needed here
        includeCompliance: false  // Compliance might also be a separate step
    });

    const calculationResult: DutyCalculationResult = await dutyEngine.calculateDuty(requestBody);

    if (!calculationResult.success || !calculationResult.calculation) {
      return NextResponse.json(
        { 
          error: 'Failed to calculate duty.', 
          details: calculationResult.error, 
          warnings: calculationResult.warnings 
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: calculationResult.calculation, // Send back the detailed calculation
      warnings: calculationResult.warnings
    });

  } catch (error) {
    console.error('API /api/duty/calculate-what-if error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
