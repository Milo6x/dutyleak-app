import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

// Revoke/delete a specific API key
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { id: string; key_id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const workspaceId = params.id
    const keyId = params.key_id
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request, workspaceId)
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      )
    }

    const { user, workspace_id } = workspaceAccess

    // Check if user has permission to manage API keys
    const hasPermission = await checkUserPermission(
      user.id,
      workspace_id,
      'API_KEYS_DELETE'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage API keys' },
        { status: 403 }
      )
    }

    // Check if the API key exists and belongs to this workspace
    const { data: existingKey, error: fetchError } = await supabase
      .from('workspace_api_keys')
      .select('id, name')
      .eq('id', keyId)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single()

    if (fetchError || !existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    // Soft delete the API key by setting is_active to false
    const { error: deleteError } = await supabase
      .from('workspace_api_keys')
      .update({ 
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('id', keyId)
      .eq('workspace_id', workspace_id)

    if (deleteError) {
      console.error('Error revoking API key:', deleteError)
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `API key "${existingKey.name}" has been revoked successfully`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in workspace API key DELETE endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get details of a specific API key
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string; key_id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const workspaceId = params.id
    const keyId = params.key_id
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request, workspaceId)
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      )
    }

    const { user, workspace_id } = workspaceAccess

    // Check if user has permission to view API keys
    const hasPermission = await checkUserPermission(
      user.id,
      workspace_id,
      'API_KEYS_VIEW'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view API keys' },
        { status: 403 }
      )
    }

    // Fetch the specific API key
    const { data: apiKey, error } = await supabase
      .from('workspace_api_keys')
      .select(`
        id,
        name,
        permissions,
        is_active,
        created_at,
        last_used_at,
        expires_at,
        revoked_at,
        created_by:user_id(email),
        revoked_by:revoked_by(email)
      `)
      .eq('id', keyId)
      .eq('workspace_id', workspace_id)
      .single()

    if (error || !apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: apiKey },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in workspace API key GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}