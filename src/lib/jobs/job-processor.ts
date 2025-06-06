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

    for (const productId of productIds) {
      try {
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, title, description')
          .eq('id', productId)
          .single();

        if (productError || !product) {
          console.error(`Product ${productId} not found:`, productError);
          continue;
        }

        // Classify product
        const result = await classificationEngine.classifyProduct({
          productId: productId,
          productName: product.title,
          productDescription: product.description || ''
        }, supabase);

        // Save classification result
        const { error: classificationError } = await supabase
          .from('classifications')
          .insert({
            product_id: productId,
            hs6: result.hsCode?.substring(0, 6),
            hs8: result.hsCode,
            confidence_score: result.confidenceScore,
            classification_method: 'ai_bulk'
          });

        if (classificationError) {
          console.error(`Failed to save classification for product ${productId}:`, classificationError);
        }

        processed++;
        const progress = Math.round((processed / total) * 100);
        await this.updateJobStatus(jobId, 'running', progress, supabase);
        
      } catch (error) {
        console.error(`Error processing product ${productId}:`, error);
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

    for (const productId of productIds) {
      try {
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, asin, dimensions, weight, category')
          .eq('id', productId)
          .single();

        if (productError || !product) {
          console.error(`Product ${productId} not found:`, productError);
          continue;
        }

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
        const { error: updateError } = await supabase
          .from('products')
          .update({
            fba_fee_estimate_usd: fbaResult.fbaFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId);

        if (updateError) {
          console.error(`Failed to update FBA fee for product ${productId}:`, updateError);
        }

        processed++;
        const progress = Math.round((processed / total) * 100);
        await this.updateJobStatus(jobId, 'running', progress, supabase);
        
      } catch (error) {
        console.error(`Error processing FBA calculation for product ${productId}:`, error);
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

    for (const productId of productIds) {
      try {
        // Run optimization for each product
        const recommendations = await optimizationEngine.generateRecommendations([productId]);

        // Save optimization results to savings_ledger
        for (const recommendation of recommendations) {
          const { error: optimizationError } = await supabase
            .from('savings_ledger')
            .insert({
              product_id: recommendation.productId,
              workspace_id: metadata.workspaceId || '',
              savings_amount: recommendation.potentialSaving || 0,
              savings_percentage: recommendation.confidenceScore || 0,
              baseline_duty_rate: 0, // Default baseline rate
              optimized_duty_rate: 0, // Will be calculated based on recommendation
              calculation_id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Generate unique calculation ID
            });

          if (optimizationError) {
            console.error(`Failed to save optimization result for product ${productId}:`, optimizationError);
          }
        }

        processed++;
        const progress = Math.round((processed / total) * 100);
        await this.updateJobStatus(jobId, 'running', progress, supabase);
        
      } catch (error) {
        console.error(`Error processing optimization for product ${productId}:`, error);
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
    let processed = 0;
    let errors = 0;

    for (const item of importData) {
      try {
        // Validate and insert product data
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            title: item.title,
            asin: item.asin,
            price_usd: item.price_usd,
            description: item.description,
            category: item.category,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to insert product:', insertError);
          errors++;
        }

        processed++;
        const progress = Math.round((processed / total) * 100);
        await this.updateJobStatus(jobId, 'running', progress, supabase);
        
      } catch (error) {
        console.error('Error processing import item:', error);
        errors++;
      }
    }

    // Update job metadata with import results
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        metadata: {
          ...metadata,
          totalRecords: total,
          successfulImports: processed - errors,
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