import { createDutyLeakServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { OptimizationEngine } from '@/lib/duty/optimization-engine';
// import { JobProcessor } from '@/lib/jobs/job-processor'; // No longer used directly
import { batchProcessor, BatchJob } from '@/lib/batch/advanced-batch-processor'; // Import AdvancedBatchProcessor
import { getWorkspaceAccess, checkUserPermission } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const supabase = createDutyLeakServerClient();
    
    // Get workspace access and check permissions
    const { user, workspace_id } = await getWorkspaceAccess(supabase);
    await checkUserPermission(user.id, workspace_id, 'DATA_UPDATE');

    // Parse request body
    const body = await req.json();
    const { 
      type = 'optimization',
      productIds,
      categoryId,
      minPotentialSaving,
      confidenceThreshold = 0.7,
      runInBackground = false,
      priority = 'medium' // Added priority parsing
    } = body;

    // Validate optimization type
    const validTypes = ['duty_calculation', 'optimization', 'bulk_optimization'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid optimization type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use workspace_id from permissions check
    if (!workspace_id) {
      return NextResponse.json(
        { error: 'User not associated with any workspace' },
        { status: 400 }
      );
    }

    const workspaceId = workspace_id;

    // Get products to analyze
    let productsToAnalyze: string[] = [];
    
    if (productIds) {
      // Use provided product IDs
      productsToAnalyze = productIds;
    } else if (categoryId) {
      // Get products by category - Note: category_id column doesn't exist in products table
      // For now, we'll get all products in the workspace
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('workspace_id', workspace_id);
        
      if (productsError) {
        return NextResponse.json(
          { error: 'Failed to fetch products by category', details: productsError.message },
          { status: 500 }
        );
      }
      
      productsToAnalyze = products.map(p => p.id);
    }
    
    if (productsToAnalyze.length === 0) {
      return NextResponse.json(
        { error: 'No products found to analyze' },
        { status: 400 }
      );
    }

    // If running in background or bulk operation, create a job
    if (runInBackground || type === 'bulk_optimization' || productsToAnalyze.length > 5) {
      const jobTypeForProcessor = type === 'duty_calculation' ? 'fba_calculation' : 'duty_optimization';
      // Note: 'duty_optimization' needs to be a valid BatchJob['type'] handled by AdvancedBatchProcessor.
      // If not, this will fail or need mapping. Assuming it will be added.

      const jobMetadataForProcessor: BatchJob['metadata'] = {
        productIds: productsToAnalyze,
        parameters: { // Store original request parameters and any other context
          originalRequestType: type,
          minPotentialSaving,
          confidenceThreshold,
          userId: user.id
        },
        workspaceId: workspace_id,
      };

      try {
        const jobId = await batchProcessor.addJob(
          jobTypeForProcessor as BatchJob['type'], // Cast, assuming 'duty_optimization' will be valid
          jobMetadataForProcessor,
          priority as BatchJob['priority']
        );

        if (!jobId) {
          throw new Error('AdvancedBatchProcessor.addJob did not return a jobId');
        }

        const jobDetails = batchProcessor.getJob(jobId);
        if (!jobDetails) {
          throw new Error(`Job ${jobId} not found in AdvancedBatchProcessor after creation.`);
        }

        return NextResponse.json({
          success: true,
          message: 'Optimization job added to queue.',
          job: {
            id: jobDetails.id,
            type: jobDetails.type,
            status: jobDetails.status,
            priority: jobDetails.priority,
            progress: jobDetails.progress.percentage,
            createdAt: jobDetails.timestamps.created.toISOString(),
          }
        });

      } catch (e: any) {
        console.error('Failed to create optimization job via AdvancedBatchProcessor:', e.message);
        return NextResponse.json(
          { error: 'Failed to create optimization job', details: e.message },
          { status: 500 }
        );
      }
    }

     // For immediate processing (small datasets)
     const optimizationEngine = new OptimizationEngine();
     const results = [];

     if (type === 'duty_calculation') {
       // Process each product for duty calculation
       for (const productId of productsToAnalyze.slice(0, 5)) { // Limit to 5 for immediate processing
         try {
           const result = await optimizationEngine.generateRecommendations([productId]);
           results.push({
             productId,
             success: true,
             result
           });
         } catch (error) {
           results.push({
             productId,
             success: false,
             error: error instanceof Error ? error.message : 'Unknown error'
           });
         }
       }
     } else {
       // Process each product for optimization
       for (const productId of productsToAnalyze.slice(0, 5)) {
         try {
           const result = await optimizationEngine.generateRecommendations([productId]);
           results.push({
             productId,
             success: true,
             result
           });
         } catch (error) {
           results.push({
             productId,
             success: false,
             error: error instanceof Error ? error.message : 'Unknown error'
           });
         }
       }
     }

     return NextResponse.json({
       success: true,
       type,
       processed: results.length,
       results,
       message: `${type} completed for ${results.length} products`
     });
    
  } catch (error) {
    console.error('Optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to start optimization job asynchronously
async function startOptimizationJob(
  jobId: string, 
  productIds: string[], 
  workspaceId: string,
  options: { minPotentialSaving?: number, confidenceThreshold?: number }
) {
  try {
    // Create admin client for job processing
    const supabase = createAdminClient();
    
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
        message: 'Optimization analysis started',
        metadata: { productCount: productIds.length }
      });
      
    // Initialize optimization engine
    const optimizationEngine = new OptimizationEngine({
      minPotentialSaving: options.minPotentialSaving,
      confidenceThreshold: options.confidenceThreshold
    });
    
    // Generate recommendations
    const recommendations = await optimizationEngine.generateRecommendations(
      productIds
    );
    
    // Store recommendations
    const storedCount = await optimizationEngine.storeRecommendations(
      recommendations,
      workspaceId,
      supabase
    );
    
    // Update job status to completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    // Add job log
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'info',
        message: `Optimization analysis completed: ${storedCount} recommendations generated`,
        metadata: { 
          recommendationsCount: storedCount,
          analyzedProductsCount: productIds.length
        }
      });
      
  } catch (error) {
    console.error(`Optimization job error (job ${jobId}):`, error);
    
    // Update job status to failed
    const supabase = createAdminClient();
    
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: (error instanceof Error ? error.message : String(error)) || 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'error',
        message: 'Optimization analysis failed',
        metadata: { error: (error instanceof Error ? error.message : String(error)) || 'Unknown error' }
      });
  }
}

// Helper function to create admin client
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Import createClient at the top of the file
import { createClient } from '@supabase/supabase-js';
