import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as Papa from 'papaparse';
import { OpenAIClient } from '@/lib/external/openai-client';
import { createClient } from '@supabase/supabase-js';
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase);
    await checkUserPermission(user.id, workspace_id, 'DATA_CREATE');

    // Get form data with file
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const categoryId = formData.get('categoryId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Use workspace_id from permissions check

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true
    });
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'CSV parsing error', 
          details: parseResult.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }
    
    const rows = parseResult.data as Record<string, string>[];
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }
    
    // AI-assisted column mapping
    const columnMapping = await mapColumnsWithAI(Object.keys(rows[0]));
    
    // Validate rows and prepare for import
    const { validRows, invalidRows } = validateRows(rows, columnMapping);
    
    if (validRows.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid rows found in CSV', 
          invalidRows 
        },
        { status: 400 }
      );
    }
    
    // Create job for CSV import
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        workspace_id: workspace_id,
        type: 'csv_import',
        parameters: {
          filename: file.name,
          totalRows: rows.length,
          validRows: validRows.length,
          invalidRows: invalidRows.length,
          columnMapping
        },
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to create import job', details: jobError.message },
        { status: 500 }
      );
    }

    // Start import job (async)
    startImportJob(job.id, validRows, columnMapping, workspace_id, categoryId);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      invalidRowDetails: invalidRows.length > 0 ? invalidRows : undefined,
      columnMapping
    });
    
  } catch (error) {
    console.error('CSV import API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// AI-assisted column mapping
async function mapColumnsWithAI(columns: string[]): Promise<Record<string, string>> {
  // Define expected columns
  const expectedColumns = [
      'title',
      'description',
      'sku',
      'asin',
      'price',
      'cost',
      'weight',
      'length',
      'width',
      'height',
      'hsCode',
      'countryOfOrigin',
      'yearlyUnits'
  ];

  try {
    // Initialize OpenAI client
    const openaiClient = new OpenAIClient();
    
    // Define expected columns
    // const expectedColumns = []; // Moved to the top of the function
    
    // Create prompt for OpenAI
    const prompt = `
      I have a CSV file with the following columns:
      ${columns.join(', ')}
      
      Please map these columns to the following expected fields:
      ${expectedColumns.join(', ')}
      
      Return the mapping as a JSON object where keys are the expected fields and values are the original column names.
      If a column doesn't have a match, set its value to null.
    `;
    
    // Get mapping from OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that maps CSV columns to predefined fields. Respond with a JSON object.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: "json_object" } // Request JSON output
      })
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error for column mapping:', errorData.error?.message || `API error: ${openAIResponse.status}`);
      // Fallback to simple matching
      return simpleColumnMapping(columns, expectedColumns);
    }

    const responseData = await openAIResponse.json();
    const content = responseData.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response for column mapping');
      // Fallback to simple matching
      return simpleColumnMapping(columns, expectedColumns);
    }
    
    // Parse response
    try {
      const mapping = JSON.parse(content);
      return mapping;
    } catch (e) {
      console.error('Failed to parse AI mapping response:', e);
      
      // Fallback to simple matching
      return simpleColumnMapping(columns, expectedColumns);
    }
  } catch (error) {
    console.error('AI column mapping error:', error);
    
    // Fallback to simple matching
    return simpleColumnMapping(columns, expectedColumns);
  }
}

// Simple column mapping based on string similarity
function simpleColumnMapping(columns: string[], expectedColumns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  for (const expected of expectedColumns) {
    // Try exact match
    const exactMatch = columns.find(c => 
      c.toLowerCase() === expected.toLowerCase()
    );
    
    if (exactMatch) {
      mapping[expected] = exactMatch;
      continue;
    }
    
    // Try contains match
    const containsMatch = columns.find(c => 
      c.toLowerCase().includes(expected.toLowerCase()) ||
      expected.toLowerCase().includes(c.toLowerCase())
    );
    
    if (containsMatch) {
      mapping[expected] = containsMatch;
      continue;
    }
    
    // No match found
    mapping[expected] = null;
  }
  
  return mapping;
}

