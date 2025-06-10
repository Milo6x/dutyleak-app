import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Workspace Setup API Endpoint
 * 
 * This endpoint ensures proper workspace creation and user association
 * to prevent 403 permission errors in the application.
 */

export async function POST(request: NextRequest) {
  try {
    const { userId, companyName } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for admin operations
    const supabase = createRouteHandlerClient({ cookies })

    // Step 1: Check if user already has workspace access
    const { data: existingAccess, error: checkError } = await supabase
      .from('workspace_users')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single()

    if (existingAccess && !checkError) {
      console.log(`User ${userId} already has workspace access:`, existingAccess)
      return NextResponse.json({
        success: true,
        message: 'User already has workspace access',
        workspace_id: existingAccess.workspace_id,
        role: existingAccess.role
      })
    }

    // Step 2: Get or create a default workspace
    let workspace
    const workspaceName = companyName || 'Default Workspace'

    // First, try to find an existing default workspace
    const { data: existingWorkspaces, error: workspaceQueryError } = await supabase
      .from('workspaces')
      .select('*')
      .or(`name.eq.${workspaceName},name.eq.Default Workspace`)
      .limit(1)

    if (workspaceQueryError) {
      console.error('Error querying workspaces:', workspaceQueryError)
      // Continue to create a new workspace
    }

    if (existingWorkspaces && existingWorkspaces.length > 0) {
      workspace = existingWorkspaces[0]
      console.log(`Using existing workspace: ${workspace.id}`)
    } else {
      // Create new workspace
      const { data: newWorkspace, error: createWorkspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          description: `Workspace for ${workspaceName}`,
          created_by: userId
        })
        .select()
        .single()

      if (createWorkspaceError) {
        console.error('Error creating workspace:', createWorkspaceError)
        return NextResponse.json(
          { error: `Failed to create workspace: ${createWorkspaceError.message}` },
          { status: 500 }
        )
      }

      workspace = newWorkspace
      console.log(`Created new workspace: ${workspace.id}`)
    }

    // Step 3: Add user to workspace with appropriate role
    const userRole = workspace.created_by === userId ? 'owner' : 'member'
    
    const { error: addUserError } = await supabase
      .from('workspace_users')
      .insert({
        user_id: userId,
        workspace_id: workspace.id,
        role: userRole
      })

    if (addUserError) {
      // Check if it's a duplicate key error (user already exists)
      if (addUserError.code === '23505') {
        console.log(`User ${userId} already associated with workspace ${workspace.id}`)
        return NextResponse.json({
          success: true,
          message: 'User already associated with workspace',
          workspace_id: workspace.id,
          role: userRole
        })
      }

      console.error('Error adding user to workspace:', addUserError)
      return NextResponse.json(
        { error: `Failed to add user to workspace: ${addUserError.message}` },
        { status: 500 }
      )
    }

    // Step 4: Verify the setup
    const { data: verification, error: verifyError } = await supabase
      .from('workspace_users')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .eq('workspace_id', workspace.id)
      .single()

    if (verifyError || !verification) {
      console.error('Failed to verify workspace setup:', verifyError)
      return NextResponse.json(
        { error: 'Workspace setup verification failed' },
        { status: 500 }
      )
    }

    console.log(`Successfully set up workspace for user ${userId}:`, {
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      user_role: verification.role
    })

    return NextResponse.json({
      success: true,
      message: 'Workspace setup completed successfully',
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      role: verification.role
    })

  } catch (error: any) {
    console.error('Workspace setup error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

// GET endpoint to check workspace status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })

    const { data: workspaceAccess, error } = await supabase
      .from('workspace_users')
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error checking workspace access:', error)
      return NextResponse.json(
        { error: `Failed to check workspace access: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      workspaces: workspaceAccess || [],
      hasAccess: workspaceAccess && workspaceAccess.length > 0
    })

  } catch (error: any) {
    console.error('Workspace check error:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}