'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QueueListIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { batchProcessor, BatchJob, BatchProgressUpdate } from '@/lib/batch/advanced-batch-processor'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from '@/lib/external/sonner-mock'
import { BatchScheduler } from './batch-scheduler'

interface BatchProcessingDashboardProps {
  selectedProducts?: string[]
  onJobComplete?: (jobId: string) => void
}

export default function BatchProcessingDashboard({
  selectedProducts = [],
  onJobComplete
}: BatchProcessingDashboardProps) {
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [queueStatus, setQueueStatus] = useState({
    pending: 0,
    running: 0,
    maxConcurrent: 3,
    totalJobs: 0
  })
  const [activeTab, setActiveTab] = useState('active')
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false)
  const [newJobType, setNewJobType] = useState<BatchJob['type']>('classification')
  const [newJobPriority, setNewJobPriority] = useState<BatchJob['priority']>('medium')
  const [progressUpdates, setProgressUpdates] = useState<Map<string, BatchProgressUpdate>>(new Map())

  // Load jobs and queue status
  const loadData = useCallback(() => {
    setJobs(batchProcessor.getJobs())
    setQueueStatus(batchProcessor.getQueueStatus())
  }, [])

  // Set up event listeners
  useEffect(() => {
    const handleJobAdded = (job: BatchJob) => {
      loadData()
      toast.success(`Job "${job.type}" added to queue`)
    }

    const handleJobStarted = (job: BatchJob) => {
      loadData()
      toast.success(`Job "${job.type}" started`)
    }

    const handleJobCompleted = (job: BatchJob) => {
      loadData()
      toast.success(`Job "${job.type}" completed successfully`)
      onJobComplete?.(job.id)
    }

    const handleJobFailed = (job: BatchJob) => {
      loadData()
      toast.error(`Job "${job.type}" failed: ${job.error?.message}`)
    }

    const handleJobPaused = (job: BatchJob) => {
      loadData()
      toast.info(`Job "${job.type}" paused`)
    }

    const handleJobResumed = (job: BatchJob) => {
      loadData()
      toast.success(`Job "${job.type}" resumed`)
    }

    const handleJobCancelled = (job: BatchJob) => {
      loadData()
      toast.warning(`Job "${job.type}" cancelled`)
    }

    const handleProgressUpdate = (update: BatchProgressUpdate) => {
      setProgressUpdates(prev => new Map(prev.set(update.jobId, update)))
    }

    const handleJobRetry = ({ job, attempt }: { job: BatchJob; attempt: number }) => {
      toast.info(`Retrying job "${job.type}" (attempt ${attempt})`)
    }

    // Add event listeners
    batchProcessor.on('jobAdded', handleJobAdded)
    batchProcessor.on('jobStarted', handleJobStarted)
    batchProcessor.on('jobCompleted', handleJobCompleted)
    batchProcessor.on('jobFailed', handleJobFailed)
    batchProcessor.on('jobPaused', handleJobPaused)
    batchProcessor.on('jobResumed', handleJobResumed)
    batchProcessor.on('jobCancelled', handleJobCancelled)
    batchProcessor.on('progressUpdate', handleProgressUpdate)
    batchProcessor.on('jobRetry', handleJobRetry)

    // Initial load
    loadData()

    // Cleanup
    return () => {
      batchProcessor.removeListener('jobAdded', handleJobAdded)
      batchProcessor.removeListener('jobStarted', handleJobStarted)
      batchProcessor.removeListener('jobCompleted', handleJobCompleted)
      batchProcessor.removeListener('jobFailed', handleJobFailed)
      batchProcessor.removeListener('jobPaused', handleJobPaused)
      batchProcessor.removeListener('jobResumed', handleJobResumed)
      batchProcessor.removeListener('jobCancelled', handleJobCancelled)
      batchProcessor.removeListener('progressUpdate', handleProgressUpdate)
      batchProcessor.removeListener('jobRetry', handleJobRetry)
    }
  }, [loadData, onJobComplete])

  // Create new job
  const handleCreateJob = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected')
      return
    }

    try {
      const jobId = await batchProcessor.addJob(
        newJobType,
        {
          productIds: selectedProducts,
          parameters: {
            batchSize: 10,
            retryAttempts: 3
          }
        },
        newJobPriority
      )

      setIsCreateJobOpen(false)
      toast.success(`Job created with ID: ${jobId}`)
    } catch (error) {
      console.error('Error creating job:', error)
      toast.error('Failed to create job')
    }
  }

  // Job control actions
  const handlePauseJob = async (jobId: string) => {
    const success = await batchProcessor.pauseJob(jobId)
    if (!success) {
      toast.error('Failed to pause job')
    }
  }

  const handleResumeJob = async (jobId: string) => {
    const success = await batchProcessor.resumeJob(jobId)
    if (!success) {
      toast.error('Failed to resume job')
    }
  }

  const handleCancelJob = async (jobId: string) => {
    const success = await batchProcessor.cancelJob(jobId)
    if (!success) {
      toast.error('Failed to cancel job')
    }
  }

  // Get status badge
  const getStatusBadge = (status: BatchJob['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: ClockIcon, text: 'Pending' },
      running: { variant: 'default' as const, icon: PlayIcon, text: 'Running' },
      paused: { variant: 'outline' as const, icon: PauseIcon, text: 'Paused' },
      completed: { variant: 'default' as const, icon: CheckCircleIcon, text: 'Completed' },
      failed: { variant: 'destructive' as const, icon: XCircleIcon, text: 'Failed' },
      cancelled: { variant: 'secondary' as const, icon: StopIcon, text: 'Cancelled' }
    }

    const config = variants[status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  // Get priority badge
  const getPriorityBadge = (priority: BatchJob['priority']) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'default',
      urgent: 'destructive'
    } as const

    return (
      <Badge variant={variants[priority]} className="capitalize">
        {priority}
      </Badge>
    )
  }

  // Filter jobs by tab
  const getFilteredJobs = () => {
    switch (activeTab) {
      case 'active':
        return jobs.filter(job => ['pending', 'running', 'paused'].includes(job.status))
      case 'completed':
        return jobs.filter(job => job.status === 'completed')
      case 'failed':
        return jobs.filter(job => ['failed', 'cancelled'].includes(job.status))
      default:
        return jobs
    }
  }

  // Get estimated time remaining
  const getEstimatedTimeRemaining = (job: BatchJob): string => {
    if (job.status !== 'running' || job.progress.percentage === 0) {
      return 'Unknown'
    }

    const elapsed = job.timestamps.started 
      ? Date.now() - job.timestamps.started.getTime()
      : 0
    
    const remaining = (elapsed / job.progress.percentage) * (100 - job.progress.percentage)
    
    if (remaining < 60000) {
      return `${Math.round(remaining / 1000)}s`
    } else if (remaining < 3600000) {
      return `${Math.round(remaining / 60000)}m`
    } else {
      return `${Math.round(remaining / 3600000)}h`
    }
  }

  return (
    <div className="space-y-6">
      {/* Queue Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{queueStatus.pending}</p>
              </div>
              <QueueListIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Running</p>
                <p className="text-2xl font-bold">{queueStatus.running}</p>
              </div>
              <CpuChipIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Capacity</p>
                <p className="text-2xl font-bold">{queueStatus.running}/{queueStatus.maxConcurrent}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs font-medium">{Math.round((queueStatus.running / queueStatus.maxConcurrent) * 100)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{queueStatus.totalJobs}</p>
              </div>
              <div className="flex items-center gap-1">
                <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={selectedProducts.length === 0}>
                      New Job
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Batch Job</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="job-type">Job Type</Label>
                        <Select value={newJobType} onValueChange={(value: BatchJob['type']) => setNewJobType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classification">Classification</SelectItem>
                            <SelectItem value="fba_calculation">FBA Calculation</SelectItem>
                            <SelectItem value="data_export">Data Export</SelectItem>
                            <SelectItem value="data_import">Data Import</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="job-priority">Priority</Label>
                        <Select value={newJobPriority} onValueChange={(value: BatchJob['priority']) => setNewJobPriority(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Alert>
                        <AlertDescription>
                          This job will process {selectedProducts.length} selected products.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateJobOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateJob}>
                          Create Job
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="active">Active ({jobs.filter(j => ['pending', 'running', 'paused'].includes(j.status)).length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({jobs.filter(j => j.status === 'completed').length})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({jobs.filter(j => ['failed', 'cancelled'].includes(j.status)).length})</TabsTrigger>
              <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
              <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {getFilteredJobs().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </div>
                ) : (
                  getFilteredJobs().map(job => {
                    const progressUpdate = progressUpdates.get(job.id)
                    const currentProgress = progressUpdate?.progress || job.progress
                    
                    return (
                      <Card key={job.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div>
                                <h4 className="font-medium capitalize">{job.type.replace('_', ' ')}</h4>
                                <p className="text-sm text-muted-foreground">ID: {job.id}</p>
                              </div>
                              {getStatusBadge(job.status)}
                              {getPriorityBadge(job.priority)}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {job.status === 'running' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePauseJob(job.id)}
                                >
                                  <PauseIcon className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {job.status === 'paused' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResumeJob(job.id)}
                                >
                                  <PlayIcon className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {['pending', 'running', 'paused'].includes(job.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelJob(job.id)}
                                >
                                  <StopIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>
                                {currentProgress.completed} / {currentProgress.total} completed
                                {currentProgress.failed > 0 && (
                                  <span className="text-destructive ml-2">({currentProgress.failed} failed)</span>
                                )}
                              </span>
                              <span>{currentProgress.percentage}%</span>
                            </div>
                            <Progress value={currentProgress.percentage} className="h-2" />
                          </div>
                          
                          {/* Job Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Created</p>
                              <p>{format(job.timestamps.created, 'MMM d, HH:mm')}</p>
                            </div>
                            
                            {job.timestamps.started && (
                              <div>
                                <p className="text-muted-foreground">Started</p>
                                <p>{format(job.timestamps.started, 'MMM d, HH:mm')}</p>
                              </div>
                            )}
                            
                            {job.status === 'running' && (
                              <div>
                                <p className="text-muted-foreground">ETA</p>
                                <p>{getEstimatedTimeRemaining(job)}</p>
                              </div>
                            )}
                            
                            {job.timestamps.completed && (
                              <div>
                                <p className="text-muted-foreground">Duration</p>
                                <p>
                                  {formatDistanceToNow(job.timestamps.started || job.timestamps.created, {
                                    addSuffix: false
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Current Item */}
                          {job.status === 'running' && currentProgress.current && (
                            <div className="mt-3 p-2 bg-muted rounded text-sm">
                              <p className="text-muted-foreground">Currently processing:</p>
                              <p className="font-mono">{currentProgress.current}</p>
                            </div>
                          )}
                          
                          {/* Error Details */}
                          {job.error && (
                            <Alert className="mt-3">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Error:</strong> {job.error.message}
                                {job.metadata.retryCount && (
                                  <span className="ml-2">
                                    (Retry {job.metadata.retryCount}/{job.metadata.maxRetries})
                                  </span>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="scheduler">
              <BatchScheduler />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}