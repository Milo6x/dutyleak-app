import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withWorkspaceAuth, WorkspaceContext } from '@/lib/middleware/auth-middleware'
import { withValidation, ValidationContext, commonSchemas } from '@/lib/middleware/validation-middleware'
import { withApiErrorHandling } from '@/lib/middleware/api-error-handler'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AppError } from '@/lib/error/error-handler'

// Request validation schemas
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  hs_code: z.string().optional(),
  category_id: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive()
  }).optional()
})

const querySchema = z.object({
  ...commonSchemas.pagination.shape,
  ...commonSchemas.sorting.shape,
  category: z.string().optional(),
  search: z.string().optional()
})

const paramsSchema = commonSchemas.workspaceParams

interface ProductValidation extends ValidationContext {
  body: z.infer<typeof createProductSchema>
  query: z.infer<typeof querySchema>
  params: z.infer<typeof paramsSchema>
}

/**
 * GET /api/workspaces/[id]/products
 * Get products for a workspace with pagination and filtering
 */
export const GET = withWorkspaceAuth(
  withValidation<ProductValidation, []>(
    async (request: NextRequest, validation: ProductValidation, context: WorkspaceContext) => {
      const { query } = validation
      const { workspace } = context
      
      const supabase = createServerComponentClient({ cookies })
      
      // Build query with filters
      let queryBuilder = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          hs_code,
          price,
          weight,
          dimensions,
          created_at,
          updated_at,
          category:categories(id, name)
        `)
        .eq('workspace_id', workspace.id)
      
      // Apply filters
      if (query.category) {
        queryBuilder = queryBuilder.eq('category_id', query.category)
      }
      
      if (query.search) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query.search}%,description.ilike.%${query.search}%,hs_code.ilike.%${query.search}%`
        )
      }
      
      // Apply sorting
      if (query.sort_by) {
        queryBuilder = queryBuilder.order(query.sort_by, { ascending: query.sort_order === 'asc' })
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false })
      }
      
      // Apply pagination
      const offset = query.offset || (query.page - 1) * query.limit
      queryBuilder = queryBuilder.range(offset, offset + query.limit - 1)
      
      const { data: products, error, count } = await queryBuilder
      
      if (error) {
        throw new AppError(
          'DATABASE_QUERY_ERROR',
          'Failed to fetch products',
          'high',
          {
            component: 'products',
            operation: 'fetch_products',
            workspaceId: workspace.id,
            originalError: error
          }
        )
      }
      
      return NextResponse.json({
        products,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / query.limit)
        }
      })
    },
    {
      query: querySchema,
      params: paramsSchema
    },
    {
      component: 'products',
      operation: 'list_products'
    }
  ),
  {
    component: 'products',
    operation: 'list_products',
    requiredRole: 'member'
  }
)

/**
 * POST /api/workspaces/[id]/products
 * Create a new product in the workspace
 */
export const POST = withWorkspaceAuth(
  withValidation<ProductValidation, []>(
    async (request: NextRequest, validation: ProductValidation, context: WorkspaceContext) => {
      const { body } = validation
      const { workspace, user } = context
      
      const supabase = createServerComponentClient({ cookies })
      
      // Validate category exists if provided
      if (body.category_id) {
        const { data: category, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('id', body.category_id)
          .eq('workspace_id', workspace.id)
          .single()
        
        if (categoryError || !category) {
          throw new AppError(
            'CATEGORY_NOT_FOUND',
            'Category not found in workspace',
            'medium',
            {
              component: 'products',
              operation: 'create_product',
              categoryId: body.category_id,
              workspaceId: workspace.id
            }
          )
        }
      }
      
      // Create product
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          ...body,
          workspace_id: workspace.id,
          created_by: user.id
        })
        .select(`
          id,
          name,
          description,
          hs_code,
          price,
          weight,
          dimensions,
          created_at,
          updated_at,
          category:categories(id, name)
        `)
        .single()
      
      if (error) {
        throw new AppError(
          'PRODUCT_CREATE_ERROR',
          'Failed to create product',
          'high',
          {
            component: 'products',
            operation: 'create_product',
            workspaceId: workspace.id,
            originalError: error
          }
        )
      }
      
      return NextResponse.json({ product }, { status: 201 })
    },
    {
      body: createProductSchema,
      params: paramsSchema
    },
    {
      component: 'products',
      operation: 'create_product'
    }
  ),
  {
    component: 'products',
    operation: 'create_product',
    requiredRole: 'member'
  }
)

/**
 * Example of a simple route with just error handling (no auth/validation)
 */
export const OPTIONS = withApiErrorHandling(
  async (request: NextRequest) => {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  },
  {
    component: 'products',
    operation: 'options'
  }
)