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

    // Fetch export jobs for the user
    const { data: exportJobs, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    return NextResponse.json(exportJobs || [])
  } catch (error) {
    console.error('Error fetching export jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const { type, format } = await request.json()

    if (!type || !format) {
      return NextResponse.json(
        { error: 'Export type and format are required' },
        { status: 400 }
      )
    }

    // Create new export job
    const { data: exportJob, error } = await supabase
      .from('export_jobs')
      .insert({
        user_id: user.id,
        type,
        format,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Start background processing (in a real app, this would be a queue job)
    processExportJob(exportJob.id, user.id, type, format)

    return NextResponse.json(exportJob)
  } catch (error) {
    console.error('Error creating export job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background processing function (simplified)
async function processExportJob(jobId: string, userId: string, type: string, format: string) {
  try {
    // Update status to processing
    await supabase
      .from('export_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get data based on export type
    let data: any = []
    let fileName = ''
    
    switch (type) {
      case 'full':
        const [products, calculations, classifications] = await Promise.all([
          supabase.from('products').select('*').eq('user_id', userId),
          supabase.from('landed_cost_calculations').select('*').eq('user_id', userId),
          supabase.from('classification_queue').select('*').eq('user_id', userId)
        ])
        data = {
          products: products.data || [],
          calculations: calculations.data || [],
          classifications: classifications.data || []
        }
        fileName = `full_export_${Date.now()}.${format}`
        break
        
      case 'products':
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
        data = productsData || []
        fileName = `products_export_${Date.now()}.${format}`
        break
        
      case 'classifications':
        const { data: classificationsData } = await supabase
          .from('classification_queue')
          .select('*')
          .eq('user_id', userId)
        data = classificationsData || []
        fileName = `classifications_export_${Date.now()}.${format}`
        break
        
      case 'calculations':
        const { data: calculationsData } = await supabase
          .from('landed_cost_calculations')
          .select('*')
          .eq('user_id', userId)
        data = calculationsData || []
        fileName = `calculations_export_${Date.now()}.${format}`
        break
    }

    // Generate file content based on format
    let fileContent = ''
    let fileSize = 0
    
    if (format === 'json') {
      fileContent = JSON.stringify(data, null, 2)
    } else if (format === 'csv') {
      // Convert to CSV (simplified)
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0])
        const csvRows = [headers.join(',')]
        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header]
            return typeof value === 'string' ? `"${value}"` : value
          })
          csvRows.push(values.join(','))
        })
        fileContent = csvRows.join('\n')
      }
    }
    
    fileSize = new Blob([fileContent]).size
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1)

    // In a real app, you would upload the file to storage and get a download URL
    const downloadUrl = `/api/exports/download/${jobId}`

    // Update job as completed
    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        download_url: downloadUrl,
        file_size: `${fileSizeMB} MB`,
        file_name: fileName
      })
      .eq('id', jobId)

  } catch (error) {
    console.error('Error processing export job:', error)
    
    // Update job as failed
    await supabase
      .from('export_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId)
  }
}