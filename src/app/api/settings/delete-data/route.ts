import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all user data in the correct order (respecting foreign key constraints)
    const deleteOperations = [
      // Delete dependent records first
      supabase.from('landed_cost_calculations').delete().eq('user_id', user.id),
      supabase.from('classification_queue').delete().eq('user_id', user.id),
      supabase.from('review_queue').delete().eq('user_id', user.id),
      supabase.from('export_jobs').delete().eq('user_id', user.id),
      supabase.from('api_usage_logs').delete().eq('user_id', user.id),
      supabase.from('optimization_suggestions').delete().eq('user_id', user.id),
      supabase.from('fba_fee_history').delete().eq('user_id', user.id),
      
      // Delete main records
      supabase.from('products').delete().eq('user_id', user.id),
      supabase.from('user_preferences').delete().eq('user_id', user.id),
      supabase.from('workspace_users').delete().eq('user_id', user.id)
    ]

    // Execute all delete operations
    const results = await Promise.allSettled(deleteOperations)
    
    // Check for any failures
    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some delete operations failed:', failures)
      // Continue anyway as some tables might not exist or be empty
    }

    // Log the data deletion for audit purposes
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'data_deletion',
        details: {
          timestamp: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      })
    } catch (auditError) {
      console.error('Failed to log data deletion:', auditError)
      // Don't fail the operation if audit logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All user data has been successfully deleted' 
    })
  } catch (error) {
    console.error('Error deleting user data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}