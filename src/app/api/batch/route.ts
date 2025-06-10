import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withWorkspaceAuth, WorkspaceContext } from '@/lib/middleware/auth-middleware'
import { withValidation, ValidationContext } from '@/lib/middleware/validation-middleware'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AppError } from '@/lib/error/error-handler'

// Request validation schema
const batchRequestSchema = z.object({
  product_ids: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
  operation_type: z.enum(['classify', 'optimize', 'validate', 'export'], {
    errorMap: () => ({ message: 'Invalid operation type' })
  }),
  options: z.object({
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    notify_on_completion: z.boolean().default(true)
  }).optional()
})

interface BatchValidation extends ValidationContext {
  body: z.infer<typeof batchRequestSchema>
}

export const POST = withWorkspaceAuth(
  withValidation<BatchValidation, []>(
    async (request: NextRequest, validation: BatchValidation, context: WorkspaceContext) => {
      const { body } = validation
      const { workspace, user } = context
      
      const supabase = createServerComponentClient({ cookies })
      
      // Verify products belong to workspace
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('workspace_id', workspace.id)
        .in('id', body.product_ids)
      
      if (productsError) {
        throw new AppError(
          'PRODUCT_VERIFICATION_ERROR',
          'Failed to verify products',
          'high',
          {
            component: 'batch',
            operation: 'verify_products',
            workspaceId: workspace.id,
            productIds: body.product_ids,
            originalError: productsError
          }
        )
      }
      
      if (products.length !== body.product_ids.length) {
        throw new AppError(
          'PRODUCT_ACCESS_DENIED',
          'Some products not found or access denied',
          'medium',
          {
            component: 'batch',
            operation: 'verify_products',
            workspaceId: workspace.id,
            requestedCount: body.product_ids.length,
            foundCount: products.length
          }
        )
      }
      
      // Create batch job
      const { data: job, error: jobError } = await supabase
        .from('batch_jobs')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          operation_type: body.operation_type,
          product_ids: body.product_ids,
          options: body.options || {},
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select(`
          id,
          operation_type,
          status,
          product_ids,
          options,
          created_at,
          updated_at
        `)
        .single()
      
      if (jobError) {
        throw new AppError(
          'BATCH_JOB_CREATE_ERROR',
          'Failed to create batch job',
          'high',
          {
            component: 'batch',
            operation: 'create_job',
            workspaceId: workspace.id,
            operationType: body.operation_type,
            originalError: jobError
          }
        )
      }
      
      return NextResponse.json({ job }, { status: 201 })
    },
    {
      body: batchRequestSchema
    },
    {
      component: 'batch',
      operation: 'create_batch_job'
    }
  ),
  {
    component: 'batch',
    operation: 'create_batch_job',
    requiredRole: 'member'
  }
)

const getBatchJobsSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
})

interface GetBatchValidation extends ValidationContext {
  query: z.infer<typeof getBatchJobsSchema>
}

export const GET = withWorkspaceAuth(
  withValidation<GetBatchValidation, []>(
    async (request: NextRequest, validation: GetBatchValidation, context: WorkspaceContext) => {
      const { query } = validation
      const { workspace, user } = context
      
      const supabase = createServerComponentClient({ cookies })
      
      // Build query for user's batch jobs in the workspace
      let queryBuilder = supabase
        .from('batch_jobs')
        .select(`
          id,
          operation_type,
          status,
          progress,
          total_items,
          processed_items,
          failed_items,
          product_ids,
          options,
          created_at,
          updated_at,
          completed_at,
          error_message
        `)
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(query.offset, query.offset + query.limit - 1)
      
      // Apply status filter if provided
      if (query.status) {
        queryBuilder = queryBuilder.eq('status', query.status)
      }
      
      const { data: jobs, error, count } = await queryBuilder
      
      if (error) {
        throw new AppError(
          'BATCH_JOBS_FETCH_ERROR',
          'Failed to fetch batch jobs',
          'high',
          {
            component: 'batch',
            operation: 'fetch_jobs',
            workspaceId: workspace.id,
            userId: user.id,
            originalError: error
          }
        )
      }
      
      return NextResponse.json({
        jobs,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: count || 0
        }
      })
    },
    {
      query: getBatchJobsSchema
    },
    {
      component: 'batch',
      operation: 'list_batch_jobs'
    }
  ),
  {
    component: 'batch',
    operation: 'list_batch_jobs',
    requiredRole: 'member'
  }
)