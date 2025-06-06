import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/external/sonner-mock'

export interface BatchJob {
  id: string
  type: 'classification' | 'fba_calculation' | 'data_export' | 'data_import'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  progress: {
    total: number
    completed: number
    failed: number
    currentItem?: string
  }
  metadata: {
    productIds: string[]
    parameters: Record<string, any>
    userId: string
    workspaceId: string
  }
  error?: {
    message: string
    code?: string
    retryCount: number
    lastRetryAt?: string
  }
  createdAt: string
  startedAt?: string
  completedAt?: string
  estimatedTimeRemaining?: number
}

export interface QueueStatus {
  pending: number
  running: number
  capacity: number
  totalJobs: number
}

export interface BatchFilter {
  status?: string
  type?: string
  priority?: string
}

export function useBatchProcessor() {
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    running: 0,
    capacity: 0,
    totalJobs: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch jobs with optional filtering
  const fetchJobs = useCallback(async (filter?: BatchFilter) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (filter?.status) {params.append('status', filter.status)}
      if (filter?.type) {params.append('type', filter.type)}
      if (filter?.priority) {params.append('priority', filter.priority)}
      
      const response = await fetch(`/api/batch?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }
      
      const data = await response.json()
      setJobs(data.jobs || [])
      setQueueStatus(data.queueStatus || {
        pending: 0,
        running: 0,
        capacity: 0,
        totalJobs: 0
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to fetch jobs: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create a new batch job
  const createJob = useCallback(async (
    type: BatchJob['type'],
    productIds: string[],
    priority: BatchJob['priority'] = 'medium',
    parameters: Record<string, any> = {}
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          productIds,
          priority,
          parameters
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create job')
      }
      
      const data = await response.json()
      toast.success(`Batch job created successfully (ID: ${data.jobId})`)
      
      // Refresh jobs list
      await fetchJobs()
      
      return data.jobId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast.error(`Failed to create job: ${errorMessage}`)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fetchJobs])

  // Get specific job details
  const getJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch/${jobId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details')
      }
      
      const data = await response.json()
      return data.job
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to fetch job details: ${errorMessage}`)
      throw err
    }
  }, [])

  // Pause a job
  const pauseJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'pause' })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to pause job')
      }
      
      toast.success('Job paused successfully')
      await fetchJobs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to pause job: ${errorMessage}`)
      throw err
    }
  }, [fetchJobs])

  // Resume a job
  const resumeJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'resume' })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resume job')
      }
      
      toast.success('Job resumed successfully')
      await fetchJobs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to resume job: ${errorMessage}`)
      throw err
    }
  }, [fetchJobs])

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel' })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel job')
      }
      
      toast.success('Job cancelled successfully')
      await fetchJobs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to cancel job: ${errorMessage}`)
      throw err
    }
  }, [fetchJobs])

  // Retry a failed job
  const retryJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'retry' })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to retry job')
      }
      
      toast.success('Job queued for retry')
      await fetchJobs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to retry job: ${errorMessage}`)
      throw err
    }
  }, [fetchJobs])

  // Delete a job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/batch/${jobId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete job')
      }
      
      toast.success('Job deleted successfully')
      await fetchJobs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to delete job: ${errorMessage}`)
      throw err
    }
  }, [fetchJobs])

  // Auto-refresh jobs every 5 seconds when there are active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(job => 
      job.status === 'running' || job.status === 'pending'
    )
    
    if (!hasActiveJobs) {return}
    
    const interval = setInterval(() => {
      fetchJobs()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [jobs, fetchJobs])

  return {
    jobs,
    queueStatus,
    isLoading,
    error,
    fetchJobs,
    createJob,
    getJob,
    pauseJob,
    resumeJob,
    cancelJob,
    retryJob,
    deleteJob
  }
}