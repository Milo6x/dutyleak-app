import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { encryptApiKey } from '@/lib/encryption/api-key-encryption'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'
import crypto from 'crypto'

// Generate a new API key for the workspace
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const workspaceId = params.id
    
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
      'API_KEYS_CREATE'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage API keys' },
        { status: 403 }
      )
    }

    const { name, permissions, expires_at } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      )
    }

    // Generate a secure API key
    const apiKey = `dk_${crypto.randomBytes(32).toString('hex')}`
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')

    // Insert new API key
    const { data: newKey, error: insertError } = await supabase
      .from('workspace_api_keys')
      .insert({
        workspace_id: workspace_id,
        user_id: user.id,
        name,
        key_hash: hashedKey,
        permissions: permissions || [],
        expires_at: expires_at || null,
        is_active: true
      })
      .select('id, name, permissions, created_at, expires_at')
      .single()

    if (insertError) {
      console.error('Error creating API key:', insertError)
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'API key created successfully',
        data: {
          ...newKey,
          key: apiKey // Only return the key once on creation
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in workspace API keys POST endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// List all API keys for the workspace
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const workspaceId = params.id
    
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

    // Fetch all API keys for the workspace
    const { data: apiKeys, error } = await supabase
      .from('workspace_api_keys')
      .select(`
        id,
        name,
        permissions,
        is_active,
        created_at,
        last_used_at,
        expires_at,
        created_by:user_id(email)
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: apiKeys },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in workspace API keys GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}