import { NextRequest, NextResponse } from 'next/server'
import { createDutyLeakServerClient } from '@/lib/supabase/server'
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions'
import * as Papa from 'papaparse'

interface ImportJob {
  id: string
  type: 'full' | 'products' | 'classifications' | 'calculations' | 'workspace'
  format: 'json' | 'csv'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  file_name: string
  file_size?: string
  imported_count?: number
  failed_count?: number
  error_message?: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch import jobs for the user
    const { data: importJobs, error } = await supabase
      .from('import_history')
      .select('*')
      .eq('workspace_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    return NextResponse.json(importJobs || [])
  } catch (error) {
    console.error('Error fetching import jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient()
    
    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase)
    await checkUserPermission(user.id, workspace_id, 'IMPORT_DATA')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const format = formData.get('format') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (!type || !format) {
      return NextResponse.json(
        { error: 'Import type and format are required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/json', 'text/csv', 'text/plain']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JSON and CSV files are allowed' },
        { status: 400 }
      )
    }

    // Create new import job
    const { data: importJob, error } = await supabase
      .from('import_history')
      .insert({
        workspace_id,
        type,
        format,
        status: 'pending',
        file_name: file.name,
        file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Start background processing
    processImportJob(importJob.id, user.id, workspace_id, file, type, format)

    return NextResponse.json(importJob)
  } catch (error) {
    console.error('Error creating import job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background processing function
async function processImportJob(
  jobId: string, 
  userId: string, 
  workspaceId: string,
  file: File, 
  type: string, 
  format: string
) {
  const supabase = createDutyLeakServerClient()
  
  try {
    // Update status to processing
    await supabase
      .from('import_history')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Read and parse file content
    const fileContent = await file.text()
    let data: any[] = []
    
    if (format === 'json') {
      try {
        const parsed = JSON.parse(fileContent)
        data = Array.isArray(parsed) ? parsed : [parsed]
      } catch (parseError) {
        throw new Error('Invalid JSON format')
      }
    } else if (format === 'csv') {
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true
      })
      
      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing error: ${parseResult.errors.map(e => e.message).join(', ')}`)
      }
      
      data = parseResult.data as any[]
    }

    if (data.length === 0) {
      throw new Error('No data found in file')
    }

    // Process data based on import type
    let importedCount = 0
    let failedCount = 0
    
    switch (type) {
      case 'products':
        const productResults = await importProducts(supabase, data, userId, workspaceId)
        importedCount = productResults.imported
        failedCount = productResults.failed
        break
        
      case 'classifications':
        const classificationResults = await importClassifications(supabase, data, userId, workspaceId)
        importedCount = classificationResults.imported
        failedCount = classificationResults.failed
        break
        
      case 'calculations':
        const calculationResults = await importCalculations(supabase, data, userId, workspaceId)
        importedCount = calculationResults.imported
        failedCount = calculationResults.failed
        break
        
      case 'workspace':
        const workspaceResults = await importWorkspaceSettings(supabase, data, userId, workspaceId)
        importedCount = workspaceResults.imported
        failedCount = workspaceResults.failed
        break
        
      case 'full':
        // Handle full data import (combination of all types)
        const fullResults = await importFullData(supabase, data, userId, workspaceId)
        importedCount = fullResults.imported
        failedCount = fullResults.failed
        break
        
      default:
        throw new Error(`Unsupported import type: ${type}`)
    }

    // Update job as completed
    await supabase
      .from('import_history')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        imported_count: importedCount,
        failed_count: failedCount
      })
      .eq('id', jobId)

  } catch (error) {
    console.error('Error processing import job:', error)
    
    // Update job as failed
    await supabase
      .from('import_history')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId)
  }
}

// Import functions for different data types
async function importProducts(supabase: any, data: any[], userId: string, workspaceId: string) {
  let imported = 0
  let failed = 0
  
  for (const item of data) {
    try {
      // Validate required fields
      if (!item.title || !item.sku) {
        failed++
        continue
      }
      
      // Insert or update product
      const { error } = await supabase
        .from('products')
        .upsert({
          user_id: userId,
          workspace_id: workspaceId,
          title: item.title,
          description: item.description || '',
          sku: item.sku,
          asin: item.asin || null,
          price: parseFloat(item.price) || 0,
          cost: parseFloat(item.cost) || 0,
          weight: parseFloat(item.weight) || 0,
          length: parseFloat(item.length) || 0,
          width: parseFloat(item.width) || 0,
          height: parseFloat(item.height) || 0,
          hs_code: item.hsCode || item.hs_code || null,
          country_of_origin: item.countryOfOrigin || item.country_of_origin || null,
          yearly_units: parseInt(item.yearlyUnits) || parseInt(item.yearly_units) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'sku,user_id'
        })
      
      if (error) {
        console.error('Error importing product:', error)
        failed++
      } else {
        imported++
      }
    } catch (error) {
      console.error('Error processing product item:', error)
      failed++
    }
  }
  
  return { imported, failed }
}

async function importClassifications(supabase: any, data: any[], userId: string, workspaceId: string) {
  let imported = 0
  let failed = 0
  
  for (const item of data) {
    try {
      if (!item.product_id || !item.hs_code) {
        failed++
        continue
      }
      
      const { error } = await supabase
        .from('classification_queue')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          product_id: item.product_id,
          hs_code: item.hs_code,
          confidence: parseFloat(item.confidence) || 0.8,
          status: item.status || 'pending',
          created_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error importing classification:', error)
        failed++
      } else {
        imported++
      }
    } catch (error) {
      console.error('Error processing classification item:', error)
      failed++
    }
  }
  
  return { imported, failed }
}

async function importCalculations(supabase: any, data: any[], userId: string, workspaceId: string) {
  let imported = 0
  let failed = 0
  
  for (const item of data) {
    try {
      if (!item.product_id) {
        failed++
        continue
      }
      
      const { error } = await supabase
        .from('landed_cost_calculations')
        .insert({
          user_id: userId,
          workspace_id: workspaceId,
          product_id: item.product_id,
          duty_rate: parseFloat(item.duty_rate) || 0,
          total_cost: parseFloat(item.total_cost) || 0,
          landed_cost: parseFloat(item.landed_cost) || 0,
          created_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error importing calculation:', error)
        failed++
      } else {
        imported++
      }
    } catch (error) {
      console.error('Error processing calculation item:', error)
      failed++
    }
  }
  
  return { imported, failed }
}

async function importWorkspaceSettings(supabase: any, data: any[], userId: string, workspaceId: string) {
  let imported = 0
  let failed = 0
  
  for (const item of data) {
    try {
      // Update workspace settings
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: item.name || undefined,
          description: item.description || undefined,
          timezone: item.timezone || undefined,
          currency: item.currency || undefined,
          language: item.language || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId)
      
      if (error) {
        console.error('Error importing workspace settings:', error)
        failed++
      } else {
        imported++
      }
    } catch (error) {
      console.error('Error processing workspace settings:', error)
      failed++
    }
  }
  
  return { imported, failed }
}

async function importFullData(supabase: any, data: any, userId: string, workspaceId: string) {
  let totalImported = 0
  let totalFailed = 0
  
  try {
    // Handle full data structure
    if (data.products && Array.isArray(data.products)) {
      const productResults = await importProducts(supabase, data.products, userId, workspaceId)
      totalImported += productResults.imported
      totalFailed += productResults.failed
    }
    
    if (data.classifications && Array.isArray(data.classifications)) {
      const classificationResults = await importClassifications(supabase, data.classifications, userId, workspaceId)
      totalImported += classificationResults.imported
      totalFailed += classificationResults.failed
    }
    
    if (data.calculations && Array.isArray(data.calculations)) {
      const calculationResults = await importCalculations(supabase, data.calculations, userId, workspaceId)
      totalImported += calculationResults.imported
      totalFailed += calculationResults.failed
    }
    
    if (data.workspace) {
      const workspaceResults = await importWorkspaceSettings(supabase, [data.workspace], userId, workspaceId)
      totalImported += workspaceResults.imported
      totalFailed += workspaceResults.failed
    }
  } catch (error) {
    console.error('Error in full data import:', error)
    totalFailed++
  }
  
  return { imported: totalImported, failed: totalFailed }
}