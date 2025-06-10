# Application-Wide Error Handling Guide

This guide explains the standardized error handling system implemented across the DutyLeak application.

## Overview

The error handling system consists of several middleware components that work together to provide:

- **Consistent error responses** across all API routes
- **Structured error logging** with context and metadata
- **Authentication and authorization** with proper error handling
- **Request validation** with detailed error messages
- **Automatic error categorization** and severity levels

## Core Components

### 1. API Error Handler (`/src/lib/middleware/api-error-handler.ts`)

Handles all API errors consistently and provides structured error responses.

**Features:**
- Standardized error response format
- Error categorization (validation, database, authentication, etc.)
- Request ID generation for tracking
- Development vs production error details
- Integration with existing error logging system

### 2. Authentication Middleware (`/src/lib/middleware/auth-middleware.ts`)

Provides authentication and workspace access control with proper error handling.

**Features:**
- Session validation
- Workspace membership verification
- Role-based access control
- Detailed error context for debugging

### 3. Validation Middleware (`/src/lib/middleware/validation-middleware.ts`)

Handles request validation using Zod schemas with comprehensive error reporting.

**Features:**
- Body, query, and parameter validation
- Detailed validation error messages
- Type-safe request parsing
- Common validation schemas

## Usage Examples

### Basic API Route with Error Handling

```typescript
import { withApiErrorHandling } from '@/lib/middleware/api-error-handler'

export const GET = withApiErrorHandling(
  async (request: NextRequest) => {
    // Your route logic here
    return NextResponse.json({ data: 'success' })
  },
  {
    component: 'your-component',
    operation: 'your-operation'
  }
)
```

### API Route with Authentication

```typescript
import { withAuth, AuthContext } from '@/lib/middleware/auth-middleware'

export const GET = withAuth(
  async (request: NextRequest, context: AuthContext) => {
    const { user, session } = context
    // Your authenticated route logic here
    return NextResponse.json({ user: user.id })
  },
  {
    component: 'your-component',
    operation: 'your-operation'
  }
)
```

### API Route with Workspace Authentication

```typescript
import { withWorkspaceAuth, WorkspaceContext } from '@/lib/middleware/auth-middleware'

export const POST = withWorkspaceAuth(
  async (request: NextRequest, context: WorkspaceContext) => {
    const { user, workspace } = context
    // Your workspace-scoped route logic here
    return NextResponse.json({ workspace: workspace.id })
  },
  {
    component: 'your-component',
    operation: 'your-operation',
    requiredRole: 'member' // 'owner', 'admin', or 'member'
  }
)
```

### API Route with Validation

```typescript
import { z } from 'zod'
import { withValidation, ValidationContext } from '@/lib/middleware/validation-middleware'

const requestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1)
})

interface MyValidation extends ValidationContext {
  body: z.infer<typeof requestSchema>
  query: z.infer<typeof querySchema>
}

export const POST = withValidation<MyValidation, []>(
  async (request: NextRequest, validation: MyValidation) => {
    const { body, query } = validation
    // Your validated route logic here
    return NextResponse.json({ success: true })
  },
  {
    body: requestSchema,
    query: querySchema
  },
  {
    component: 'your-component',
    operation: 'your-operation'
  }
)
```

### Complete Example (Authentication + Validation)

```typescript
import { z } from 'zod'
import { withWorkspaceAuth, WorkspaceContext } from '@/lib/middleware/auth-middleware'
import { withValidation, ValidationContext, commonSchemas } from '@/lib/middleware/validation-middleware'

const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional()
})

interface CreateItemValidation extends ValidationContext {
  body: z.infer<typeof createItemSchema>
  params: z.infer<typeof commonSchemas.workspaceParams>
}

export const POST = withWorkspaceAuth(
  withValidation<CreateItemValidation, []>(
    async (request: NextRequest, validation: CreateItemValidation, context: WorkspaceContext) => {
      const { body } = validation
      const { workspace, user } = context
      
      // Your route logic here
      return NextResponse.json({ success: true })
    },
    {
      body: createItemSchema,
      params: commonSchemas.workspaceParams
    },
    {
      component: 'items',
      operation: 'create_item'
    }
  ),
  {
    component: 'items',
    operation: 'create_item',
    requiredRole: 'member'
  }
)
```

## Error Response Format

