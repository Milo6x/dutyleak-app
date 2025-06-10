import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError, z } from 'zod'
import { ApiErrorHandler } from '../api-error-handler'
import { AuthMiddleware } from '../auth-middleware'
import { ValidationMiddleware } from '../validation-middleware'
import { AppError, createAppError } from '../../error/app-error'
import { ERROR_CODES } from '../../error/error-codes'

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

jest.mock('../../supabase/client', () => ({
  createClient: () => mockSupabase
}))

// Mock console methods
const originalConsole = { ...console }
beforeEach(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  Object.assign(console, originalConsole)
  jest.clearAllMocks()
})

describe('ApiErrorHandler', () => {
  let errorHandler: ApiErrorHandler
  let mockRequest: NextRequest

  beforeEach(() => {
    errorHandler = new ApiErrorHandler()
    mockRequest = new NextRequest('http://localhost:3000/api/test')
  })

  describe('handleApiError', () => {
    it('should handle AppError correctly', async () => {
      const appError = createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Test validation error',
        { field: 'email' }
      )

      const response = await errorHandler.handleApiError(appError, mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Test validation error',
          details: { field: 'email' }
        },
        success: false
      })
      expect(responseData.requestId).toBeDefined()
      expect(responseData.timestamp).toBeDefined()
    })

    it('should handle ZodError correctly', async () => {
      const schema = z.object({ email: z.string().email() })
      let zodError: ZodError
      
      try {
        schema.parse({ email: 'invalid-email' })
      } catch (error) {
        zodError = error as ZodError
      }

      const response = await errorHandler.handleApiError(zodError!, mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(responseData.error.message).toContain('Validation failed')
      expect(responseData.error.details.validationErrors).toBeDefined()
    })

    it('should handle generic Error correctly', async () => {
      const genericError = new Error('Something went wrong')

      const response = await errorHandler.handleApiError(genericError, mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.code).toBe('INTERNAL_SERVER_ERROR')
      expect(responseData.error.message).toBe('An unexpected error occurred')
    })

    it('should include more details in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      const response = await errorHandler.handleApiError(error, mockRequest)
      const responseData = await response.json()

      expect(responseData.error.details.originalMessage).toBe('Test error')
      expect(responseData.error.details.stack).toBeDefined()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('withApiErrorHandling', () => {
    it('should catch and handle errors from wrapped function', async () => {
      const handler = errorHandler.withApiErrorHandling(
        async () => {
          throw createAppError(ERROR_CODES.NOT_FOUND, 'Resource not found')
        },
        { component: 'test', operation: 'test-operation' }
      )

      const response = await handler(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error.code).toBe('NOT_FOUND')
    })

    it('should pass through successful responses', async () => {
      const successResponse = NextResponse.json({ success: true })
      const handler = errorHandler.withApiErrorHandling(
        async () => successResponse,
        { component: 'test', operation: 'test-operation' }
      )

      const response = await handler(mockRequest)
      const responseData = await response.json()

      expect(responseData.success).toBe(true)
    })
  })
})

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware
  let mockRequest: NextRequest

  beforeEach(() => {
    authMiddleware = new AuthMiddleware()
    mockRequest = new NextRequest('http://localhost:3000/api/test')
  })

  describe('requireAuth', () => {
    it('should return user context for valid session', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const context = await authMiddleware.requireAuth(mockRequest)

      expect(context.user).toEqual(mockSession.user)
      expect(context.session).toEqual(mockSession)
    })

    it('should throw UNAUTHORIZED error for missing session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(authMiddleware.requireAuth(mockRequest))
        .rejects
        .toThrow('Authentication required')
    })

    it('should throw UNAUTHORIZED error for auth error', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' }
      })

      await expect(authMiddleware.requireAuth(mockRequest))
        .rejects
        .toThrow('Authentication required')
    })
  })

  describe('requireWorkspaceAccess', () => {
    beforeEach(() => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
    })

    it('should return workspace context for valid access', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        role: 'admin'
      }
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockWorkspace,
        error: null
      })

      const mockRequestWithWorkspace = new NextRequest(
        'http://localhost:3000/api/workspaces/workspace-123/test'
      )

      const context = await authMiddleware.requireWorkspaceAccess(
        mockRequestWithWorkspace,
        { requiredRole: 'member' }
      )

      expect(context.workspace).toEqual(mockWorkspace)
      expect(context.user.id).toBe('user-123')
    })

    it('should throw ACCESS_DENIED for insufficient role', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        role: 'viewer'
      }
      
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockWorkspace,
        error: null
      })

      const mockRequestWithWorkspace = new NextRequest(
        'http://localhost:3000/api/workspaces/workspace-123/test'
      )

      await expect(
        authMiddleware.requireWorkspaceAccess(
          mockRequestWithWorkspace,
          { requiredRole: 'admin' }
        )
      ).rejects.toThrow('Insufficient permissions')
    })
  })

  describe('withAuth', () => {
    it('should pass auth context to handler', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = authMiddleware.withAuth(mockHandler)
      await wrappedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          user: mockSession.user,
          session: mockSession
        })
      )
    })
  })
})

