import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'WORKSPACE_VIEW')

    // Get workspaces the user has access to
    const { data: workspaceUsers, error: fetchError } = await supabase
      .from('workspace_users')
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name,
          plan,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
    
    if (fetchError) {
      console.error('Error fetching workspaces:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch workspaces' },
        { status: 500 }
      )
    }
    
    // Transform the data to include role information
    const workspaces = workspaceUsers?.map(wu => ({
      ...wu.workspaces,
      role: wu.role
    })) || []
    
    return NextResponse.json({
      workspaces
    })
    
  } catch (error) {
    console.error('Error in workspaces GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, plan = 'free' } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Workspace name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (!['free', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    // Create workspace
    const { data: workspace, error: createError } = await supabase
      .from('workspaces')
      .insert({
        name: name.trim(),
        plan
      })
      .select('id, name, plan, created_at, updated_at')
      .single()
    
    if (createError) {
      console.error('Error creating workspace:', createError)
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      )
    }

    // Add user as owner of the workspace
    const { error: memberError } = await supabase
      .from('workspace_users')
      .insert({
        user_id: user.id,
        workspace_id: workspace.id,
        role: 'owner'
      })
    
    if (memberError) {
      console.error('Error adding user to workspace:', memberError)
      // Try to clean up the workspace if adding user failed
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json(
        { error: 'Failed to set up workspace membership' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      workspace: {
        ...workspace,
        role: 'owner'
      },
      message: 'Workspace created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error in workspaces POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}