// Validate rows and prepare for import
function validateRows(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): { 
  validRows: Array<Record<string, any>>,
  invalidRows: Array<{
    rowIndex: number,
    data: Record<string, string>,
    errors: string[]
  }>
} {
  const validRows: Array<Record<string, any>> = [];
  const invalidRows: Array<{
    rowIndex: number,
    data: Record<string, string>,
    errors: string[]
  }> = [];
  
  rows.forEach((row, index) => {
    const errors: string[] = [];
    const mappedRow: Record<string, any> = {};
    
    // Check required fields
    if (!columnMapping.title || !row[columnMapping.title]) {
      errors.push('Missing required field: title');
    } else {
      mappedRow.title = row[columnMapping.title];
    }
    
    // Map other fields
    for (const [expected, original] of Object.entries(columnMapping)) {
      if (original && row[original] !== undefined) {
        // Skip title as it's already handled
        if (expected === 'title') {continue;}
        
        // Convert numeric fields
        if (['price', 'cost', 'weight', 'length', 'width', 'height', 'yearlyUnits'].includes(expected)) {
          const numValue = parseFloat(row[original]);
          if (isNaN(numValue)) {
            errors.push(`Invalid numeric value for ${expected}: ${row[original]}`);
          } else {
            mappedRow[expected] = numValue;
          }
        } else {
          mappedRow[expected] = row[original];
        }
      }
    }
    
    // Add to appropriate array
    if (errors.length > 0) {
      invalidRows.push({
        rowIndex: index,
        data: row,
        errors
      });
    } else {
      validRows.push(mappedRow);
    }
  });
  
  return { validRows, invalidRows };
}

// Start import job asynchronously
async function startImportJob(
  jobId: string,
  rows: Array<Record<string, any>>,
  columnMapping: Record<string, string>,
  workspaceId: string,
  categoryId?: string
) {
  try {
    // Create admin client for job processing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Update job status to running
    await supabase
      .from('jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    // Add job log
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'info',
        message: 'CSV import started',
        metadata: { rowCount: rows.length }
      });
      
    // Process rows in batches
    const batchSize = 50;
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Process batch
      for (const row of batch) {
        try {
          // Create product
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              workspace_id: workspaceId,
              title: row.title,
              description: row.description || '',
              sku: row.sku || null,
              asin: row.asin || null,
              price: row.price || null,
              cost: row.cost || null,
              category_id: categoryId || null,
              country_of_origin: row.countryOfOrigin || null,
              yearly_units: row.yearlyUnits || null,
              dimensions: row.length && row.width && row.height ? {
                length: row.length,
                width: row.width,
                height: row.height,
                unit: 'in'
              } : null,
              weight: row.weight ? {
                value: row.weight,
                unit: 'lb'
              } : null
            })
            .select('id')
            .single();
            
          if (productError) {
            throw new Error(`Failed to create product: ${productError.message}`);
          }
          
          // If HS code is provided, create classification
          if (row.hsCode) {
            const hs6 = row.hsCode.substring(0, 6);
            const hs8 = row.hsCode.length >= 8 ? row.hsCode : null;
            
            const { error: classError } = await supabase
              .from('classifications')
              .insert({
                product_id: product.id,
                hs6,
                hs8,
                confidence_score: 1.0,
                source: 'csv_import',
                is_active: true
              });
              
            if (classError) {
              throw new Error(`Failed to create classification: ${classError.message}`);
            }
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error processing row:`, error, row);
          errorCount++;
        }
        
        processedCount++;
      }
      
      // Update job progress
      const progress = Math.round((processedCount / rows.length) * 100);
      await supabase
        .from('jobs')
        .update({
          progress,
          metadata: {
            processedCount,
            successCount,
            errorCount
          }
        })
        .eq('id', jobId);
    }
    
    // Update job status to completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        metadata: {
          processedCount,
          successCount,
          errorCount
        }
      })
      .eq('id', jobId);
      
    // Add job log
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'info',
        message: `CSV import completed: ${successCount} products imported, ${errorCount} errors`,
        metadata: { 
          successCount,
          errorCount
        }
      });
      
  } catch (error) {
    console.error(`CSV import job error (job ${jobId}):`, error);
    
    // Update job status to failed
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: error.message || 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'error',
        message: 'CSV import failed',
        metadata: { error: error.message || 'Unknown error' }
      });
  }
}
