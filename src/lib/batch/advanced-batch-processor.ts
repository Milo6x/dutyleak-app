import { SupabaseClient } from '@supabase/supabase-js'
// import { createBrowserClient } from '../supabase' // Replaced with admin client
import { createDutyLeakAdminClient } from '../supabase/server'; // Import admin client
import { ClassificationEngine } from '../duty/classification-engine'
import { FbaFeeCalculator } from '../amazon/fba-fee-calculator'
import { OptimizationEngine } from '../duty/optimization-engine'; // Added
import { ScenarioEngine } from '../duty/scenario-engine';   // Added
import { EventEmitter } from 'events'

export interface BatchJob {
  id: string
  type: 'classification' | 'fba_calculation' | 'data_export' | 'data_import' | 'duty_optimization' | 'scenario_analysis'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'dead_letter'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: {
    total: number
    completed: number
    failed: number
    current?: string
    percentage: number
  }
  metadata: {
    productIds?: string[]
    parameters?: any
    retryCount?: number
    maxRetries?: number
    estimatedDuration?: number
    actualDuration?: number
    workspaceId?: string
  }
  timestamps: {
    created: Date
    started?: Date
    paused?: Date
    resumed?: Date
    completed?: Date
  }
  error?: {
    message: string
    code: string
    details?: any
  }
}

export interface BatchProcessorConfig {
  maxConcurrentJobs: number
  retryAttempts: number
  retryDelay: number
  batchSize: number
  progressUpdateInterval: number
  enablePersistence: boolean
}

export interface BatchProgressUpdate {
  jobId: string
  progress: BatchJob['progress']
  status: BatchJob['status']
  currentItem?: string
  estimatedTimeRemaining?: number
}

export class AdvancedBatchProcessor extends EventEmitter {
  private jobs: Map<string, BatchJob> = new Map()
  private runningJobs: Set<string> = new Set()
  private queue: string[] = []
  private supabaseAdmin: SupabaseClient // Changed to SupabaseClient type
  private config: BatchProcessorConfig
  private isProcessing = false
  private abortControllers: Map<string, AbortController> = new Map()

  constructor(config?: Partial<BatchProcessorConfig>) {
    super()
    this.supabaseAdmin = createDutyLeakAdminClient(); // Initialize with admin client

    const defaultConfig: BatchProcessorConfig = {
      maxConcurrentJobs: 3,
      retryAttempts: 3,
      retryDelay: 1000, // ms
      batchSize: 10,
      progressUpdateInterval: 500, // ms
      enablePersistence: true,
    };

    const getConfigValue = <K extends keyof BatchProcessorConfig>(
      key: K,
      envVarName: string,
      parser: (val: string) => BatchProcessorConfig[K] | undefined, // Allow parser to return undefined if parsing fails
      defaultValue: BatchProcessorConfig[K]
    ): BatchProcessorConfig[K] => {
      const constructorVal = config?.[key];
      if (constructorVal !== undefined) {
        return constructorVal;
      }
      const envVal = process.env[envVarName];
      if (envVal !== undefined) {
        try {
          const parsed = parser(envVal);
          if (parsed !== undefined) return parsed;
          console.warn(`Failed to parse env var ${envVarName} ('${envVal}'). Using default for ${String(key)}.`);
          return defaultValue;
        } catch (e) {
          console.warn(`Error parsing env var ${envVarName} ('${envVal}'). Using default for ${String(key)}. Error: ${e}`);
          return defaultValue;
        }
      }
      return defaultValue;
    };
    
    const parseEnvInt = (val: string): number | undefined => {
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
    };

    const parseEnvBoolean = (val: string): boolean | undefined => {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
        return undefined;
    };

    this.config = {
      maxConcurrentJobs: getConfigValue('maxConcurrentJobs', 'JOB_MAX_CONCURRENT', parseEnvInt, defaultConfig.maxConcurrentJobs),
      retryAttempts: getConfigValue('retryAttempts', 'JOB_RETRY_ATTEMPTS', parseEnvInt, defaultConfig.retryAttempts),
      retryDelay: getConfigValue('retryDelay', 'JOB_RETRY_DELAY_MS', parseEnvInt, defaultConfig.retryDelay),
      batchSize: getConfigValue('batchSize', 'JOB_BATCH_SIZE', parseEnvInt, defaultConfig.batchSize),
      progressUpdateInterval: getConfigValue('progressUpdateInterval', 'JOB_PROGRESS_INTERVAL_MS', parseEnvInt, defaultConfig.progressUpdateInterval),
      enablePersistence: getConfigValue('enablePersistence', 'JOB_ENABLE_PERSISTENCE', parseEnvBoolean, defaultConfig.enablePersistence),
    };
    
    // If config was passed to constructor, it should override env vars and defaults.
    // The getConfigValue handles this precedence. The final ...config is not needed if each key is handled.
    // However, if BatchProcessorConfig could have more fields than explicitly handled by getConfigValue,
    // and we want to allow them through constructor, then a final merge is needed.
    // For now, assuming BatchProcessorConfig only has the fields handled by getConfigValue.
    // If config object from constructor has properties not defined in BatchProcessorConfig, they will be ignored.
    // If BatchProcessorConfig has more properties than handled by getConfigValue, they will take default.
    // To ensure all constructor overrides are respected for all BatchProcessorConfig fields:
    // this.config = { ...this.config, ...config }; // This would apply constructor config last.
    // But getConfigValue already prioritizes constructor config.

    // Load persisted jobs on initialization
    if (this.config.enablePersistence) {
      this.loadPersistedJobs()
    }
  }

