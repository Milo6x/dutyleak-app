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
      yearlyUnits,
      shared_with_workspaces // New optional field for sharing
    } = body;

    // Validate required fields
    if (!name || !productId || !baseClassificationId || !alternativeClassificationId || !destinationCountry || !productValue) {
      return NextResponse.json(
        { error: 'Missing required fields for scenario creation' },
        { status: 400 }
      );
    }
    if (shared_with_workspaces && !Array.isArray(shared_with_workspaces)) {
      return NextResponse.json(
        { error: 'shared_with_workspaces must be an array of workspace IDs' },
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

      // After creating the scenario, prepare updates for sharing and detailed parameters
      const scenarioUpdates: Record<string, any> = {};
      if (shared_with_workspaces && shared_with_workspaces.length > 0) {
        scenarioUpdates.shared_with_workspaces = shared_with_workspaces;
      }

      // Store detailed input parameters from the request body into the 'parameters' JSONB field
      // These are the fields from ScenarioInput on the frontend
      const detailedParameters = {
        productId: body.productId, // Ensure productId from body is stored
        productPrice: body.productValue, // productValue from body is productPrice in ScenarioInput
        dimensions: body.dimensions, // Assuming dimensions are passed in body
        category: body.category,     // Assuming category is passed in body
        quantity: body.quantity,     // Assuming quantity is passed in body
        hsCode: body.hsCode,         // HS code used for "what-if"
        originCountry: body.originCountry, // Origin country for "what-if"
        // destinationCountry is already a main column, but can be in parameters for consistency
        // shippingCost, insuranceCost are main columns, but can be in parameters if they represent user overrides
        additionalFees: body.additionalFees,
        // Any other fields from ScenarioInput that aren't direct columns in duty_scenarios
      };
      scenarioUpdates.parameters = detailedParameters;

      if (scenarioId && Object.keys(scenarioUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from('duty_scenarios')
          .update(scenarioUpdates as any) // Cast to any for now due to evolving schema
          .eq('id', scenarioId)
          .eq('workspace_id', workspace_id); // Ensure only owner can set initial sharing/params

        if (updateError) {
          console.error('Error updating scenario with sharing/parameters info:', updateError);
          // Proceed but maybe log or warn; scenario creation itself was successful
        }
      }
      
      // If the alternative classification shows savings, add to savings ledger
      // This part uses comparison results, which are based on base/alt classification IDs
      // The 'parameters' field stores the "what-if" inputs which might be different.
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Scenario creation error:', errorMessage);
      return NextResponse.json(
        { error: `Failed to create scenario: ${errorMessage}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Scenarios API error:', errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    const { user, workspace_id } = await getWorkspaceAccess(supabase);
    await checkUserPermission(user.id, workspace_id, 'DATA_VIEW'); // Assuming DATA_VIEW for listing

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'User not associated with any workspace' },
        { status: 400 }
      );
    }

    // Fetch scenarios created by the user's workspace OR shared with the user's workspace
    // This requires RLS to be set up correctly or the query to handle both cases.
    // Using .or() condition for Supabase query:
    // 1. workspace_id equals current workspace_id (owned)
    // 2. shared_with_workspaces array contains current workspace_id (shared)
    // Note: The 'shared_with_workspaces.cs.{value}' syntax is for array containment.
    // The value needs to be a single value to check for containment, not an array.
    // So, it should be `shared_with_workspaces.cs.{${workspace_id}}`
    
    const { data: scenarios, error: fetchError } = await supabase
      .from('duty_scenarios')
      .select('*')
      .or(`workspace_id.eq.${workspace_id},shared_with_workspaces.cs.{${workspace_id}}`)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching scenarios:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch scenarios: ${fetchError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: scenarios || [] });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Scenarios GET API error:', errorMessage);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
