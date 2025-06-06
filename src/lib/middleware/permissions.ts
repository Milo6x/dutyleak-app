import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceAccess, checkUserPermission, Permission } from '../permissions'

/**
 * Higher-order function that wraps API route handlers with permission checks
 * @param permission - The permission required to access the endpoint
 * @param handler - The actual API route handler
 * @returns Wrapped handler with permission checks
 */
export function withPermission(
  permission: Permission,
  handler: (request: NextRequest, context: any, workspaceData: { user: any; workspace_id: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any = {}) => {
    try {
      // Check authentication and workspace access
      const workspaceAccess = await getWorkspaceAccess(request)
      if (!workspaceAccess.success) {
        return NextResponse.json(
          { error: workspaceAccess.error },
          { status: workspaceAccess.status }
        )
      }

      const { user, workspace_id } = workspaceAccess

      // Ensure workspace_id is defined
      if (!workspace_id) {
        return NextResponse.json(
          { error: 'Workspace ID not found' },
          { status: 400 }
        )
      }

      // Check if user has the required permission
      const hasPermission = await checkUserPermission(
        user.id,
        workspace_id,
        permission
      )

      if (!hasPermission) {
        return NextResponse.json(
          { error: `Insufficient permissions. Required: ${permission}` },
          { status: 403 }
        )
      }

      // Call the original handler with workspace data
      return await handler(request, context, { user, workspace_id })
    } catch (error) {
      console.error('Permission middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware for routes that require multiple permissions (any one of them)
 * @param permissions - Array of permissions, user needs at least one
 * @param handler - The actual API route handler
 * @returns Wrapped handler with permission checks
 */
export function withAnyPermission(
  permissions: Permission[],
  handler: (request: NextRequest, context: any, workspaceData: { user: any; workspace_id: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any = {}) => {
    try {
      // Check authentication and workspace access
      const workspaceAccess = await getWorkspaceAccess(request)
      if (!workspaceAccess.success) {
        return NextResponse.json(
          { error: workspaceAccess.error },
          { status: workspaceAccess.status }
        )
      }

      const { user, workspace_id } = workspaceAccess

      // Ensure workspace_id is defined
      if (!workspace_id) {
        return NextResponse.json(
          { error: 'Workspace ID not found' },
          { status: 400 }
        )
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = await Promise.all(
        permissions.map(permission => 
          checkUserPermission(user.id, workspace_id, permission)
        )
      ).then(results => results.some(Boolean))

      if (!hasAnyPermission) {
        return NextResponse.json(
          { error: `Insufficient permissions. Required one of: ${permissions.join(', ')}` },
          { status: 403 }
        )
      }

      // Call the original handler with workspace data
      return await handler(request, context, { user, workspace_id })
    } catch (error) {
      console.error('Permission middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware for routes that require all specified permissions
 * @param permissions - Array of permissions, user needs all of them
 * @param handler - The actual API route handler
 * @returns Wrapped handler with permission checks
 */
export function withAllPermissions(
  permissions: Permission[],
  handler: (request: NextRequest, context: any, workspaceData: { user: any; workspace_id: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: any = {}) => {
    try {
      // Check authentication and workspace access
      const workspaceAccess = await getWorkspaceAccess(request)
      if (!workspaceAccess.success) {
        return NextResponse.json(
          { error: workspaceAccess.error },
          { status: workspaceAccess.status }
        )
      }

      const { user, workspace_id } = workspaceAccess

      // Ensure workspace_id is defined
      if (!workspace_id) {
        return NextResponse.json(
          { error: 'Workspace ID not found' },
          { status: 400 }
        )
      }

      // Check if user has all required permissions
      const hasAllPermissions = await Promise.all(
        permissions.map(permission => 
          checkUserPermission(user.id, workspace_id, permission)
        )
      ).then(results => results.every(Boolean))

      if (!hasAllPermissions) {
        return NextResponse.json(
          { error: `Insufficient permissions. Required all of: ${permissions.join(', ')}` },
          { status: 403 }
        )
      }

      // Call the original handler with workspace data
      return await handler(request, context, { user, workspace_id })
    } catch (error) {
      console.error('Permission middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware for workspace owner-only routes
 * @param handler - The actual API route handler
 * @returns Wrapped handler with owner checks
 */
export function withOwnerOnly(
  handler: (request: NextRequest, context: any, workspaceData: { user: any; workspace_id: string }) => Promise<NextResponse>
) {
  return withPermission('WORKSPACE_DELETE', handler)
}

/**
 * Middleware for admin-only routes (owner or admin)
 * @param handler - The actual API route handler
 * @returns Wrapped handler with admin checks
 */
export function withAdminOnly(
  handler: (request: NextRequest, context: any, workspaceData: { user: any; workspace_id: string }) => Promise<NextResponse>
) {
  return withAnyPermission(['WORKSPACE_DELETE', 'WORKSPACE_UPDATE'], handler)
}