import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AppError } from '@/lib/error/error-handler'
import { ApiErrorHandler } from './api-error-handler'

export interface AuthContext {
  user: {
    id: string
    email: string
    role?: string
  }
  session: {
    access_token: string
    refresh_token: string
  }
}

export interface WorkspaceContext extends AuthContext {
  workspace: {
    id: string
    name: string
    role: string
  }
}

/**
 * Authentication middleware for API routes
 */
export class AuthMiddleware {
  private static instance: AuthMiddleware
  private apiErrorHandler: ApiErrorHandler

  private constructor() {
    this.apiErrorHandler = ApiErrorHandler.getInstance()
  }

  static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware()
    }
    return AuthMiddleware.instance
  }

  /**
   * Require authentication for API route
   */
  async requireAuth(request: NextRequest): Promise<AuthContext> {
    try {
      const supabase = createServerComponentClient({ cookies })
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        throw new AppError(
          'AUTH_SESSION_ERROR',
          'Failed to retrieve session',
          'medium',
          {
            component: 'auth',
            operation: 'get_session',
            originalError: error
          }
        )
      }

      if (!session || !session.user) {
        throw new AppError(
          'UNAUTHORIZED',
          'Authentication required',
          'medium',
          {
            component: 'auth',
            operation: 'require_auth',
            path: request.nextUrl.pathname
          }
        )
      }

      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          role: session.user.user_metadata?.role
        },
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token!
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError(
        'AUTH_ERROR',
        'Authentication failed',
        'high',
        {
          component: 'auth',
          operation: 'require_auth',
          originalError: error
        }
      )
    }
  }

  /**
   * Require workspace access for API route
   */
  async requireWorkspaceAccess(
    request: NextRequest,
    workspaceId?: string,
    requiredRole?: 'owner' | 'admin' | 'member'
  ): Promise<WorkspaceContext> {
    try {
      const authContext = await this.requireAuth(request)
      const supabase = createServerComponentClient({ cookies })

      // Get workspace ID from URL params if not provided
      const targetWorkspaceId = workspaceId || this.extractWorkspaceIdFromUrl(request)
      
      if (!targetWorkspaceId) {
        throw new AppError(
          'WORKSPACE_ID_MISSING',
          'Workspace ID is required',
          'medium',
          {
            component: 'auth',
            operation: 'require_workspace_access',
            path: request.nextUrl.pathname
          }
        )
      }

      // Check workspace membership
      const { data: membership, error } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace:workspaces(
            id,
            name
          )
        `)
        .eq('workspace_id', targetWorkspaceId)
        .eq('user_id', authContext.user.id)
        .single()

      if (error || !membership) {
        throw new AppError(
          'WORKSPACE_ACCESS_DENIED',
          'Access to workspace denied',
          'medium',
          {
            component: 'auth',
            operation: 'require_workspace_access',
            workspaceId: targetWorkspaceId,
            userId: authContext.user.id
          }
        )
      }

      // Check role requirements
      if (requiredRole && !this.hasRequiredRole(membership.role, requiredRole)) {
        throw new AppError(
          'INSUFFICIENT_PERMISSIONS',
          `${requiredRole} role required`,
          'medium',
          {
            component: 'auth',
            operation: 'require_workspace_access',
            requiredRole,
            userRole: membership.role,
            workspaceId: targetWorkspaceId
          }
        )
      }

      return {
        ...authContext,
        workspace: {
          id: membership.workspace.id,
          name: membership.workspace.name,
          role: membership.role
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError(
        'WORKSPACE_ACCESS_ERROR',
        'Failed to verify workspace access',
        'high',
        {
          component: 'auth',
          operation: 'require_workspace_access',
          originalError: error
        }
      )
    }
  }

  /**
   * Check if user has required role
   */
  private hasRequiredRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      owner: 3,
      admin: 2,
      member: 1
    }

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

    return userLevel >= requiredLevel
  }

  /**
   * Extract workspace ID from URL parameters
   */
  private extractWorkspaceIdFromUrl(request: NextRequest): string | null {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    
    // Look for workspace ID in common patterns
    const workspaceIndex = pathSegments.findIndex(segment => segment === 'workspaces')
    if (workspaceIndex !== -1 && pathSegments[workspaceIndex + 1]) {
      return pathSegments[workspaceIndex + 1]
    }

    // Check query parameters
    return url.searchParams.get('workspace_id') || url.searchParams.get('workspaceId')
  }
}

/**
 * Higher-order function to wrap API routes with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>,
  options?: { component?: string; operation?: string }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authMiddleware = AuthMiddleware.getInstance()
    const apiErrorHandler = ApiErrorHandler.getInstance()
    
    try {
      const authContext = await authMiddleware.requireAuth(request)
      return await handler(request, authContext, ...args)
    } catch (error) {
      return apiErrorHandler.handleApiError(
        error as Error,
        request,
        options
      )
    }
  }
}

/**
 * Higher-order function to wrap API routes with workspace authentication
 */
export function withWorkspaceAuth<T extends any[]>(
  handler: (request: NextRequest, context: WorkspaceContext, ...args: T) => Promise<NextResponse>,
  options?: {
    component?: string
    operation?: string
    requiredRole?: 'owner' | 'admin' | 'member'
    workspaceId?: string
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authMiddleware = AuthMiddleware.getInstance()
    const apiErrorHandler = ApiErrorHandler.getInstance()
    
    try {
      const workspaceContext = await authMiddleware.requireWorkspaceAccess(
        request,
        options?.workspaceId,
        options?.requiredRole
      )
      return await handler(request, workspaceContext, ...args)
    } catch (error) {
      return apiErrorHandler.handleApiError(
        error as Error,
        request,
        {
          component: options?.component,
          operation: options?.operation
        }
      )
    }
  }
}