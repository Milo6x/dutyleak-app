import { createDutyLeakServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { OptimizationEngine } from '@/lib/duty/optimization-engine';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createDutyLeakServerClient(cookieStore);
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { 
      productIds,
      categoryId,
      minPotentialSaving,
      confidenceThreshold = 0.7
    } = body;

    // Validate request
    if (!productIds && !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: either productIds or categoryId must be provided' },
        { status: 400 }
      );
    }

    // Get user's workspace_id
    const { data: workspaceUser, error: workspaceError } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', session.user.id)
      .single();

    if (workspaceError || !workspaceUser) {
      return NextResponse.json(
        { error: 'User not associated with any workspace' },
        { status: 400 }
      );
    }

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
        .eq('workspace_id', workspaceUser.workspace_id);
        
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

    // Create job for optimization analysis
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        workspace_id: workspaceUser.workspace_id,
        type: 'optimization_analysis',
        parameters: {
          productIds: productsToAnalyze,
          minPotentialSaving,
          confidenceThreshold
        },
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to create job', details: jobError.message },
        { status: 500 }
      );
    }

    // Add job log
    await supabase
      .from('job_logs')
      .insert({
        job_id: job.id,
        level: 'info',
        message: `Optimization analysis job created for ${productsToAnalyze.length} products`,
        metadata: { 
          productCount: productsToAnalyze.length,
          minPotentialSaving,
          confidenceThreshold
        }
      });

    // Start job processing (async)
    startOptimizationJob(job.id, productsToAnalyze, workspaceUser.workspace_id, {
      minPotentialSaving,
      confidenceThreshold
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `Optimization analysis started for ${productsToAnalyze.length} products`
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
      productIds,
      supabase,
      workspaceId
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
        error: error.message || 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
      
    await supabase
      .from('job_logs')
      .insert({
        job_id: jobId,
        level: 'error',
        message: 'Optimization analysis failed',
        metadata: { error: error.message || 'Unknown error' }
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
