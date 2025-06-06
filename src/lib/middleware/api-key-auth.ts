import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export interface ApiKeyAuthResult {
  success: boolean
  error?: string
  status?: number
  workspace_id?: string
  api_key_id?: string
  permissions?: string[]
}

/**
 * Authenticate requests using workspace-scoped API keys
 * @param request - The incoming request
 * @param requiredPermissions - Array of permissions required for this endpoint
 * @returns Authentication result with workspace context
 */
export async function authenticateApiKey(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<ApiKeyAuthResult> {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
        status: 401
      }
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // Validate API key format
    if (!apiKey.startsWith('dk_') || apiKey.length !== 67) {
      return {
        success: false,
        error: 'Invalid API key format',
        status: 401
      }
    }

    // Hash the provided key for database lookup
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    // Create Supabase client with service role for API key validation
    const supabase = createRouteHandlerClient({ cookies })

    // Look up the API key in the database
    const { data: apiKeyData, error: keyError } = await supabase
      .from('workspace_api_keys')
      .select(`
        id,
        workspace_id,
        permissions,
        is_active,
        expires_at,
        last_used_at
      `)
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (keyError || !apiKeyData) {
      return {
        success: false,
        error: 'Invalid API key',
        status: 401
      }
    }

    // Check if the key has expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return {
        success: false,
        error: 'API key has expired',
        status: 401
      }
    }

    // Check if the key has the required permissions
    const keyPermissions = apiKeyData.permissions || []
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      keyPermissions.includes(permission) || keyPermissions.includes('*')
    )

    if (requiredPermissions.length > 0 && !hasRequiredPermissions) {
      return {
        success: false,
        error: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        status: 403
      }
    }

    // Update last_used_at timestamp (fire and forget)
    supabase
      .from('workspace_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id)
      .then(() => {}) // Ignore result

    return {
      success: true,
      workspace_id: apiKeyData.workspace_id,
      api_key_id: apiKeyData.id,
      permissions: keyPermissions
    }
  } catch (error) {
    console.error('Error in API key authentication:', error)
    return {
      success: false,
      error: 'Internal server error during authentication',
      status: 500
    }
  }
}

/**
 * Higher-order function to wrap API route handlers with API key authentication
 * @param handler - The original route handler
 * @param requiredPermissions - Array of permissions required for this endpoint
 * @returns Wrapped handler with API key authentication
 */
export function withApiKeyAuth(
  handler: (request: NextRequest, context: any, authResult: ApiKeyAuthResult) => Promise<NextResponse>,
  requiredPermissions: string[] = []
) {
  return async (request: NextRequest, context: any) => {
    const authResult = await authenticateApiKey(request, requiredPermissions)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    return handler(request, context, authResult)
  }
}

/**
 * Middleware function for API key authentication that can be used in middleware.ts
 * @param request - The incoming request
 * @param requiredPermissions - Array of permissions required
 * @returns NextResponse or null if authentication passes
 */
export async function apiKeyMiddleware(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<NextResponse | null> {
  const authResult = await authenticateApiKey(request, requiredPermissions)
  
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  // Add workspace context to request headers for downstream handlers
  const response = NextResponse.next()
  response.headers.set('x-workspace-id', authResult.workspace_id!)
  response.headers.set('x-api-key-id', authResult.api_key_id!)
  response.headers.set('x-api-permissions', JSON.stringify(authResult.permissions))
  
  return null // Continue to the next middleware/handler
}