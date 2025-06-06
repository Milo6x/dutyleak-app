import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
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

    // Check if user has permission to manage products
    const hasPermission = await checkUserPermission(
      user.id,
      workspace_id,
      'DATA_UPDATE'
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage products' },
        { status: 403 }
      )
    }
    
    const { operation, productIds, data } = await request.json()
    
    if (!operation || !productIds || !Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: operation, productIds' },
        { status: 400 }
      )
    }
    
    let result
    
    switch (operation) {
      case 'classify':
        // Bulk classification
        if (!data?.classification) {
          return NextResponse.json(
            { error: 'Classification data required' },
            { status: 400 }
          )
        }
        
        result = await supabase
          .from('products')
          .update({
            hs_code: data.classification.hs_code,
            hs_description: data.classification.hs_description,
            duty_rate: data.classification.duty_rate,
            classification_confidence: data.classification.confidence,
            classification_source: 'bulk_operation',
            updated_at: new Date().toISOString()
          })
          .in('id', productIds)
          .eq('workspace_id', workspace_id)
        
        break
        
      case 'categorize':
        // Bulk categorization
        if (!data?.category) {
          return NextResponse.json(
            { error: 'Category data required' },
            { status: 400 }
          )
        }
        
        result = await supabase
          .from('products')
          .update({
            category: data.category,
            subcategory: data.subcategory || null,
            updated_at: new Date().toISOString()
          })
          .in('id', productIds)
          .eq('workspace_id', workspace_id)
        
        break
        
      case 'delete':
        // Bulk deletion
        result = await supabase
          .from('products')
          .delete()
          .in('id', productIds)
          .eq('workspace_id', workspace_id)
        
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid operation. Supported: classify, categorize, delete' },
          { status: 400 }
        )
    }
    
    if (result.error) {
      console.error('Bulk operation error:', result.error)
      return NextResponse.json(
        { error: 'Failed to perform bulk operation' },
        { status: 500 }
      )
    }
    
    // Log the bulk operation
    await supabase
      .from('import_history')
      .insert({
        type: 'bulk_operation',
        status: 'completed',
        total_records: productIds.length,
        processed_records: productIds.length,
        workspace_id: workspace_id,
        metadata: {
          operation,
          product_ids: productIds,
          data
        },
        created_at: new Date().toISOString()
      })
    
    return NextResponse.json({
      success: true,
      operation,
      affected_count: productIds.length,
      message: `Successfully performed ${operation} on ${productIds.length} products`
    })
    
  } catch (error) {
    console.error('Bulk operation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}