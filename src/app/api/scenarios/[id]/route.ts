import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions';

interface UpdateScenarioBody {
  name?: string;
  description?: string;
  parameters?: any; // Should match the structure of detailedParameters in POST
  shared_with_workspaces?: string[];
  // Add any other updatable fields from duty_scenarios table if needed
  // e.g., baseClassificationId, alternativeClassificationId, etc. if those are editable post-creation
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createDutyLeakServerClient();
    const { user, workspace_id } = await getWorkspaceAccess(supabase);
    // For updating, user might need 'DATA_UPDATE' or a specific 'SCENARIO_UPDATE' permission
    await checkUserPermission(user.id, workspace_id, 'DATA_UPDATE'); 

    const scenarioId = params.id;
    if (!scenarioId) {
      return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
    }

    const body: UpdateScenarioBody = await req.json();
    const { name, description, parameters, shared_with_workspaces } = body;

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }
    
    if (shared_with_workspaces && !Array.isArray(shared_with_workspaces)) {
      return NextResponse.json(
        { error: 'shared_with_workspaces must be an array of workspace IDs' },
        { status: 400 }
      );
    }

    const updates: Partial<UpdateScenarioBody> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (parameters !== undefined) updates.parameters = parameters; // Assuming parameters is a JSONB column
    if (shared_with_workspaces !== undefined) updates.shared_with_workspaces = shared_with_workspaces;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update provided' }, { status: 400 });
    }

    const { data, error: updateError } = await supabase
      .from('duty_scenarios')
      .update(updates as any) // Cast to any for now if types are not perfectly aligned with schema
      .eq('id', scenarioId)
      .eq('workspace_id', workspace_id) // Ensure user can only update scenarios they own
      .select()
      .single(); // To get the updated record back

    if (updateError) {
      console.error('Error updating scenario:', updateError);
      if (updateError.code === 'PGRST116') { // PostgREST error for "טים or more rows"
        return NextResponse.json({ error: 'Scenario not found or access denied' }, { status: 404 });
      }
      return NextResponse.json({ error: `Failed to update scenario: ${updateError.message}` }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Scenario not found or access denied after update attempt' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Scenario PUT API error:', errorMessage);
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createDutyLeakServerClient();
    const { user, workspace_id } = await getWorkspaceAccess(supabase);
    // For deleting, user might need 'DATA_DELETE' or a specific 'SCENARIO_DELETE' permission
    await checkUserPermission(user.id, workspace_id, 'DATA_DELETE');

    const scenarioId = params.id;
    if (!scenarioId) {
      return NextResponse.json({ error: 'Scenario ID is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('duty_scenarios')
      .delete()
      .eq('id', scenarioId)
      .eq('workspace_id', workspace_id); // Ensure user can only delete scenarios they own

    if (deleteError) {
      console.error('Error deleting scenario:', deleteError);
       if (deleteError.code === 'PGRST116') { // Not found or RLS prevented
        return NextResponse.json({ error: 'Scenario not found or access denied' }, { status: 404 });
      }
      return NextResponse.json({ error: `Failed to delete scenario: ${deleteError.message}` }, { status: 500 });
    }
    
    // Supabase delete doesn't return data by default, check count or assume success if no error
    // To be more robust, one could check the count of deleted rows if the client provides it.

    return NextResponse.json({ success: true, message: 'Scenario deleted successfully' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Scenario DELETE API error:', errorMessage);
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
