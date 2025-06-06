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

// GET /api/settings/workspaces/[id]/members - List workspace members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = params.id

    // Check if user has access to this workspace
    const { data: userWorkspace, error: accessError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (accessError || !userWorkspace) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all workspace members with user profiles
    const { data: members, error: membersError } = await supabase
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
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Format the response
    const formattedMembers = members.map(member => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.created_at,
      updated_at: member.updated_at,
      profile: {
        id: (member.profiles as any).id,
        full_name: (member.profiles as any).full_name,
        email: (member.profiles as any).email
      }
    }))

    return NextResponse.json({
      members: formattedMembers,
      total: formattedMembers.length
    })

  } catch (error) {
    console.error('Error in GET /api/settings/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settings/workspaces/[id]/members - Invite user to workspace
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = params.id
    const body = await request.json()
    const { email, role = 'member' } = body

    // Validate input
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!WORKSPACE_ROLES.includes(role as WorkspaceRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if current user has permission to invite (admin or owner)
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
      return NextResponse.json({ error: 'Insufficient permissions to invite users' }, { status: 403 })
    }

    // Check if inviting user can assign this role (can't assign higher role than own)
    if (ROLE_HIERARCHY[role as WorkspaceRole] >= ROLE_HIERARCHY[currentUserRole.role as WorkspaceRole]) {
      return NextResponse.json({ error: 'Cannot assign role equal or higher than your own' }, { status: 403 })
    }

    // Find user by email
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', targetUser.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 409 })
    }

    // Add user to workspace
    const { data: newMember, error: insertError } = await supabase
      .from('workspace_users')
      .insert({
        user_id: targetUser.id,
        workspace_id: workspaceId,
        role: role
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding member:', insertError)
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'User successfully added to workspace',
      member: {
        user_id: targetUser.id,
        role: role,
        profile: {
          id: targetUser.id,
          full_name: targetUser.full_name,
          email: targetUser.email
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/settings/workspaces/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}