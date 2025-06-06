import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = params
    const body = await request.json()
    const { 
      includeHistory = true, 
      includeAuditLogs = true, 
      includeAnalytics = true,
      filters = {}
    } = body
    
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Verify user has access to this product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, description')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const exportData: any = {
      product: {
        id: product.id,
        name: product.name,
        description: product.description
      },
      exportedAt: new Date().toISOString(),
      exportedBy: user.id
    }

    // Fetch classification history
    if (includeHistory) {
      try {
        const historyResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/classification/history/${productId}`,
          {
            headers: {
              'Cookie': request.headers.get('cookie') || ''
            }
          }
        )
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          exportData.history = applyFilters(historyData.history || [], filters)
        }
      } catch (error) {
        console.error('Error fetching history for export:', error)
        exportData.history = []
      }
    }

    // Fetch audit logs
    if (includeAuditLogs) {
      const { data: auditLogs, error: auditError } = await supabase
        .from('job_logs')
        .select('*')
        .eq('classification_data->>product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1000) // Limit to prevent excessive data

      if (!auditError) {
        exportData.auditLogs = auditLogs || []
      } else {
        console.error('Error fetching audit logs for export:', auditError)
        exportData.auditLogs = []
      }
    }

    // Fetch analytics
    if (includeAnalytics) {
      try {
        const analyticsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/classification/analytics/${productId}`,
          {
            headers: {
              'Cookie': request.headers.get('cookie') || ''
            }
          }
        )
        
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json()
          exportData.analytics = analyticsData.analytics
        }
      } catch (error) {
        console.error('Error fetching analytics for export:', error)
        exportData.analytics = null
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(exportData)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="classification-audit-${productId}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      const json = JSON.stringify(exportData, null, 2)
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="classification-audit-${productId}-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }
  } catch (error) {
    console.error('Classification export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function applyFilters(history: any[], filters: any) {
  return history.filter(item => {
    // Source filter
    if (filters.source && filters.source !== 'all' && item.source !== filters.source) {
      return false
    }
    
    // Confidence filter
    if (filters.confidence && filters.confidence !== 'all') {
      const confidence = item.confidence_score || 0
      if (filters.confidence === 'high' && confidence < 0.8) {return false}
      if (filters.confidence === 'medium' && (confidence < 0.6 || confidence >= 0.8)) {return false}
      if (filters.confidence === 'low' && confidence >= 0.6) {return false}
    }
    
    // Date filter
    if (filters.date && filters.date !== 'all') {
      const itemDate = new Date(item.created_at)
      const now = new Date()
      const daysAgo = filters.date === '7d' ? 7 : filters.date === '30d' ? 30 : 90
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      if (itemDate < cutoff) {return false}
    }
    
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase()
      return (
        item.hs6?.toLowerCase().includes(query) ||
        item.hs8?.toLowerCase().includes(query) ||
        item.source?.toLowerCase().includes(query) ||
        item.ruling_reference?.toLowerCase().includes(query)
      )
    }
    
    return true
  })
}

function convertToCSV(data: any): string {
  const lines: string[] = []
  
  // Add header information
  lines.push('# Classification Audit Export')
  lines.push(`# Product: ${data.product.name}`)
  lines.push(`# Exported: ${data.exportedAt}`)
  lines.push('')
  
  // Classification History CSV
  if (data.history && data.history.length > 0) {
    lines.push('## Classification History')
    lines.push('ID,HS6,HS8,Confidence Score,Source,Ruling Reference,Is Active,Created At,Updated At,Change Reason,Previous HS Code')
    
    data.history.forEach((item: any) => {
      const row = [
        item.id || '',
        item.hs6 || '',
        item.hs8 || '',
        item.confidence_score || '',
        item.source || '',
        item.ruling_reference || '',
        item.is_active ? 'Yes' : 'No',
        item.created_at || '',
        item.updated_at || '',
        item.change_reason || '',
        item.previous_hs_code || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`)
      
      lines.push(row.join(','))
    })
    lines.push('')
  }
  
  // Audit Logs CSV
  if (data.auditLogs && data.auditLogs.length > 0) {
    lines.push('## Audit Logs')
    lines.push('ID,User ID,Created At,Updated At,Classification Data')
    
    data.auditLogs.forEach((log: any) => {
      const row = [
        log.id || '',
        log.user_id || '',
        log.created_at || '',
        log.updated_at || '',
        JSON.stringify(log.classification_data || {})
      ].map(field => `"${String(field).replace(/"/g, '""')}"`)
      
      lines.push(row.join(','))
    })
    lines.push('')
  }
  
  // Analytics Summary
  if (data.analytics) {
    lines.push('## Analytics Summary')
    lines.push('Metric,Value')
    lines.push(`"Total Classifications","${data.analytics.totalClassifications}"`)
    lines.push(`"Accuracy Rate","${data.analytics.accuracyRate}%"`)
    lines.push(`"Average Confidence","${data.analytics.averageConfidence}%"`)
    lines.push('')
    
    // Source breakdown
    lines.push('## Source Breakdown')
    lines.push('Source,Count')
    Object.entries(data.analytics.sourceBreakdown || {}).forEach(([source, count]) => {
      lines.push(`"${source}","${count}"`)
    })
    lines.push('')
    
    // User activity
    if (data.analytics.userActivity && data.analytics.userActivity.length > 0) {
      lines.push('## User Activity')
      lines.push('User ID,User Name,Classification Count,Last Activity')
      data.analytics.userActivity.forEach((user: any) => {
        const row = [
          user.userId || '',
          user.userName || '',
          user.count || '',
          user.lastActivity || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`)
        
        lines.push(row.join(','))
      })
    }
  }
  
  return lines.join('\n')
}