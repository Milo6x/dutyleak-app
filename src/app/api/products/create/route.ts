import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'
import { z } from 'zod'

// Define a schema for product creation payload
const productCreateSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  asin: z.string().optional().nullable(),
  cost: z.number().positive({ message: 'Cost must be a positive number' }).optional().nullable(),
  category: z.string().optional().nullable(),
  // Add other fields from your products table as needed, e.g.:
  // weight: z.number().optional().nullable(),
  // dimensions_length: z.number().optional().nullable(),
  // dimensions_width: z.number().optional().nullable(),
  // dimensions_height: z.number().optional().nullable(),
  // country_of_origin: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()

    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request)
    if (!workspaceAccess.success || !workspaceAccess.user || !workspaceAccess.workspace_id) {
      return NextResponse.json(
        { error: workspaceAccess.error || 'Unauthorized or workspace access denied' },
        { status: workspaceAccess.status || 401 }
      )
    }
    const { user, workspace_id } = workspaceAccess

    // Check if user has permission to create products
    const { hasPermission } = await checkUserPermission(user.id, workspace_id, 'DATA_CREATE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create products' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = productCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const productData = {
      ...validationResult.data,
      workspace_id: workspace_id,
      // user_id: user.id, // If you want to associate product with the creator user
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      // Log failed creation attempt
      await supabase.from('job_logs').insert({
        job_id: `product_create_fail_${Date.now()}`,
        level: 'error',
        message: `User ${user.id} failed to create product.`,
        metadata: { user_id: user.id, workspace_id, error: error.message, data_attempted: productData }
      });
      return NextResponse.json(
        { error: 'Failed to create product', details: error.message },
        { status: 500 }
      )
    }

    // Log successful creation
    await supabase.from('job_logs').insert({
      job_id: `product_create_success_${newProduct.id}_${Date.now()}`,
      level: 'info',
      message: `User ${user.id} successfully created product ${newProduct.id}.`,
      metadata: { user_id: user.id, workspace_id, product_id: newProduct.id, title: newProduct.title }
    });

    return NextResponse.json(newProduct, { status: 201 })

  } catch (error) {
    console.error('Product creation API error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