  /**
   * Add a new batch job to the queue
   */
  async addJob(
    type: BatchJob['type'],
    metadata: BatchJob['metadata'],
    priority: BatchJob['priority'] = 'medium'
  ): Promise<string> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: BatchJob = {
      id: jobId,
      type,
      status: 'pending',
      priority,
      progress: {
        total: metadata.productIds?.length || 0,
        completed: 0,
        failed: 0,
        percentage: 0
      },
      metadata: {
        ...metadata,
        retryCount: 0,
        maxRetries: this.config.retryAttempts
      },
      timestamps: {
        created: new Date()
      }
    }

    this.jobs.set(jobId, job)
    this.addToQueue(jobId)
    
    if (this.config.enablePersistence) {
      await this.persistJob(job)
    }

    this.emit('jobAdded', job)
    this.processQueue()
    
    return jobId
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'running') {
      return false
    }

    const abortController = this.abortControllers.get(jobId)
    if (abortController) {
      abortController.abort()
    }

    job.status = 'paused'
    job.timestamps.paused = new Date()
    
    this.runningJobs.delete(jobId)
    this.emit('jobPaused', job)
    
    if (this.config.enablePersistence) {
      await this.persistJob(job)
    }

    return true
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    if (!job || job.status !== 'paused') {
      return false
    }

    job.status = 'pending'
    job.timestamps.resumed = new Date()
    
    this.addToQueue(jobId)
    this.emit('jobResumed', job)
    
    if (this.config.enablePersistence) {
      await this.persistJob(job)
    }

    this.processQueue()
    return true
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    if (!job) {
      return false
    }

    const abortController = this.abortControllers.get(jobId)
    if (abortController) {
      abortController.abort()
    }

    job.status = 'cancelled'
    job.timestamps.completed = new Date()
    
    this.runningJobs.delete(jobId)
    this.removeFromQueue(jobId)
    
    this.emit('jobCancelled', job)
    
    if (this.config.enablePersistence) {
      await this.persistJob(job)
    }

    return true
  }

  /**
   * Get job status and progress
   */
  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(filter?: {
    status?: BatchJob['status']
    type?: BatchJob['type']
    priority?: BatchJob['priority']
  }): BatchJob[] {
    let jobs = Array.from(this.jobs.values())
    
    if (filter) {
      if (filter.status) {
        jobs = jobs.filter(job => job.status === filter.status)
      }
      if (filter.type) {
        jobs = jobs.filter(job => job.type === filter.type)
      }
      if (filter.priority) {
        jobs = jobs.filter(job => job.priority === filter.priority)
      }
    }
    
    return jobs.sort((a, b) => b.timestamps.created.getTime() - a.timestamps.created.getTime())
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      pending: this.queue.length,
      running: this.runningJobs.size,
      maxConcurrent: this.config.maxConcurrentJobs,
      totalJobs: this.jobs.size
    }
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    while (this.queue.length > 0 && this.runningJobs.size < this.config.maxConcurrentJobs) {
      const jobId = this.queue.shift()
      if (!jobId) {continue}

      const job = this.jobs.get(jobId)
      if (!job || job.status !== 'pending') {continue}

      this.runningJobs.add(jobId)
      this.processJob(jobId).catch(error => {
        console.error(`Error processing job ${jobId}:`, error)
      })
    }

    this.isProcessing = false
  }

  /**
   * Process a single job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) {return}

    const abortController = new AbortController()
    this.abortControllers.set(jobId, abortController)

    try {
      job.status = 'running'
      job.timestamps.started = new Date()
      
      this.emit('jobStarted', job)
      
      if (this.config.enablePersistence) {
        await this.persistJob(job)
      }

      switch (job.type) {
        case 'classification':
          await this.processClassificationJob(job, abortController.signal)
          break
        case 'fba_calculation':
          await this.processFbaCalculationJob(job, abortController.signal)
          break
        case 'data_export':
          await this.processDataExportJob(job, abortController.signal)
          break
        case 'data_import':
          await this.processDataImportJob(job, abortController.signal)
          break
        case 'duty_optimization':
          await this.processDutyOptimizationJob(job, abortController.signal)
          break
        case 'scenario_analysis':
          await this.processScenarioAnalysisJob(job, abortController.signal)
          break
        default:
          // Ensure exhaustive check with a helper or by explicitly casting job.type
          const exhaustiveCheck: never = job.type;
          throw new Error(`Unhandled job type: ${exhaustiveCheck}`);
      }

      if (!abortController.signal.aborted) {
        job.status = 'completed'
        job.timestamps.completed = new Date()
        job.metadata.actualDuration = job.timestamps.completed.getTime() - (job.timestamps.started?.getTime() || 0)
        
        this.emit('jobCompleted', job)
      }

    } catch (error) {
      if (!abortController.signal.aborted) {
        await this.handleJobError(job, error as Error)
      }
    } finally {
      this.runningJobs.delete(jobId)
      this.abortControllers.delete(jobId)
      
      if (this.config.enablePersistence) {
        await this.persistJob(job)
      }
      
      // Process next job in queue
      this.processQueue()
    }
  }

  /**
   * Process classification job
   */
  private async processClassificationJob(job: BatchJob, signal: AbortSignal): Promise<void> {
    const { productIds } = job.metadata
    if (!productIds || !Array.isArray(productIds)) {
      throw new Error('Product IDs are required for classification job')
    }

    const classificationEngine = new ClassificationEngine()
    const batchSize = this.config.batchSize
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      if (signal.aborted) {break}
      
      const batch = productIds.slice(i, i + batchSize)
      
      try {
        // Get product details
        const { data: products, error } = await this.supabaseAdmin
          .from('products')
          .select('id, title, description, workspace_id')
          .in('id', batch)
        
        if (error) {throw error}
        
        // Process batch
        for (const product of products || []) {
          if (signal.aborted) {break}
          
          try {
            job.progress.current = product.id
            this.updateProgress(job)
            
            const result = await classificationEngine.classifyProduct({
              productId: product.id,
              productName: product.title,
              productDescription: product.description || ''
            }, this.supabaseAdmin) // Pass admin client
            
            // Save classification result
            await this.supabaseAdmin
              .from('classifications')
              .insert({
                product_id: product.id,
                hs6: result.hsCode?.substring(0, 6),
                hs8: result.hsCode,
                confidence_score: result.confidenceScore,
                classification_method: 'ai_batch',
                 workspace_id: product.workspace_id
               })
            
            job.progress.completed++
          } catch (error) {
            console.error(`Error classifying product ${product.id}:`, error)
            job.progress.failed++
          }
          
          this.updateProgress(job)
        }
      } catch (error) {
        console.error(`Error processing batch:`, error)
        job.progress.failed += batch.length
        this.updateProgress(job)
      }
    }
  }

  /**
   * Process FBA calculation job
   */
  private async processFbaCalculationJob(job: BatchJob, signal: AbortSignal): Promise<void> {
    const { productIds } = job.metadata
    if (!productIds || !Array.isArray(productIds)) {
      throw new Error('Product IDs are required for FBA calculation job')
    }

    const fbaCalculator = new FbaFeeCalculator()
    const batchSize = this.config.batchSize
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      if (signal.aborted) {break}
      
      const batch = productIds.slice(i, i + batchSize)
      
      try {
        const { data: products, error } = await this.supabaseAdmin
          .from('products')
          .select('id, asin, weight, category')
          .in('id', batch)
        
        if (error) {throw error}
        
        for (const product of products || []) {
          if (signal.aborted) {break}
          
          try {
            job.progress.current = product.id
            this.updateProgress(job)
            
            // let fbaResult
            // if (product.asin) {
            //   fbaResult = await fbaCalculator.fetchFbaFeeByAsin(product.asin)
            // } else {
            //   fbaResult = fbaCalculator.calculate({
            //     weight: { value: product.weight || 0, unit: 'lb' },
            //     category: product.category
            //   })
            // }
            
            // await this.supabaseAdmin  // Use admin client
            //   .from('products')
            //   .update({
            //     fba_fee_estimate_usd: fbaResult.fbaFee,
            //     updated_at: new Date().toISOString()
            //   })
            //   .eq('id', product.id)
            
            job.progress.completed++
          } catch (error) {
            console.error(`Error calculating FBA fee for product ${product.id}:`, error)
            job.progress.failed++
          }
          
          this.updateProgress(job)
        }
      } catch (error) {
        console.error(`Error processing FBA batch:`, error)
        job.progress.failed += batch.length
        this.updateProgress(job)
      }
    }
  }

  /**
   * Process data export job
   */
  private async processDataExportJob(job: BatchJob, signal: AbortSignal): Promise<void> {
    // Implementation for data export
    // This would generate and save export files
    job.progress.completed = job.progress.total
    this.updateProgress(job)
  }

  /**
   * Process data import job
   */
  private async processDataImportJob(job: BatchJob, signal: AbortSignal): Promise<void> {
    // Implementation for data import
    // This would process and import data files
    job.progress.completed = job.progress.total
    this.updateProgress(job)
  }

  /**
   * Process duty optimization job
   */
  private async processDutyOptimizationJob(job: BatchJob, signal: AbortSignal): Promise<void> {
    const { productIds, parameters, workspaceId } = job.metadata;
    const jobParams = parameters || {}; // Ensure parameters is an object

    if (!productIds || !Array.isArray(productIds)) {
      throw new Error('Product IDs are required for duty optimization job');
    }
    if (!workspaceId) {
      throw new Error('Workspace ID is required in job metadata for duty optimization');
    }

    // Pass engine options if provided in job.metadata.parameters.engineOptions
    const optimizationEngine = new OptimizationEngine(jobParams.engineOptions);
    const savingsToInsert: any[] = [];
    job.progress.total = productIds.length; // Ensure total is set if not already

    for (let i = 0; i < productIds.length; i++) {
      if (signal.aborted) {
        console.log(`Duty optimization job ${job.id} aborted during product loop.`);
        throw new Error('Job aborted');
      }
      const productId = productIds[i];
      job.progress.current = productId;
      
      try {
        const recommendations = await optimizationEngine.generateRecommendations([productId]);
        for (const recommendation of recommendations) {
          savingsToInsert.push({
            product_id: recommendation.productId,
            workspace_id: workspaceId,
            savings_amount: recommendation.potentialSaving || 0,
            savings_percentage: recommendation.savingPercentage || 0, 
            baseline_duty_rate: recommendation.currentDutyRate || 0,
            optimized_duty_rate: recommendation.recommendedDutyRate || 0,
            calculation_id: `opt_job_${job.id}_${productId}` // More specific ID
          });
        }
        job.progress.completed++;
      } catch (error) {
        console.error(`Error generating recommendations for product ${productId} in job ${job.id}:`, error);
        job.progress.failed++;
      }
      
      // Update progress (throttled inside updateProgress if necessary, or here)
      if (i % Math.max(1, Math.floor(job.progress.total / 20)) === 0 || i === job.progress.total - 1) {
        this.updateProgress(job); // Update progress state
        if (this.config.enablePersistence) await this.persistJob(job); // Persist progress
      }
    }

    if (signal.aborted) return;

    if (savingsToInsert.length > 0) {
      const { error: optimizationInsertError } = await this.supabaseAdmin
        .from('savings_ledger')
        .insert(savingsToInsert);

      if (optimizationInsertError) {
        // This error will be caught by the main job error handler
        throw new Error(`Failed to save batch optimization results: ${optimizationInsertError.message}`);
      }
    }
    job.progress.percentage = 100; // Ensure it's 100 if all items processed
    this.updateProgress(job);
  }

  /**
   * Process scenario analysis job
   */
  private async processScenarioAnalysisJob(job: BatchJob, signal: AbortSignal): Promise<void> {
    const { parameters, workspaceId } = job.metadata;
    const scenarioParams = parameters?.scenarioParams; // Assuming scenarioParams are nested

    if (!scenarioParams) {
      throw new Error('Scenario parameters are required for scenario analysis job');
    }
    if (!workspaceId) {
        throw new Error('Workspace ID is required in job metadata for scenario analysis');
    }
    // Ensure scenarioParams includes workspaceId if ScenarioEngine needs it directly
    if (!scenarioParams.workspaceId) {
        scenarioParams.workspaceId = workspaceId;
    }


    const scenarioEngine = new ScenarioEngine();
    job.progress.total = 1; // Scenario analysis is typically a single operation

    job.progress.current = 'Analyzing scenario';
    this.updateProgress(job);
    if (this.config.enablePersistence) await this.persistJob(job);
    
    const result = await scenarioEngine.compareClassifications(scenarioParams, this.supabaseAdmin); // Use admin client

    if (signal.aborted) {
      console.log(`Scenario analysis job ${job.id} aborted.`);
      throw new Error('Job aborted');
    }
    
    // Save scenario analysis result to duty_scenarios table
    const { error: scenarioError } = await this.supabaseAdmin // Use admin client
      .from('duty_scenarios')
      .insert({
        // workspace_id: scenarioParams.workspaceId, // Already part of scenarioParams or added above
        name: scenarioParams.name || `Job Analysis ${job.id}`,
        description: scenarioParams.description || `Automated scenario analysis from job ${job.id}`,
        base_classification_id: scenarioParams.baseClassificationId,
        alternative_classification_id: scenarioParams.alternativeClassificationId,
        destination_country: scenarioParams.destinationCountry,
        product_value: scenarioParams.productValue,
        shipping_cost: scenarioParams.shippingCost,
        insurance_cost: scenarioParams.insuranceCost,
        fba_fee_amount: scenarioParams.fbaFeeAmount,
        yearly_units: scenarioParams.yearlyUnits,
        base_duty_amount: result.baseDutyAmount,
        alternative_duty_amount: result.alternativeDutyAmount,
        potential_saving: result.potentialSaving,
        status: 'completed', // Status of the scenario record itself
        parameters: scenarioParams, // Store original params within the scenario record
        workspace_id: workspaceId // Ensure this is set from job metadata
      });

    if (scenarioError) {
      throw new Error(`Failed to save scenario analysis result: ${scenarioError.message}`);
    }

    // Update job metadata with a summary or reference to the created scenario
    if (job.metadata.parameters) {
        job.metadata.parameters.analysisResultSummary = { 
            potentialSaving: result.potentialSaving,
            baseDuty: result.baseDutyAmount,
            altDuty: result.alternativeDutyAmount
        };
    }
    
    job.progress.completed = 1;
    job.progress.percentage = 100;
    this.updateProgress(job);
  }

  /**
   * Update job progress and emit events
   */
  private updateProgress(job: BatchJob): void {
    job.progress.percentage = Math.round(
      ((job.progress.completed + job.progress.failed) / job.progress.total) * 100
    )
    
    const progressUpdate: BatchProgressUpdate = {
      jobId: job.id,
      progress: job.progress,
      status: job.status,
      currentItem: job.progress.current
    }
    
    this.emit('progressUpdate', progressUpdate)
  }

  /**
   * Handle job errors with retry logic
   */
  private async handleJobError(job: BatchJob, error: Error): Promise<void> {
    job.metadata.retryCount = (job.metadata.retryCount || 0) + 1
    
    if (job.metadata.retryCount < (job.metadata.maxRetries || 0)) {
      // Retry the job
      setTimeout(() => {
        job.status = 'pending'
        this.addToQueue(job.id)
        this.processQueue()
      }, this.config.retryDelay * job.metadata.retryCount)
      
      this.emit('jobRetry', { job, attempt: job.metadata.retryCount })
    } else {
      // Mark as dead_letter after exhausting retries
      job.status = 'dead_letter'
      job.timestamps.completed = new Date() // Mark as completed in terms of processing attempts
      job.error = {
        message: error.message,
        code: error.name,
        details: error.stack
      }
      
      this.emit('jobFailed', job)
    }
  }

  /**
   * Add job to queue with priority sorting
   */
  private addToQueue(jobId: string): void {
    const job = this.jobs.get(jobId)
    if (!job) {return}
    
    // Remove if already in queue
    this.removeFromQueue(jobId)
    
    // Add with priority sorting
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    const insertIndex = this.queue.findIndex(queuedJobId => {
      const queuedJob = this.jobs.get(queuedJobId)
      return queuedJob && priorityOrder[queuedJob.priority] > priorityOrder[job.priority]
    })
    
    if (insertIndex === -1) {
      this.queue.push(jobId)
    } else {
      this.queue.splice(insertIndex, 0, jobId)
    }
  }

  /**
   * Remove job from queue
   */
  private removeFromQueue(jobId: string): void {
    const index = this.queue.indexOf(jobId)
    if (index > -1) {
      this.queue.splice(index, 1)
    }
  }

  /**
   * Persist job to database
   */
  private async persistJob(job: BatchJob): Promise<void> {
    try {
      const { error } = await this.supabaseAdmin // Use admin client
        .from('jobs')
        .insert({
          id: job.id,
          type: job.type,
          status: job.status,
          workspace_id: job.metadata.workspaceId || 'default-workspace',
          parameters: {
            ...job.metadata,
            progress: job.progress,
            timestamps: {
              created: job.timestamps.created.toISOString(),
              started: job.timestamps.started?.toISOString(),
              paused: job.timestamps.paused?.toISOString(),
              resumed: job.timestamps.resumed?.toISOString(),
              completed: job.timestamps.completed?.toISOString()
            },
            error: job.error
          },
          progress: job.progress.percentage,
          error: job.error?.message,
          started_at: job.timestamps.started?.toISOString(),
          completed_at: job.timestamps.completed?.toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Failed to persist job:', error)
      }
    } catch (error) {
      console.error('Error persisting job:', error)
    }
  }

  /**
   * Load persisted jobs from database
   */
  private async loadPersistedJobs(): Promise<void> {
    try {
      const { data: jobs, error } = await this.supabaseAdmin // Use admin client
        .from('jobs')
        .select('*')
        .in('status', ['pending', 'running', 'paused'])
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Failed to load persisted jobs:', error)
        return
      }
      
      for (const jobData of jobs || []) {
        const job: BatchJob = {
          id: jobData.id,
          type: jobData.type as 'classification' | 'fba_calculation' | 'data_export' | 'data_import',
          status: (jobData.status === 'running' ? 'pending' : jobData.status) as BatchJob['status'], // Reset running jobs to pending, use BatchJob['status']
          priority: (jobData.parameters && typeof jobData.parameters === 'object' && !Array.isArray(jobData.parameters) && 'priority' in jobData.parameters ? jobData.parameters.priority : 'medium') as BatchJob['priority'],
          progress: (jobData.parameters && typeof jobData.parameters === 'object' && !Array.isArray(jobData.parameters) && 'progress' in jobData.parameters ? jobData.parameters.progress : { total: 0, completed: 0, failed: 0, percentage: 0 }) as BatchJob['progress'],
          metadata: jobData.parameters && typeof jobData.parameters === 'object' && !Array.isArray(jobData.parameters)
            ? jobData.parameters as { productIds?: string[]; parameters?: any; retryCount?: number; maxRetries?: number; estimatedDuration?: number; actualDuration?: number; workspaceId?: string; }
            : {},
          timestamps: {
            created: new Date(jobData.created_at),
            started: jobData.started_at ? new Date(jobData.started_at) : undefined,
            completed: jobData.completed_at ? new Date(jobData.completed_at) : undefined
          },
          error: jobData.parameters && typeof jobData.parameters === 'object' && 'error' in jobData.parameters 
            ? jobData.parameters.error as { message: string; code: string; details?: any }
            : undefined
        }
        
        this.jobs.set(job.id, job)
        
        if (job.status === 'pending') {
          this.addToQueue(job.id)
        }
      }
      
      // Start processing queue if there are pending jobs
      if (this.queue.length > 0) {
        this.processQueue()
      }
    } catch (error) {
      console.error('Error loading persisted jobs:', error)
    }
  }
}

// Export singleton instance
export const batchProcessor = new AdvancedBatchProcessor()
