import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const workspaceId = params.id

    // Check if user has access to this workspace
    const { data: workspaceUser, error: accessError } = await supabase
      .from('workspace_users')
      .select(`
        role,
        workspaces (
          id,
          name,
          plan,
          stripe_customer_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()
    
    if (accessError || !workspaceUser) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 }
      )
    }
    
    // Get workspace members count
    const { count: memberCount } = await supabase
      .from('workspace_users')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
    
    return NextResponse.json({
      workspace: {
        ...workspaceUser.workspaces,
        role: workspaceUser.role,
        member_count: memberCount || 0
      }
    })
    
  } catch (error) {
    console.error('Error in workspace GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const workspaceId = params.id

    // Check if user is owner of this workspace
    const { data: workspaceUser, error: accessError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()
    
    if (accessError || !workspaceUser || workspaceUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owners can update workspace settings' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, plan } = body

    // Validate input
    const updates: any = {}
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Workspace name must be at least 2 characters long' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    if (plan !== undefined) {
      if (!['free', 'pro', 'enterprise'].includes(plan)) {
        return NextResponse.json(
          { error: 'Invalid plan type' },
          { status: 400 }
        )
      }
      updates.plan = plan
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    // Update workspace
    const { data: workspace, error: updateError } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select('id, name, plan, created_at, updated_at')
      .single()
    
    if (updateError) {
      console.error('Error updating workspace:', updateError)
      return NextResponse.json(
        { error: 'Failed to update workspace' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      workspace: {
        ...workspace,
        role: 'owner'
      },
      message: 'Workspace updated successfully'
    })
    
  } catch (error) {
    console.error('Error in workspace PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const workspaceId = params.id

    // Check if user is owner of this workspace
    const { data: workspaceUser, error: accessError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()
    
    if (accessError || !workspaceUser || workspaceUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owners can delete workspaces' },
        { status: 403 }
      )
    }

    // Check if this is the user's only workspace
    const { count: workspaceCount } = await supabase
      .from('workspace_users')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    if (workspaceCount && workspaceCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete your only workspace. Create another workspace first.' },
        { status: 400 }
      )
    }

    // Delete workspace (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
    
    if (deleteError) {
      console.error('Error deleting workspace:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete workspace' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Workspace deleted successfully'
    })
    
  } catch (error) {
    console.error('Error in workspace DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}