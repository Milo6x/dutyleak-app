import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Define available roles
export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type WorkspaceRole = typeof WORKSPACE_ROLES[number]

// Role hierarchy for permission checks
export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
} as const

// Define permissions for different actions
export const PERMISSIONS = {
  // Workspace management
  WORKSPACE_UPDATE: ['owner'] as WorkspaceRole[],
  WORKSPACE_DELETE: ['owner'] as WorkspaceRole[],
  WORKSPACE_VIEW: ['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[],
  
  // Member management
  MEMBER_INVITE: ['owner', 'admin'] as WorkspaceRole[],
  MEMBER_REMOVE: ['owner', 'admin'] as WorkspaceRole[],
  MEMBER_ROLE_CHANGE: ['owner', 'admin'] as WorkspaceRole[],
  MEMBER_VIEW: ['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[],
  
  // Data management
  DATA_CREATE: ['owner', 'admin', 'member'] as WorkspaceRole[],
  DATA_UPDATE: ['owner', 'admin', 'member'] as WorkspaceRole[],
  DATA_DELETE: ['owner', 'admin'] as WorkspaceRole[],
  DATA_VIEW: ['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[],
  DATA_EXPORT: ['owner', 'admin', 'member'] as WorkspaceRole[],
  
  // Settings management
  SETTINGS_UPDATE: ['owner', 'admin'] as WorkspaceRole[],
  SETTINGS_VIEW: ['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[],
  
  // API keys management
  API_KEYS_CREATE: ['owner', 'admin'] as WorkspaceRole[],
  API_KEYS_UPDATE: ['owner', 'admin'] as WorkspaceRole[],
  API_KEYS_DELETE: ['owner', 'admin'] as WorkspaceRole[],
  API_KEYS_VIEW: ['owner', 'admin'] as WorkspaceRole[],
  
  // Review queue management
  REVIEW_APPROVE: ['owner', 'admin', 'member'] as WorkspaceRole[],
  REVIEW_REJECT: ['owner', 'admin', 'member'] as WorkspaceRole[],
  REVIEW_VIEW: ['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[],
  
  // Analytics and reports
  ANALYTICS_VIEW: ['owner', 'admin', 'member', 'viewer'] as WorkspaceRole[],
  REPORTS_GENERATE: ['owner', 'admin', 'member'] as WorkspaceRole[],
  
  // Import/Export
  IMPORT_DATA: ['owner', 'admin', 'member'] as WorkspaceRole[],
  EXPORT_DATA: ['owner', 'admin', 'member'] as WorkspaceRole[]
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if a role has permission for a specific action
 */
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role)
}

/**
 * Check if a role can perform an action on another role
 * (e.g., can admin change member's role?)
 */
export function canActOnRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * Check if a role can assign another role
 * (can't assign a role equal or higher than own)
 */
export function canAssignRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * Get user's role in a specific workspace
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<{ role: WorkspaceRole | null; error?: string }> {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: userWorkspace, error } = await supabase
      .from('workspace_users')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !userWorkspace) {
      return { role: null, error: 'User not found in workspace' }
    }

    return { role: userWorkspace.role as WorkspaceRole }
  } catch (error) {
    console.error('Error getting user workspace role:', error)
    return { role: null, error: 'Failed to get user role' }
  }
}

/**
 * Check if user has permission for a specific action in a workspace
 */
export async function checkUserPermission(
  userId: string,
  workspaceId: string,
  permission: Permission
): Promise<{ hasPermission: boolean; role?: WorkspaceRole; error?: string }> {
  const { role, error } = await getUserWorkspaceRole(userId, workspaceId)
  
  if (error || !role) {
    return { hasPermission: false, error }
  }

  return {
    hasPermission: hasPermission(role, permission),
    role
  }
}

/**
 * Middleware function to check permissions for API routes
 */
export async function requirePermission(
  permission: Permission,
  workspaceId: string,
  userId?: string
): Promise<{ authorized: boolean; role?: WorkspaceRole; error?: string }> {
  try {
    // If userId not provided, get from auth
    let currentUserId = userId
    if (!currentUserId) {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return { authorized: false, error: 'Unauthorized' }
      }
      currentUserId = user.id
    }

    const { hasPermission: permitted, role, error } = await checkUserPermission(
      currentUserId,
      workspaceId,
      permission
    )

    if (error) {
      return { authorized: false, error }
    }

    return { authorized: permitted, role }
  } catch (error) {
    console.error('Error in requirePermission:', error)
    return { authorized: false, error: 'Permission check failed' }
  }
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: WorkspaceRole): Permission[] {
  return Object.entries(PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(role))
    .map(([permission]) => permission as Permission)
}

/**
 * Check if user is workspace owner
 */
export async function isWorkspaceOwner(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { role } = await getUserWorkspaceRole(userId, workspaceId)
  return role === 'owner'
}

/**
 * Check if user is workspace admin or owner
 */
export async function isWorkspaceAdmin(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { role } = await getUserWorkspaceRole(userId, workspaceId)
  return role === 'owner' || role === 'admin'
}

/**
 * Get user's workspace access level (overloaded for supabase client)
 */
export async function getWorkspaceAccess(
  supabase: SupabaseClient
): Promise<{
  user: any
  workspace_id: string
}>

/**
 * Get user's workspace access level (overloaded for request)
 */
export async function getWorkspaceAccess(
  request: NextRequest,
  workspaceId?: string
): Promise<{
  success: boolean
  user?: any
  workspace_id?: string
  error?: string
  status?: number
}>

/**
 * Get user's workspace access level (original signature)
 */
export async function getWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<{
  hasAccess: boolean
  role?: WorkspaceRole
  permissions?: Permission[]
  error?: string
}>

/**
 * Implementation of getWorkspaceAccess with multiple overloads
 */
export async function getWorkspaceAccess(
  param1: SupabaseClient | NextRequest | string,
  param2?: string
): Promise<any> {
  // Handle supabase client parameter
  if (param1 && typeof param1 === 'object' && 'auth' in param1) {
    const supabase = param1 as SupabaseClient
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get user's current workspace (first workspace)
    const { data: userWorkspace, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single()

    if (workspaceError || !userWorkspace) {
      throw new Error('No workspace access found')
    }

    return {
      user,
      workspace_id: userWorkspace.workspace_id
    }
  }
  
  // Handle NextRequest parameter
  if (param1 && typeof param1 === 'object' && 'url' in param1) {
    const request = param1 as NextRequest
    const workspaceId = param2
    
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return {
          success: false,
          error: 'Unauthorized',
          status: 401
        }
      }

      let workspace_id = workspaceId
      
      // If no workspace ID provided, get user's first workspace
      if (!workspace_id) {
        const { data: userWorkspace, error: workspaceError } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', user.id)
          .single()

        if (workspaceError || !userWorkspace) {
          return {
            success: false,
            error: 'No workspace access found',
            status: 403
          }
        }
        
        workspace_id = userWorkspace.workspace_id
      } else {
        // Verify user has access to the specified workspace
        const { data: userWorkspace, error: accessError } = await supabase
          .from('workspace_users')
          .select('workspace_id')
          .eq('user_id', user.id)
          .eq('workspace_id', workspace_id)
          .single()

        if (accessError || !userWorkspace) {
          return {
            success: false,
            error: 'Workspace access denied',
            status: 403
          }
        }
      }

      return {
        success: true,
        user,
        workspace_id
      }
    } catch (error) {
      console.error('Error in getWorkspaceAccess:', error)
      return {
        success: false,
        error: 'Internal server error',
        status: 500
      }
    }
  }
  
  // Handle original signature (userId, workspaceId)
  if (typeof param1 === 'string' && typeof param2 === 'string') {
    const userId = param1
    const workspaceId = param2
    
    const { role, error } = await getUserWorkspaceRole(userId, workspaceId)
    
    if (error || !role) {
      return { hasAccess: false, error }
    }

    return {
      hasAccess: true,
      role,
      permissions: getRolePermissions(role)
    }
  }
  
  throw new Error('Invalid parameters for getWorkspaceAccess')
}