describe('ValidationMiddleware', () => {
  let validationMiddleware: ValidationMiddleware
  let mockRequest: NextRequest

  beforeEach(() => {
    validationMiddleware = new ValidationMiddleware()
  })

  describe('validateBody', () => {
    it('should validate request body successfully', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })

      const mockBody = { name: 'John', email: 'john@example.com' }
      mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(mockBody)
      })

      const result = await validationMiddleware.validateBody(mockRequest, schema)
      expect(result).toEqual(mockBody)
    })

    it('should throw validation error for invalid body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })

      const mockBody = { name: '', email: 'invalid-email' }
      mockRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify(mockBody)
      })

      await expect(
        validationMiddleware.validateBody(mockRequest, schema)
      ).rejects.toBeInstanceOf(ZodError)
    })
  })

  describe('validateQuery', () => {
    it('should validate query parameters successfully', async () => {
      const schema = z.object({
        page: z.string().transform(Number).pipe(z.number().min(1)),
        limit: z.string().transform(Number).pipe(z.number().max(100))
      })

      mockRequest = new NextRequest(
        'http://localhost:3000/api/test?page=1&limit=10'
      )

      const result = await validationMiddleware.validateQuery(mockRequest, schema)
      expect(result).toEqual({ page: 1, limit: 10 })
    })
  })

  describe('withValidation', () => {
    it('should pass validation results to handler', async () => {
      const bodySchema = z.object({ name: z.string() })
      const querySchema = z.object({ page: z.string().transform(Number) })

      const mockBody = { name: 'Test' }
      mockRequest = new NextRequest(
        'http://localhost:3000/api/test?page=1',
        {
          method: 'POST',
          body: JSON.stringify(mockBody)
        }
      )

      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = validationMiddleware.withValidation(
        mockHandler,
        { body: bodySchema, query: querySchema }
      )

      await wrappedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          body: mockBody,
          query: { page: 1 }
        })
      )
    })
  })
})

describe('Integration Tests', () => {
  it('should work with all middleware combined', async () => {
    // Mock successful auth
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' }
    }
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    // Mock workspace access
    const mockWorkspace = {
      id: 'workspace-123',
      name: 'Test Workspace',
      role: 'admin'
    }
    mockSupabase.from().select().eq().single.mockResolvedValue({
      data: mockWorkspace,
      error: null
    })

    const bodySchema = z.object({ name: z.string().min(1) })
    const mockBody = { name: 'Test Product' }
    
    const mockRequest = new NextRequest(
      'http://localhost:3000/api/workspaces/workspace-123/products',
      {
        method: 'POST',
        body: JSON.stringify(mockBody)
      }
    )

    const authMiddleware = new AuthMiddleware()
    const validationMiddleware = new ValidationMiddleware()
    const errorHandler = new ApiErrorHandler()

    const handler = errorHandler.withApiErrorHandling(
      authMiddleware.withWorkspaceAuth(
        validationMiddleware.withValidation(
          async (request, validation, context) => {
            expect(validation.body).toEqual(mockBody)
            expect(context.user.id).toBe('user-123')
            expect(context.workspace.id).toBe('workspace-123')
            
            return NextResponse.json({ 
              success: true, 
              product: { id: 'product-123', ...validation.body }
            })
          },
          { body: bodySchema }
        ),
        { requiredRole: 'member' }
      ),
      { component: 'products', operation: 'create' }
    )

    const response = await handler(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.product.name).toBe('Test Product')
  })
})