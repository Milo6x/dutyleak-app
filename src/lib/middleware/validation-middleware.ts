import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { AppError } from '@/lib/error/error-handler'
import { ApiErrorHandler } from './api-error-handler'

export interface ValidationContext {
  body?: any
  query?: any
  params?: any
}

/**
 * Validation middleware for API routes
 */
export class ValidationMiddleware {
  private static instance: ValidationMiddleware
  private apiErrorHandler: ApiErrorHandler

  private constructor() {
    this.apiErrorHandler = ApiErrorHandler.getInstance()
  }

  static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware()
    }
    return ValidationMiddleware.instance
  }

  /**
   * Validate request body
   */
  async validateBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
    try {
      const body = await this.parseRequestBody(request)
      return schema.parse(body)
    } catch (error) {
      if (error instanceof ZodError) {
        throw this.createValidationError(error, 'body')
      }
      
      throw new AppError(
        'BODY_PARSE_ERROR',
        'Failed to parse request body',
        'medium',
        {
          component: 'validation',
          operation: 'parse_body',
          originalError: error
        }
      )
    }
  }

  /**
   * Validate query parameters
   */
  validateQuery<T>(request: NextRequest, schema: ZodSchema<T>): T {
    try {
      const query = this.parseQueryParams(request)
      return schema.parse(query)
    } catch (error) {
      if (error instanceof ZodError) {
        throw this.createValidationError(error, 'query')
      }
      
      throw new AppError(
        'QUERY_PARSE_ERROR',
        'Failed to parse query parameters',
        'medium',
        {
          component: 'validation',
          operation: 'parse_query',
          originalError: error
        }
      )
    }
  }

  /**
   * Validate URL parameters
   */
  validateParams<T>(params: any, schema: ZodSchema<T>): T {
    try {
      return schema.parse(params)
    } catch (error) {
      if (error instanceof ZodError) {
        throw this.createValidationError(error, 'params')
      }
      
      throw new AppError(
        'PARAMS_PARSE_ERROR',
        'Failed to parse URL parameters',
        'medium',
        {
          component: 'validation',
          operation: 'parse_params',
          originalError: error
        }
      )
    }
  }

  /**
   * Validate complete request
   */
  async validateRequest<T extends ValidationContext>(
    request: NextRequest,
    schemas: {
      body?: ZodSchema<any>
      query?: ZodSchema<any>
      params?: ZodSchema<any>
    },
    routeParams?: any
  ): Promise<T> {
    const result: any = {}

    try {
      // Validate body if schema provided
      if (schemas.body) {
        result.body = await this.validateBody(request, schemas.body)
      }

      // Validate query if schema provided
      if (schemas.query) {
        result.query = this.validateQuery(request, schemas.query)
      }

      // Validate params if schema provided
      if (schemas.params && routeParams) {
        result.params = this.validateParams(routeParams, schemas.params)
      }

      return result as T
    } catch (error) {
      // Re-throw validation errors as-is
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError(
        'VALIDATION_ERROR',
        'Request validation failed',
        'medium',
        {
          component: 'validation',
          operation: 'validate_request',
          originalError: error
        }
      )
    }
  }

  /**
   * Parse request body safely
   */
  private async parseRequestBody(request: NextRequest): Promise<any> {
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      try {
        return await request.json()
      } catch (error) {
        throw new AppError(
          'INVALID_JSON',
          'Invalid JSON in request body',
          'medium',
          {
            component: 'validation',
            operation: 'parse_json',
            contentType
          }
        )
      }
    }
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await request.formData()
        const result: Record<string, any> = {}
        
        for (const [key, value] of formData.entries()) {
          result[key] = value
        }
        
        return result
      } catch (error) {
        throw new AppError(
          'INVALID_FORM_DATA',
          'Invalid form data in request body',
          'medium',
          {
            component: 'validation',
            operation: 'parse_form_data',
            contentType
          }
        )
      }
    }
    
    // For other content types or empty body
    return {}
  }

  /**
   * Parse query parameters
   */
  private parseQueryParams(request: NextRequest): Record<string, any> {
    const url = new URL(request.url)
    const params: Record<string, any> = {}
    
    for (const [key, value] of url.searchParams.entries()) {
      // Handle array parameters (key[])
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2)
        if (!params[arrayKey]) {
          params[arrayKey] = []
        }
        params[arrayKey].push(this.parseValue(value))
      } else {
        // Handle multiple values for the same key
        if (params[key]) {
          if (Array.isArray(params[key])) {
            params[key].push(this.parseValue(value))
          } else {
            params[key] = [params[key], this.parseValue(value)]
          }
        } else {
          params[key] = this.parseValue(value)
        }
      }
    }
    
    return params
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string): any {
    // Boolean values
    if (value === 'true') return true
    if (value === 'false') return false
    
    // Null/undefined values
    if (value === 'null') return null
    if (value === 'undefined') return undefined
    
    // Number values
    if (/^-?\d+$/.test(value)) {
      const num = parseInt(value, 10)
      if (!isNaN(num)) return num
    }
    
    if (/^-?\d*\.\d+$/.test(value)) {
      const num = parseFloat(value)
      if (!isNaN(num)) return num
    }
    
    // Return as string
    return value
  }

  /**
   * Create validation error from Zod error
   */
  private createValidationError(error: ZodError, source: 'body' | 'query' | 'params'): AppError {
    const issues = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      received: issue.received
    }))

    return new AppError(
      'VALIDATION_ERROR',
      `${source} validation failed`,
      'medium',
      {
        component: 'validation',
        operation: `validate_${source}`,
        source,
        issues
      }
    )
  }
}

/**
 * Higher-order function to wrap API routes with validation
 */
export function withValidation<T extends ValidationContext, U extends any[]>(
  handler: (request: NextRequest, validation: T, ...args: U) => Promise<NextResponse>,
  schemas: {
    body?: ZodSchema<any>
    query?: ZodSchema<any>
    params?: ZodSchema<any>
  },
  options?: { component?: string; operation?: string }
) {
  return async (request: NextRequest, routeParams?: any, ...args: U): Promise<NextResponse> => {
    const validationMiddleware = ValidationMiddleware.getInstance()
    const apiErrorHandler = ApiErrorHandler.getInstance()
    
    try {
      const validation = await validationMiddleware.validateRequest<T>(
        request,
        schemas,
        routeParams
      )
      
      return await handler(request, validation, ...args)
    } catch (error) {
      return apiErrorHandler.handleApiError(
        error as Error,
        request,
        options
      )
    }
  }
}

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).optional()
  }),
  
  // Sorting
  sorting: z.object({
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).default('asc')
  }),
  
  // Filtering
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  }),
  
  // IDs
  uuid: z.string().uuid(),
  positiveInt: z.coerce.number().int().positive(),
  
  // Common fields
  email: z.string().email(),
  url: z.string().url(),
  
  // Workspace params
  workspaceParams: z.object({
    id: z.string().uuid()
  })
}