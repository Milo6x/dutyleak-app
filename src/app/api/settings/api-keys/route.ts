import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { encryptApiKey } from '@/lib/encryption/api-key-encryption'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request)
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

    const { service_name, api_key } = await request.json()

    if (!service_name || !api_key) {
      return NextResponse.json(
        { error: 'Service name and API key are required' },
        { status: 400 }
      )
    }

    // Validate service name
    const validServices = ['openai', 'anthropic', 'customs']
    if (!validServices.includes(service_name)) {
      return NextResponse.json(
        { error: 'Invalid service name' },
        { status: 400 }
      )
    }

    // Encrypt the API key
    const encryptedApiKey = encryptApiKey(api_key)

    // Check if API key already exists for this workspace and service
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('service_name', service_name)
      .single()

    if (existingKey) {
      // Update existing key
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({
          api_key: encryptedApiKey,
          is_active: true,
          test_status: 'pending',
          last_tested: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingKey.id)

      if (updateError) {
        console.error('Error updating API key:', updateError)
        return NextResponse.json(
          { error: 'Failed to update API key' },
          { status: 500 }
        )
      }
    } else {
      // Insert new key
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          workspace_id: workspace_id,
          service_name,
          api_key: encryptedApiKey,
          is_active: true,
          test_status: 'pending'
        })

      if (insertError) {
        console.error('Error inserting API key:', insertError)
        return NextResponse.json(
          { error: 'Failed to save API key' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: true, message: 'API key saved successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in API keys endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request)
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      )
    }

    const { user, workspace_id } = workspaceAccess

    // Check if user has permission to read API keys
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
      .from('api_keys')
      .select('service_name, is_active, test_status, last_tested')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    // Transform the data to a more convenient format
    const keyStatus = apiKeys.reduce((acc, key) => {
      acc[key.service_name] = {
        status: key.test_status,
        lastTested: key.last_tested
      }
      return acc
    }, {} as Record<string, { status: string; lastTested: string | null }>)

    return NextResponse.json(
      { success: true, data: keyStatus },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in API keys GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}