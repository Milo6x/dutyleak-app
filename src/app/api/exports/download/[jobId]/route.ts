import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceAccess } from '@/lib/permissions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId

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

    // Get export job details
    const { data: exportJob, error: jobError } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !exportJob) {
      return NextResponse.json(
        { error: 'Export job not found or access denied' },
        { status: 404 }
      )
    }

    // Check if job is completed
    if (exportJob.status !== 'completed') {
      return NextResponse.json(
        { error: 'Export job is not completed yet' },
        { status: 400 }
      )
    }

    // Generate the export data based on job type and format
    const exportData = await generateExportData(user.id, exportJob.type, exportJob.format)
    
    if (!exportData) {
      return NextResponse.json(
        { error: 'Failed to generate export data' },
        { status: 500 }
      )
    }

    // Set appropriate headers for file download
    const headers = new Headers()
    
    if (exportJob.format === 'csv') {
      headers.set('Content-Type', 'text/csv')
      headers.set('Content-Disposition', `attachment; filename="${exportJob.file_name || `export_${jobId}.csv`}"`)
    } else if (exportJob.format === 'json') {
      headers.set('Content-Type', 'application/json')
      headers.set('Content-Disposition', `attachment; filename="${exportJob.file_name || `export_${jobId}.json`}"`)
    }

    return new NextResponse(exportData.content, { headers })

  } catch (error) {
    console.error('Error downloading export file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateExportData(userId: string, type: string, format: string) {
  try {
    let data: any[] | any = []
    
    switch (type) {
      case 'full':
        const [products, calculations, classifications] = await Promise.all([
          supabase.from('products').select('*').eq('user_id', userId),
          supabase.from('duty_calculations').select('*').eq('workspace_id', userId),
          supabase.from('classifications').select('*').eq('workspace_id', userId)
        ])
        data = {
          products: products.data || [],
          calculations: calculations.data || [],
          classifications: classifications.data || []
        }
        break
        
      case 'products':
        const { data: productsData } = await supabase
          .from('products')
          .select(`
            id,
            title,
            asin,
            price_usd,
            fba_fee_estimate_usd,
            weight_lbs,
            dimensions_inches,
            category,
            brand,
            created_at,
            updated_at
          `)
          .eq('user_id', userId)
        data = productsData || []
        break
        
      case 'classifications':
        const { data: classificationsData } = await supabase
          .from('classifications')
          .select(`
            id,
            product_id,
            hs6,
            hs8,
            classification_code,
            description,
            confidence_score,
            source,
            is_active,
            created_at,
            updated_at
          `)
          .eq('workspace_id', userId)
        data = classificationsData || []
        break
        
      case 'calculations':
        const { data: calculationsData } = await supabase
          .from('duty_calculations')
          .select(`
            id,
            product_id,
            classification_id,
            destination_country,
            product_value,
            shipping_cost,
            insurance_cost,
            duty_percentage,
            duty_amount,
            vat_percentage,
            vat_amount,
            fba_fee_amount,
            total_landed_cost,
            created_at,
            updated_at
          `)
          .eq('workspace_id', userId)
        data = calculationsData || []
        break
        
      case 'workspace':
        // Export workspace-level data
        const [workspaceProducts, workspaceCalcs, workspaceClassifications, workspaceUsers] = await Promise.all([
          supabase.from('products').select('*').eq('workspace_id', userId),
          supabase.from('duty_calculations').select('*').eq('workspace_id', userId),
          supabase.from('classifications').select('*').eq('workspace_id', userId),
          supabase.from('workspace_users').select('*').eq('workspace_id', userId)
        ])
        data = {
          products: workspaceProducts.data || [],
          calculations: workspaceCalcs.data || [],
          classifications: workspaceClassifications.data || [],
          users: workspaceUsers.data || []
        }
        break
        
      default:
        throw new Error(`Unsupported export type: ${type}`)
    }

    // Generate file content based on format
    let content = ''
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
    } else if (format === 'csv') {
      content = convertToCSV(data)
    } else {
      throw new Error(`Unsupported format: ${format}`)
    }

    return { content }

  } catch (error) {
    console.error('Error generating export data:', error)
    return null
  }
}

function convertToCSV(data: any): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return ''
  }

  // Handle object with multiple arrays (full export)
  if (!Array.isArray(data) && typeof data === 'object') {
    let csvContent = ''
    
    Object.keys(data).forEach((key, index) => {
      if (index > 0) {csvContent += '\n\n'}
      csvContent += `=== ${key.toUpperCase()} ===\n`
      
      const arrayData = data[key]
      if (Array.isArray(arrayData) && arrayData.length > 0) {
        csvContent += convertArrayToCSV(arrayData)
      } else {
        csvContent += 'No data available\n'
      }
    })
    
    return csvContent
  }

  // Handle simple array
  if (Array.isArray(data)) {
    return convertArrayToCSV(data)
  }

  return ''
}

function convertArrayToCSV(array: any[]): string {
  if (!array || array.length === 0) {
    return 'No data available\n'
  }

  // Get headers from first object
  const headers = Object.keys(array[0])
  const csvRows = [headers.join(',')]
  
  // Convert each row
  array.forEach(row => {
    const values = headers.map(header => {
      const value = row[header]
      if (value === null || value === undefined) {
        return ''
      }
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}