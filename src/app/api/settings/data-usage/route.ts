import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
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

    // Get data usage statistics
    const [classificationsResult, optimizationsResult, apiCallsResult] = await Promise.all([
      // Count classifications
      supabase
        .from('classification_queue')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id),
      
      // Count optimizations (products with calculations)
      supabase
        .from('landed_cost_calculations')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id),
      
      // Count API calls (from audit logs if available)
      supabase
        .from('api_usage_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Get storage usage (approximate based on data)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)

    const { data: calculations } = await supabase
      .from('landed_cost_calculations')
      .select('*')
      .eq('user_id', user.id)

    // Calculate approximate storage in MB
    const productsSize = products ? JSON.stringify(products).length : 0
    const calculationsSize = calculations ? JSON.stringify(calculations).length : 0
    const totalBytes = productsSize + calculationsSize
    const storageMB = totalBytes / (1024 * 1024)

    // Get last export date
    const { data: lastExport } = await supabase
      .from('export_jobs')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const dataUsage = {
      classifications: classificationsResult.count || 0,
      optimizations: optimizationsResult.count || 0,
      api_calls: apiCallsResult.count || 0,
      storage_mb: Math.round(storageMB * 100) / 100,
      last_export: lastExport?.created_at || null
    }

    return NextResponse.json(dataUsage)
  } catch (error) {
    console.error('Error fetching data usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}