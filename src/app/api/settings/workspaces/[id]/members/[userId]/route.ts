import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Define available roles
const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
type WorkspaceRole = typeof WORKSPACE_ROLES[number]

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
}

// GET /api/settings/workspaces/[id]/members/[userId] - Get specific member details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = params.id
    const targetUserId = params.userId

    // Check if current user has access to this workspace
    const { data: userWorkspace, error: accessError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (accessError || !userWorkspace) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get target member details
    const { data: member, error: memberError } = await supabase
      .from('workspace_users')
      .select(`
        user_id,
        role,
        created_at,
        updated_at,
        profiles!inner(
          id,
          full_name,
          email
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({
      member: {
        user_id: member.user_id,
        role: member.role,
        joined_at: member.created_at,
        updated_at: member.updated_at,
        profile: {
          id: (member.profiles as any).id,
          full_name: (member.profiles as any).full_name,
          email: (member.profiles as any).email
        }
      }
    })

  } catch (error) {
    console.error('Error in GET /api/settings/workspaces/[id]/members/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings/workspaces/[id]/members/[userId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = params.id
    const targetUserId = params.userId
    const body = await request.json()
    const { role } = body

    // Validate input
    if (!role || !WORKSPACE_ROLES.includes(role as WorkspaceRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if current user has permission to change roles (admin or owner)
    const { data: currentUserRole, error: roleError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (roleError || !currentUserRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(currentUserRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to change roles' }, { status: 403 })
    }

    // Get target member's current role
    const { data: targetMember, error: targetError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent users from changing their own role
    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 })
    }

    // Check if current user can assign this role (can't assign higher role than own)
    if (ROLE_HIERARCHY[role as WorkspaceRole] >= ROLE_HIERARCHY[currentUserRole.role as WorkspaceRole]) {
      return NextResponse.json({ error: 'Cannot assign role equal or higher than your own' }, { status: 403 })
    }

    // Check if current user can modify target user (can't modify users with equal or higher role)
    if (ROLE_HIERARCHY[targetMember.role as WorkspaceRole] >= ROLE_HIERARCHY[currentUserRole.role as WorkspaceRole]) {
      return NextResponse.json({ error: 'Cannot modify users with equal or higher role' }, { status: 403 })
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner' && role !== 'owner') {
      const { data: ownerCount, error: countError } = await supabase
        .from('workspace_users')
        .select('user_id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')

      if (countError || (ownerCount && ownerCount.length <= 1)) {
        return NextResponse.json({ error: 'Cannot remove the last owner from workspace' }, { status: 403 })
      }
    }

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('workspace_users')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)
      .select(`
        user_id,
        role,
        created_at,
        updated_at,
        profiles!inner(
          id,
          full_name,
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Member role updated successfully',
      member: {
        user_id: updatedMember.user_id,
        role: updatedMember.role,
        joined_at: updatedMember.created_at,
        updated_at: updatedMember.updated_at,
        profile: {
          id: (updatedMember.profiles as any).id,
          full_name: (updatedMember.profiles as any).full_name,
          email: (updatedMember.profiles as any).email
        }
      }
    })

  } catch (error) {
    console.error('Error in PUT /api/settings/workspaces/[id]/members/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/settings/workspaces/[id]/members/[userId] - Remove member from workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = params.id
    const targetUserId = params.userId

    // Check if current user has permission to remove members (admin or owner)
    const { data: currentUserRole, error: roleError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (roleError || !currentUserRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(currentUserRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions to remove members' }, { status: 403 })
    }

    // Get target member's current role
    const { data: targetMember, error: targetError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent users from removing themselves
    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove yourself from workspace' }, { status: 403 })
    }

    // Check if current user can remove target user (can't remove users with equal or higher role)
    if (ROLE_HIERARCHY[targetMember.role as WorkspaceRole] >= ROLE_HIERARCHY[currentUserRole.role as WorkspaceRole]) {
      return NextResponse.json({ error: 'Cannot remove users with equal or higher role' }, { status: 403 })
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner') {
      const { data: ownerCount, error: countError } = await supabase
        .from('workspace_users')
        .select('user_id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')

      if (countError || (ownerCount && ownerCount.length <= 1)) {
        return NextResponse.json({ error: 'Cannot remove the last owner from workspace' }, { status: 403 })
      }
    }

    // Remove member from workspace
    const { error: deleteError } = await supabase
      .from('workspace_users')
      .delete()
      .eq('user_id', targetUserId)
      .eq('workspace_id', workspaceId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Member removed from workspace successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/settings/workspaces/[id]/members/[userId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}