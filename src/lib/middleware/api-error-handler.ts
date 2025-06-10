import { NextRequest, NextResponse } from 'next/server'
import { AppError, ErrorHandler } from '@/lib/error/error-handler'
import { ZodError } from 'zod'
import { PostgrestError } from '@supabase/supabase-js'

// Standard API error response format
export interface ApiErrorResponse {
  error: string
  code?: string
  details?: any
  timestamp: string
  path: string
  requestId?: string
}

// Enhanced error handler for API routes
export class ApiErrorHandler {
  private static instance: ApiErrorHandler
  private errorHandler: ErrorHandler

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance()
  }

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  /**
   * Handle and format API errors consistently
   */
  handleApiError(
    error: Error | AppError | ZodError | PostgrestError,
    request: NextRequest,
    context?: { component?: string; operation?: string }
  ): NextResponse {
    const requestId = this.generateRequestId()
    const timestamp = new Date().toISOString()
    const path = request.nextUrl.pathname

    // Handle different error types
    let appError: AppError
    let statusCode: number
    let errorResponse: ApiErrorResponse

    if (error instanceof AppError) {
      appError = error
      statusCode = this.getStatusCodeFromSeverity(appError.severity)
    } else if (error instanceof ZodError) {
      appError = this.handleValidationError(error)
      statusCode = 400
    } else if (this.isPostgrestError(error)) {
      appError = this.handleDatabaseError(error as PostgrestError)
      statusCode = this.getStatusCodeFromDatabaseError(error as PostgrestError)
    } else {
      // Generic error handling
      appError = this.errorHandler.createAppError(error, {
        component: context?.component || 'api',
        operation: context?.operation || 'unknown',
        requestId,
        path
      })
      statusCode = 500
    }

    // Log the error with enhanced context
    this.errorHandler.logError({
      ...appError,
      context: {
        ...appError.context,
        requestId,
        path,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: this.getClientIp(request)
      }
    })

    // Create standardized error response
    errorResponse = {
      error: this.getSafeErrorMessage(appError, statusCode),
      code: appError.code,
      timestamp,
      path,
      requestId
    }

    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        message: appError.message,
        stack: appError.stack,
        context: appError.context
      }
    }

    return NextResponse.json(errorResponse, { status: statusCode })
  }

  /**
   * Handle Zod validation errors
   */
  private handleValidationError(error: ZodError): AppError {
    const issues = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }))

    return new AppError(
      'VALIDATION_ERROR',
      'Request validation failed',
      'medium',
      {
        component: 'validation',
        operation: 'request_validation',
        validationIssues: issues
      }
    )
  }

  /**
   * Handle Supabase/PostgreSQL errors
   */
  private handleDatabaseError(error: PostgrestError): AppError {
    const errorCode = this.mapDatabaseErrorCode(error.code)
    
    return new AppError(
      errorCode,
      'Database operation failed',
      'high',
      {
        component: 'database',
        operation: 'query',
        originalError: {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        }
      }
    )
  }

  /**
   * Map database error codes to application error codes
   */
  private mapDatabaseErrorCode(dbCode: string): string {
    const errorMap: Record<string, string> = {
      '23505': 'DUPLICATE_ENTRY',
      '23503': 'FOREIGN_KEY_VIOLATION',
      '23502': 'NOT_NULL_VIOLATION',
      '42P01': 'TABLE_NOT_FOUND',
      '42703': 'COLUMN_NOT_FOUND',
      '08006': 'CONNECTION_FAILURE',
      '53300': 'TOO_MANY_CONNECTIONS',
      'PGRST116': 'PERMISSION_DENIED'
    }

    return errorMap[dbCode] || 'DATABASE_ERROR'
  }

  /**
   * Get HTTP status code from database error
   */
  private getStatusCodeFromDatabaseError(error: PostgrestError): number {
    const statusMap: Record<string, number> = {
      '23505': 409, // Conflict
      '23503': 400, // Bad Request
      '23502': 400, // Bad Request
      '42P01': 500, // Internal Server Error
      '42703': 500, // Internal Server Error
      '08006': 503, // Service Unavailable
      '53300': 503, // Service Unavailable
      'PGRST116': 403 // Forbidden
    }

    return statusMap[error.code] || 500
  }

  /**
   * Get HTTP status code from error severity
   */
  private getStatusCodeFromSeverity(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const severityMap = {
      low: 400,
      medium: 400,
      high: 500,
      critical: 500
    }
    return severityMap[severity]
  }

  /**
   * Get safe error message for client
   */
  private getSafeErrorMessage(error: AppError, statusCode: number): string {
    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production') {
      const safeMessages: Record<number, string> = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        409: 'Conflict',
        422: 'Unprocessable Entity',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout'
      }
      return safeMessages[statusCode] || 'An error occurred'
    }

    return error.message
  }

  /**
   * Check if error is a Postgrest error
   */
  private isPostgrestError(error: any): boolean {
    return error && typeof error === 'object' && 'code' in error && 'message' in error
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    if (realIp) {
      return realIp
    }
    
    return 'unknown'
  }
}

/**
 * Higher-order function to wrap API route handlers with error handling
 */
export function withApiErrorHandling<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  context?: { component?: string; operation?: string }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const apiErrorHandler = ApiErrorHandler.getInstance()
    
    try {
      return await handler(request, ...args)
    } catch (error) {
      return apiErrorHandler.handleApiError(
        error as Error,
        request,
        context
      )
    }
  }
}

/**
 * Middleware for consistent API error responses
 */
export function createApiErrorMiddleware() {
  return {
    handleError: (error: Error, request: NextRequest, context?: { component?: string; operation?: string }) => {
      const apiErrorHandler = ApiErrorHandler.getInstance()
      return apiErrorHandler.handleApiError(error, request, context)
    }
  }
}