import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request)
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      )
    }

    const { user, workspace_id } = workspaceAccess

    if (!workspace_id) {
      console.error('Workspace ID is undefined after successful workspace access check');
      return NextResponse.json({ error: 'Internal server error: Workspace ID missing' }, { status: 500 });
    }

    // Check if user has permission to read products
    const { hasPermission } = await checkUserPermission( // Destructure hasPermission directly
      user.id,
      workspace_id,
      'DATA_VIEW'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view products' },
        { status: 403 }
      )
    }
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .eq('workspace_id', workspace_id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      console.error('Product fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(product)
    
  } catch (error) {
    console.error('Product API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request)
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      )
    }

    const { user, workspace_id } = workspaceAccess

    if (!workspace_id) {
      console.error('Workspace ID is undefined after successful workspace access check');
      return NextResponse.json({ error: 'Internal server error: Workspace ID missing' }, { status: 500 });
    }

    // Check if user has permission to write products
    const { hasPermission } = await checkUserPermission( // Destructure hasPermission directly
      user.id,
      workspace_id,
      'DATA_UPDATE'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to modify products' },
        { status: 403 }
      )
    }
    
    const updates = await request.json()
    
    // Remove id from updates to prevent conflicts
    const { id, ...productUpdates } = updates
    
    // Fetch current product state for audit logging comparison (optional, can be intensive)
    // For simplicity, we'll log the fact of update and fields attempted to change.
    // More advanced audit would log old/new values.

    const { data: product, error } = await supabase
      .from('products')
      .update({
        ...productUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('workspace_id', workspace_id)
      .select()
      .single()
    
    if (error) {
      // Log failed update attempt
      await supabase.from('job_logs').insert({
        job_id: `product_update_fail_${params.id}_${Date.now()}`,
        level: 'error',
        message: `User ${user.id} failed to update product ${params.id}.`,
        metadata: { user_id: user.id, workspace_id, product_id: params.id, error: error.message, updates_attempted: productUpdates }
      });
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      console.error('Product update error:', error)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(product)
    
  } catch (error) {
    console.error('Product update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createDutyLeakServerClient()
    
    // Check authentication and workspace access
    const workspaceAccess = await getWorkspaceAccess(request)
    if (!workspaceAccess.success) {
      return NextResponse.json(
        { error: workspaceAccess.error },
        { status: workspaceAccess.status }
      )
    }

    const { user, workspace_id } = workspaceAccess

    if (!workspace_id) {
      console.error('Workspace ID is undefined after successful workspace access check');
      return NextResponse.json({ error: 'Internal server error: Workspace ID missing' }, { status: 500 });
    }

    // Check if user has permission to delete products
    const { hasPermission } = await checkUserPermission( // Destructure hasPermission directly
      user.id,
      workspace_id,
      'DATA_DELETE'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete products' },
        { status: 403 }
      )
    }
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)
      .eq('workspace_id', workspace_id)
    
    if (error) {
      // Log failed delete attempt
      await supabase.from('job_logs').insert({
        job_id: `product_delete_fail_${params.id}_${Date.now()}`,
        level: 'error',
        message: `User ${user.id} failed to delete product ${params.id}.`,
        metadata: { user_id: user.id, workspace_id, product_id: params.id, error: error.message }
      });
      console.error('Product deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    // Log successful delete
    await supabase.from('job_logs').insert({
      job_id: `product_delete_success_${params.id}_${Date.now()}`,
      level: 'info',
      message: `User ${user.id} successfully deleted product ${params.id}.`,
      metadata: { user_id: user.id, workspace_id, product_id: params.id }
    });
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Product deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