All API errors now return a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/your-endpoint",
  "requestId": "req_1234567890_abcdef123",
  "details": {
    // Only in development mode
    "message": "Detailed error message",
    "stack": "Error stack trace",
    "context": {
      // Additional error context
    }
  }
}
```

## Common Error Codes

### Authentication Errors
- `UNAUTHORIZED`: No valid session
- `AUTH_SESSION_ERROR`: Failed to retrieve session
- `AUTH_ERROR`: General authentication failure

### Authorization Errors
- `WORKSPACE_ACCESS_DENIED`: No access to workspace
- `INSUFFICIENT_PERMISSIONS`: User role insufficient
- `WORKSPACE_ID_MISSING`: Workspace ID not provided

### Validation Errors
- `VALIDATION_ERROR`: Request validation failed
- `INVALID_JSON`: Malformed JSON in request body
- `INVALID_FORM_DATA`: Malformed form data

### Database Errors
- `DATABASE_ERROR`: General database error
- `DUPLICATE_ENTRY`: Unique constraint violation
- `FOREIGN_KEY_VIOLATION`: Foreign key constraint violation
- `NOT_NULL_VIOLATION`: Required field missing
- `CONNECTION_FAILURE`: Database connection failed

## Common Validation Schemas

The system provides common validation schemas for frequent use cases:

```typescript
import { commonSchemas } from '@/lib/middleware/validation-middleware'

// Pagination
commonSchemas.pagination // { page, limit, offset }

// Sorting
commonSchemas.sorting // { sort_by, sort_order }

// Date ranges
commonSchemas.dateRange // { start_date, end_date }

// Common types
commonSchemas.uuid // UUID validation
commonSchemas.positiveInt // Positive integer
commonSchemas.email // Email validation
commonSchemas.url // URL validation

// Workspace parameters
commonSchemas.workspaceParams // { id: uuid }
```

## Error Logging

All errors are automatically logged with enhanced context:

```typescript
{
  code: 'ERROR_CODE',
  message: 'Error message',
  severity: 'high',
  timestamp: '2024-01-01T00:00:00.000Z',
  context: {
    component: 'api-component',
    operation: 'specific-operation',
    requestId: 'req_1234567890_abcdef123',
    path: '/api/endpoint',
    method: 'POST',
    userAgent: 'Mozilla/5.0...',
    ip: '192.168.1.1',
    workspaceId: 'workspace-uuid',
    userId: 'user-uuid'
  }
}
```

## Migration Guide

### Updating Existing Routes

1. **Replace manual authentication checks:**
   ```typescript
   // Before
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   
   // After
   export const POST = withAuth(async (request, context) => {
     const { user } = context
     // Your logic here
   })
   ```

2. **Replace manual validation:**
   ```typescript
   // Before
   const body = await request.json()
   if (!body.name) {
     return NextResponse.json({ error: 'Name required' }, { status: 400 })
   }
   
   // After
   const schema = z.object({ name: z.string().min(1) })
   export const POST = withValidation(async (request, validation) => {
     const { body } = validation
     // body.name is guaranteed to exist and be valid
   }, { body: schema })
   ```

3. **Replace manual error handling:**
   ```typescript
   // Before
   try {
     // Your logic
   } catch (error) {
     console.error(error)
     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
   }
   
   // After
   export const POST = withApiErrorHandling(async (request) => {
     // Your logic - errors are automatically handled
   })
   ```

## Best Practices

1. **Always use middleware for new routes** - Don't implement manual authentication or validation
2. **Provide meaningful error context** - Include component and operation information
3. **Use appropriate error codes** - Choose specific error codes over generic ones
4. **Validate all inputs** - Use Zod schemas for type safety and validation
5. **Handle errors at the right level** - Let middleware handle common errors, only catch specific business logic errors
6. **Use structured logging** - Include relevant context in error logs
7. **Test error scenarios** - Ensure error handling works as expected

## Testing Error Handling

Test your error handling by:

1. **Invalid authentication** - Test with no session, expired session
2. **Invalid authorization** - Test with wrong workspace, insufficient permissions
3. **Invalid validation** - Test with malformed requests, missing fields
4. **Database errors** - Test with invalid data, constraint violations
5. **Network errors** - Test with connection failures, timeouts

The error handling system will provide consistent, informative responses for all these scenarios.