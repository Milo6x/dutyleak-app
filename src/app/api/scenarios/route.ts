import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ScenarioEngine } from '@/lib/duty/scenario-engine';
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase);
    await checkUserPermission(user.id, workspace_id, 'DATA_CREATE');

    // Parse request body
    const body = await req.json();
    const { 
      name,
      description,
      productId,
      baseClassificationId,
      alternativeClassificationId,
      destinationCountry,
      productValue,
      shippingCost = 0,
      insuranceCost = 0,
      fbaFeeAmount = 0,
      yearlyUnits
    } = body;

    // Validate required fields
    if (!name || !productId || !baseClassificationId || !alternativeClassificationId || !destinationCountry || !productValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use workspace_id from permissions check
    if (!workspace_id) {
      return NextResponse.json(
        { error: 'User not associated with any workspace' },
        { status: 400 }
      );
    }

    // Verify product belongs to user's workspace
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, workspace_id')
      .eq('id', productId)
      .eq('workspace_id', workspace_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or access denied' },
        { status: 404 }
      );
    }

    // Initialize scenario engine
    const scenarioEngine = new ScenarioEngine();
    
    // Create scenario options
    const scenarioOptions = {
      baseClassificationId,
      alternativeClassificationId,
      destinationCountry,
      productValue,
      shippingCost,
      insuranceCost,
      fbaFeeAmount,
      yearlyUnits
    };
    
    try {
      // Compare classifications
      const comparison = await scenarioEngine.compareClassifications(scenarioOptions, supabase);
      
      // Create scenario in database
      const scenarioId = await scenarioEngine.createScenario(
        scenarioOptions,
        name,
        description || '',
        workspace_id,
        supabase
      );
      
      // If the alternative classification shows savings, add to savings ledger
      if (comparison.potentialSaving > 0) {
        await supabase
          .from('savings_ledger')
          .insert({
            product_id: productId,
            calculation_id: scenarioId, // Use scenario ID as calculation reference
            baseline_duty_rate: comparison.baseBreakdown.dutyPercentage,
            optimized_duty_rate: comparison.alternativeBreakdown.dutyPercentage,
            savings_amount: comparison.potentialYearlySaving,
            savings_percentage: ((comparison.baseBreakdown.dutyPercentage - comparison.alternativeBreakdown.dutyPercentage) / comparison.baseBreakdown.dutyPercentage) * 100,
            workspace_id: workspace_id
          });
      }
      
      return NextResponse.json({
        success: true,
        scenarioId,
        comparison
      });
    } catch (error) {
      console.error('Scenario creation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create scenario' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Scenarios API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
