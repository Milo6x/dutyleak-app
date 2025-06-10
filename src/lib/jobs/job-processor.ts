import { ClassificationEngine } from '@/lib/duty/classification-engine';
import { FbaFeeCalculator } from '@/lib/amazon/fba-fee-calculator';
import { OptimizationEngine } from '@/lib/duty/optimization-engine';
import { ScenarioEngine } from '@/lib/duty/scenario-engine';

export interface JobMetadata {
  productIds?: string[];
  classificationIds?: string[];
  exportFormat?: 'csv' | 'xlsx' | 'json';
  importData?: any[];
  scenarioParams?: any;
  [key: string]: any;
}

export class JobProcessor {
  /**
   * Process a background job based on its type
   * @param jobId - Job ID
   * @param jobType - Type of job to process
   * @param metadata - Job metadata
   * @param supabase - Supabase client
   */
  async processJob(
    jobId: string,
    jobType: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    try {
      // Update job status to running
      await this.updateJobStatus(jobId, 'running', 0, supabase);

      switch (jobType) {
        case 'bulk_classification':
          await this.processBulkClassification(jobId, metadata, supabase);
          break;
        case 'bulk_fba_calculation':
          await this.processBulkFbaCalculation(jobId, metadata, supabase);
          break;
        case 'duty_optimization':
          await this.processDutyOptimization(jobId, metadata, supabase);
          break;
        case 'data_export':
          await this.processDataExport(jobId, metadata, supabase);
          break;
        case 'data_import':
          await this.processDataImport(jobId, metadata, supabase);
          break;
        case 'scenario_analysis':
          await this.processScenarioAnalysis(jobId, metadata, supabase);
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      // Mark job as completed
      await this.updateJobStatus(jobId, 'completed', 100, supabase);
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(
        jobId,
        'failed',
        undefined,
        supabase,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Process bulk classification job
   */
  private async processBulkClassification(
    jobId: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    const { productIds } = metadata;
    if (!productIds || !Array.isArray(productIds)) {
      throw new Error('Product IDs are required for bulk classification');
    }

    const classificationEngine = new ClassificationEngine();
    const total = productIds.length;
    let processed = 0;
    const classificationsToInsert: any[] = [];
    let productsToProcess: any[] = [];

    // Batch fetch products
    const { data: products, error: productsFetchError } = await supabase
      .from('products')
      .select('id, title, description')
      .in('id', productIds);

    if (productsFetchError) {
      throw new Error(`Failed to fetch products for bulk classification: ${productsFetchError.message}`);
    }
    
    if (!products || products.length === 0) {
      console.warn('No products found for the given IDs in bulk classification.');
      await this.updateJobStatus(jobId, 'completed', 100, supabase); // Mark as complete if no products
      return;
    }
    productsToProcess = products;

    for (const product of productsToProcess) {
      try {
        // Classify product
        // Note: classificationEngine.classifyProduct might still do individual DB calls internally.
        // For full N+1 optimization, that engine might also need a batch method.
        const result = await classificationEngine.classifyProduct({
          productId: product.id,
          productName: product.title,
          productDescription: product.description || ''
        }, supabase);

        classificationsToInsert.push({
          product_id: product.id,
          hs6: result.hsCode?.substring(0, 6),
          hs8: result.hsCode,
          confidence_score: result.confidenceScore,
          classification_method: 'ai_bulk'
        });

      } catch (error) {
        console.error(`Error classifying product ${product.id}:`, error);
      } finally {
        processed++;
        const progress = Math.round((processed / total) * 100);
        // Update progress less frequently to reduce DB load, e.g., every 5% or every N items
        if (processed % Math.max(1, Math.floor(total / 20)) === 0 || processed === total) {
          await this.updateJobStatus(jobId, 'running', progress, supabase);
        }
      }
    }

    // Batch insert classifications
    if (classificationsToInsert.length > 0) {
      const { error: classificationInsertError } = await supabase
        .from('classifications')
        .insert(classificationsToInsert);

      if (classificationInsertError) {
        console.error(`Failed to save batch classifications:`, classificationInsertError);
        // Optionally, you could try individual inserts as a fallback or log more details
      }
    }
  }

  /**
   * Process bulk FBA fee calculation job
   */
  private async processBulkFbaCalculation(
    jobId: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    const { productIds } = metadata;
    if (!productIds || !Array.isArray(productIds)) {
      throw new Error('Product IDs are required for bulk FBA calculation');
    }

    const fbaCalculator = new FbaFeeCalculator();
    const total = productIds.length;
    let processed = 0;
    let productsToProcess: any[] = [];

    // Batch fetch products
    const { data: products, error: productsFetchError } = await supabase
      .from('products')
      .select('id, asin, dimensions, weight, category')
      .in('id', productIds);

    if (productsFetchError) {
      throw new Error(`Failed to fetch products for bulk FBA calculation: ${productsFetchError.message}`);
    }

    if (!products || products.length === 0) {
      console.warn('No products found for the given IDs in bulk FBA calculation.');
      await this.updateJobStatus(jobId, 'completed', 100, supabase); // Mark as complete if no products
      return;
    }
    productsToProcess = products;

    for (const product of productsToProcess) {
      try {
        let fbaResult;
        if (product.asin) {
          // Use ASIN-based calculation if available
          fbaResult = await fbaCalculator.fetchFbaFeeByAsin(product.asin);
        } else {
          // Use dimensions and weight
          fbaResult = fbaCalculator.calculate({
            dimensions: product.dimensions,
            weight: product.weight,
            category: product.category
          });
        }

        // Update product with FBA fee
        // Note: Batch updates with different values per row are complex with Supabase client.
        // This remains an individual update, but the reads are batched.
        const { error: updateError } = await supabase
          .from('products')
          .update({
            fba_fee_estimate_usd: fbaResult.fbaFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Failed to update FBA fee for product ${product.id}:`, updateError);
        }
      } catch (error) {
        console.error(`Error processing FBA calculation for product ${product.id}:`, error);
      } finally {
        processed++;
        const progress = Math.round((processed / total) * 100);
        if (processed % Math.max(1, Math.floor(total / 20)) === 0 || processed === total) {
          await this.updateJobStatus(jobId, 'running', progress, supabase);
        }
      }
    }
  }

  /**
   * Process duty optimization job
   */
  private async processDutyOptimization(
    jobId: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    const { productIds } = metadata;
    if (!productIds || !Array.isArray(productIds)) {
      throw new Error('Product IDs are required for duty optimization');
    }

    const optimizationEngine = new OptimizationEngine();
    const total = productIds.length;
    let processed = 0;
    const savingsToInsert: any[] = [];

    for (const productId of productIds) {
      try {
        // Run optimization for each product
        // Note: optimizationEngine.generateRecommendations might do individual DB calls.
        // For full N+1 optimization, that engine might also need a batch method.
        const recommendations = await optimizationEngine.generateRecommendations([productId]);

        for (const recommendation of recommendations) {
          savingsToInsert.push({
            product_id: recommendation.productId,
            workspace_id: metadata.workspaceId || '', // Ensure workspaceId is available in metadata
            savings_amount: recommendation.potentialSaving || 0,
            savings_percentage: recommendation.confidenceScore || 0, // Assuming confidenceScore maps to savings_percentage
            baseline_duty_rate: 0, // Placeholder, actual baseline might need to be fetched or calculated
            optimized_duty_rate: 0, // Placeholder, actual optimized rate might need to be calculated
            calculation_id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        }
      } catch (error) {
        console.error(`Error generating recommendations for product ${productId}:`, error);
      } finally {
        processed++;
        const progress = Math.round((processed / total) * 100);
        if (processed % Math.max(1, Math.floor(total / 20)) === 0 || processed === total) {
          await this.updateJobStatus(jobId, 'running', progress, supabase);
        }
      }
    }

    // Batch insert savings ledger entries
    if (savingsToInsert.length > 0) {
      const { error: optimizationInsertError } = await supabase
        .from('savings_ledger')
        .insert(savingsToInsert);

      if (optimizationInsertError) {
        console.error(`Failed to save batch optimization results:`, optimizationInsertError);
      }
    }
  }

  /**
   * Process data export job
   */
  private async processDataExport(
    jobId: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    const { exportFormat = 'csv', productIds } = metadata;
    
    // Get products data
    let query = supabase
      .from('products')
      .select(`
        id,
        title,
        asin,
        price_usd,
        fba_fee_estimate_usd,
        active_classification_id,
        classifications!inner(
          hs6,
          hs8,
          confidence_score
        )
      `);

    if (productIds && Array.isArray(productIds)) {
      query = query.in('id', productIds);
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    // Generate export data based on format
    let exportData;
    switch (exportFormat) {
      case 'csv':
        exportData = this.generateCsvExport(products);
        break;
      case 'json':
        exportData = JSON.stringify(products, null, 2);
        break;
      default:
        throw new Error(`Unsupported export format: ${exportFormat}`);
    }

    // Save export data (in a real implementation, you'd save to file storage)
    await this.updateJobStatus(jobId, 'running', 50, supabase);
    
    // Update job metadata with export info
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        metadata: {
          ...metadata,
          exportSize: exportData.length,
          recordCount: products.length,
          exportData: exportData.substring(0, 1000) // Store first 1000 chars as preview
        }
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to update job metadata:', updateError);
    }
  }

  /**
   * Process data import job
   */
  private async processDataImport(
    jobId: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    const { importData } = metadata;
    if (!importData || !Array.isArray(importData)) {
      throw new Error('Import data is required for data import job');
    }

    const total = importData.length;
    let errors = 0;

    // Prepare data for batch insert
    const productsToInsert = importData.map(item => ({
      title: item.title,
      asin: item.asin,
      price_usd: item.price_usd,
      description: item.description,
      category: item.category,
      created_at: new Date().toISOString(),
      // Ensure workspace_id is included if it's a required field and available in metadata
      // workspace_id: metadata.workspaceId 
    }));

    if (productsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (insertError) {
        console.error('Failed to batch insert products:', insertError);
        // If batch fails, you might want to log the error and potentially try individual inserts or mark all as failed.
        // For simplicity here, we'll count all as errors if batch fails.
        errors = total;
      }
    }
    
    const successfulImports = total - errors;
    await this.updateJobStatus(jobId, 'running', 100, supabase); // Mark progress as 100% after attempt

    // Update job metadata with import results
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        metadata: {
          ...metadata,
          totalRecords: total,
          successfulImports: total - errors,
          failedImports: errors
        }
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to update job metadata:', updateError);
    }
  }

  /**
   * Process scenario analysis job
   */
  private async processScenarioAnalysis(
    jobId: string,
    metadata: JobMetadata,
    supabase: any
  ): Promise<void> {
    const { scenarioParams } = metadata;
    if (!scenarioParams) {
      throw new Error('Scenario parameters are required for scenario analysis');
    }

    const scenarioEngine = new ScenarioEngine();
    
    // Run scenario analysis
    const result = await scenarioEngine.compareClassifications(scenarioParams, supabase);
    
    await this.updateJobStatus(jobId, 'running', 50, supabase);
    
    // Save scenario analysis result
    const { error: scenarioError } = await supabase
      .from('duty_scenarios')
      .insert({
        workspace_id: scenarioParams.workspaceId,
        name: `Analysis ${new Date().toISOString()}`,
        description: 'Automated scenario analysis',
        base_classification_id: scenarioParams.baseClassificationId,
        alternative_classification_id: scenarioParams.alternativeClassificationId,
        destination_country: scenarioParams.destinationCountry,
        product_value: scenarioParams.productValue,
        base_duty_amount: result.baseDutyAmount,
        alternative_duty_amount: result.alternativeDutyAmount,
        potential_saving: result.potentialSaving,
        status: 'completed'
      });

    if (scenarioError) {
      throw new Error(`Failed to save scenario analysis: ${scenarioError.message}`);
    }

    // Update job metadata with results
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        metadata: {
          ...metadata,
          analysisResult: result
        }
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Failed to update job metadata:', updateError);
    }
  }

  /**
   * Update job status and progress
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    progress?: number,
    supabase?: any,
    error?: string
  ): Promise<void> {
    const updateData: any = { status };
    
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    
    if (status === 'running' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    if (error) {
      updateData.error = error;
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (updateError) {
      console.error(`Failed to update job ${jobId} status:`, updateError);
    }
  }

  /**
   * Generate CSV export data
   */
  private generateCsvExport(products: any[]): string {
    if (!products || products.length === 0) {
      return 'No data to export';
    }

    const headers = [
      'ID',
      'Title',
      'ASIN',
      'Price (USD)',
      'FBA Fee (USD)',
      'HS6 Code',
      'HS8 Code',
      'Classification Confidence'
    ];

    const rows = products.map(product => [
      product.id,
      `"${product.title}"`,
      product.asin || '',
      product.price_usd || '',
      product.fba_fee_estimate_usd || '',
      product.classifications?.hs6 || '',
      product.classifications?.hs8 || '',
      product.classifications?.confidence_score || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
