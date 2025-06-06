import { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '../supabase'
import { ClassificationEngine } from '../duty/classification-engine'
import { FbaFeeCalculator } from '../amazon/fba-fee-calculator'
import { EventEmitter } from 'events'

export interface BatchJob {
  id: string
  type: 'classification' | 'fba_calculation' | 'data_export' | 'data_import'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
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
  private supabase = createBrowserClient()
  private config: BatchProcessorConfig
  private isProcessing = false
  private abortControllers: Map<string, AbortController> = new Map()

  constructor(config?: Partial<BatchProcessorConfig>) {
    super()
    this.config = {
      maxConcurrentJobs: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      batchSize: 10,
      progressUpdateInterval: 500,
      enablePersistence: true,
      ...config
    }

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
        default:
          throw new Error(`Unknown job type: ${job.type}`)
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
        const { data: products, error } = await this.supabase
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
            }, this.supabase)
            
            // Save classification result
            await this.supabase
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
        const { data: products, error } = await this.supabase
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
            
            // await this.supabase
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
      // Mark as failed
      job.status = 'failed'
      job.timestamps.completed = new Date()
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
      const { error } = await this.supabase
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
      const { data: jobs, error } = await this.supabase
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
          status: (jobData.status === 'running' ? 'pending' : jobData.status) as 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled', // Reset running jobs to pending
          priority: (jobData.parameters && typeof jobData.parameters === 'object' && !Array.isArray(jobData.parameters) && 'priority' in jobData.parameters ? jobData.parameters.priority : 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          progress: (jobData.parameters && typeof jobData.parameters === 'object' && !Array.isArray(jobData.parameters) && 'progress' in jobData.parameters ? jobData.parameters.progress : { total: 0, completed: 0, failed: 0, percentage: 0 }) as { total: number; completed: number; failed: number; current?: string; percentage: number; },
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