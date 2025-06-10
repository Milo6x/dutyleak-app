'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input' // Kept for potential future use, not in current create form
import { Label } from '@/components/ui/label'
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  // TrashIcon, // Not used currently
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QueueListIcon,
  CpuChipIcon,
  // ArrowPathIcon, // Not used currently
  // CalendarIcon // Not used currently
} from '@heroicons/react/24/outline'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { toast } from 'sonner';
import { BatchScheduler } from './batch-scheduler' // Assuming this component does not import batchProcessor directly
import useSWR from 'swr'

// Client-side representation of a BatchJob, ensure fields match API response from GET /api/jobs
export interface ClientBatchJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number; // This is the top-level percentage from the DB
  metadata: { // This is the 'parameters' field from the jobs table
    productIds?: string[];
    parameters?: any; // Original parameters passed to the job
    retryCount?: number;
    maxRetries?: number;
    workspaceId?: string;
    // Detailed progress from AdvancedBatchProcessor might be nested here if API returns it
    progress?: { 
        total: number;
        completed: number;
        failed: number;
        current?: string;
        percentage: number; // This is the detailed one, API might return top-level one too
    };
    error?: { message: string; code?: string; details?: any };
    [key: string]: any; 
  };
  created_at: string; // ISO string
  started_at?: string | null; // ISO string
  completed_at?: string | null; // ISO string
  error?: string | null; // Top-level error message string from DB
}


interface BatchProcessingDashboardProps {
  selectedProducts?: string[]; // Product IDs selected in another part of the UI for new job creation
  onJobComplete?: (jobId: string) => void; // Callback when a job completes (might be harder to track without events)
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    // error.info = await res.json();
    // error.status = res.status;
    throw error;
  }
  return res.json();
});

export default function BatchProcessingDashboard({
  selectedProducts = [],
  onJobComplete // This callback might be tricky to implement reliably without direct events or websockets
}: BatchProcessingDashboardProps) {
  
  const [activeTab, setActiveTab] = useState('active');
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  // Ensure these types align with what the POST /api/jobs endpoint expects for 'type' and 'priority'
  const [newJobType, setNewJobType] = useState<ClientBatchJob['type']>('classification'); 
  const [newJobPriority, setNewJobPriority] = useState<ClientBatchJob['priority']>('medium');

  const { data: apiJobData, error: apiJobError, mutate: mutateJobs, isLoading: isLoadingJobs } = useSWR<{ jobs: ClientBatchJob[], total: number }>(
    '/api/jobs?limit=100&order=created_at:desc', // Fetch more jobs, sort by creation
    fetcher,
    { 
      refreshInterval: 5000, // Poll for updates every 5 seconds
    }
  );

  const jobs: ClientBatchJob[] = apiJobData?.jobs || [];
  const totalJobsFromApi = apiJobData?.total || 0;

  const queueStatus = jobs.reduce((acc, job) => {
    if (job.status === 'pending') acc.pending++;
    if (job.status === 'running') acc.running++;
    return acc;
  }, { pending: 0, running: 0, maxConcurrent: 3, totalJobs: totalJobsFromApi }); // Assuming maxConcurrent is known or static for display

  const handleCreateJob = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected to process.');
      return;
    }

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newJobType,
          priority: newJobPriority,
          parameters: { // This structure must match what POST /api/jobs expects
            productIds: selectedProducts,
            // Add any other parameters specific to the job type if your API needs them
            // e.g., custom_param: 'value'
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create job' }));
        throw new Error(errorData.error || 'Server error creating job');
      }

      const result = await response.json();
      setIsCreateJobOpen(false);
      toast.success(`Job "${newJobType}" created successfully with ID: ${result.jobId}`);
      mutateJobs(); // Re-fetch job list
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast.error(error.message || 'Failed to create job');
    }
  };

  const createApiJobAction = useCallback((action: 'pause' | 'resume' | 'cancel' | 'rerun') => async (jobId: string) => {
    const endpoint = action === 'rerun' ? `/api/jobs/${jobId}/rerun` : `/api/jobs/${jobId}/${action}`;
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to ${action} job` }));
        throw new Error(errorData.error || `Server error ${action}ing job`);
      }
      toast.info(`Job ${jobId} ${action} request sent.`);
      mutateJobs(); // Re-fetch job list to reflect status changes
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} job`);
    }
  }, [mutateJobs]);

  const handlePauseJob = createApiJobAction('pause');
  const handleResumeJob = createApiJobAction('resume');
  const handleCancelJob = createApiJobAction('cancel');
  const handleRetryJob = createApiJobAction('rerun'); // Assuming rerun API exists and works

  const getStatusBadge = (status: ClientBatchJob['status']) => {
    const variants: Record<ClientBatchJob['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ElementType, text: string }> = {
      pending: { variant: 'secondary', icon: ClockIcon, text: 'Pending' },
      running: { variant: 'default', icon: PlayIcon, text: 'Running' }, 
      paused: { variant: 'outline', icon: PauseIcon, text: 'Paused' },
      completed: { variant: 'default', icon: CheckCircleIcon, text: 'Completed' }, // Changed 'success' to 'default'; consider custom styling if green is needed
      failed: { variant: 'destructive', icon: XCircleIcon, text: 'Failed' },
      cancelled: { variant: 'outline', icon: StopIcon, text: 'Cancelled' }, 
      dead_letter: { variant: 'destructive', icon: ExclamationTriangleIcon, text: 'Dead Letter' }
    };

    const config = variants[status] || variants['pending']; // Fallback to pending if status is unknown
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 whitespace-nowrap">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };
  
  const getPriorityBadge = (priority: ClientBatchJob['priority']) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'default', // Using default for high
      urgent: 'destructive'
    } as const;
    return (
      <Badge variant={variants[priority]} className="capitalize">
        {priority}
      </Badge>
    );
  };

  const getFilteredJobs = () => {
    if (!jobs) return [];
    switch (activeTab) {
      case 'active':
        return jobs.filter(job => ['pending', 'running', 'paused'].includes(job.status));
      case 'completed':
        return jobs.filter(job => job.status === 'completed');
      case 'failed':
        return jobs.filter(job => ['failed', 'cancelled', 'dead_letter'].includes(job.status));
      case 'all':
      default:
        return jobs;
    }
  };

  const displayedJobs = getFilteredJobs();

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      return format(parseISO(isoString), 'MMM d, HH:mm:ss');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const formatDuration = (start?: string | null, end?: string | null) => {
    if (!start || !end) return 'N/A';
    try {
      return formatDistanceToNow(parseISO(start), { addSuffix: false }) + ' (ended)'; // This is not duration, but time since start
      // A proper duration would be: formatDistance(parseISO(end), parseISO(start))
    } catch (e) {
      return 'Invalid Dates for Duration';
    }
  };


  if (apiJobError) return <Alert variant="destructive"><AlertDescription>Error loading jobs: {apiJobError.message}</AlertDescription></Alert>;
  // if (isLoadingJobs) return <p>Loading jobs dashboard...</p>; // SWR handles loading state internally often

  return (
    <div className="space-y-6">
      {/* Queue Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{queueStatus.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Running</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{queueStatus.running}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Capacity</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{queueStatus.running}/{queueStatus.maxConcurrent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Jobs</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{totalJobsFromApi}</div>
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
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="job-type">Job Type</Label>
                    <Select value={newJobType} onValueChange={(value) => setNewJobType(value as ClientBatchJob['type'])}>
                      <SelectTrigger id="job-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classification">Classification</SelectItem>
                        <SelectItem value="fba_calculation">FBA Calculation</SelectItem>
                        <SelectItem value="duty_optimization">Duty Optimization</SelectItem>
                        <SelectItem value="data_export">Data Export</SelectItem>
                        <SelectItem value="data_import">Data Import</SelectItem>
                        <SelectItem value="scenario_analysis">Scenario Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="job-priority">Priority</Label>
                    <Select value={newJobPriority} onValueChange={(value) => setNewJobPriority(value as ClientBatchJob['priority'])}>
                      <SelectTrigger id="job-priority"><SelectValue /></SelectTrigger>
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
                      Ensure these products are relevant for the chosen job type.
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateJobOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateJob}>Create Job</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Jobs</CardTitle>
          <CardDescription>Overview of background processing jobs. List refreshes automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4"> {/* Adjusted for 4 tabs */}
              <TabsTrigger value="active">Active ({jobs.filter(j => ['pending', 'running', 'paused'].includes(j.status)).length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({jobs.filter(j => j.status === 'completed').length})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({jobs.filter(j => ['failed', 'cancelled', 'dead_letter'].includes(j.status)).length})</TabsTrigger>
              <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
              {/* <TabsTrigger value="scheduler">Scheduler</TabsTrigger> Removed scheduler tab for now */}
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0"> {/* Removed mt-4 if TabsList has mb-4 */}
              {isLoadingJobs && !apiJobData && <p>Loading jobs...</p>}
              <div className="space-y-4">
                {displayedJobs.length === 0 && !isLoadingJobs ? (
                  <div className="text-center py-8 text-muted-foreground">No jobs in this category.</div>
                ) : (
                  displayedJobs.map(job => {
                    const detailedProgress = job.metadata?.progress || job.progress; // Use detailed if available
                    const currentProgressPercentage = typeof detailedProgress === 'number' ? detailedProgress : detailedProgress.percentage;
                    const completedItems = typeof detailedProgress === 'number' ? 'N/A' : detailedProgress.completed;
                    const totalItems = typeof detailedProgress === 'number' ? 'N/A' : detailedProgress.total;
                    const failedItems = typeof detailedProgress === 'number' ? 0 : detailedProgress.failed;
                    const currentItem = typeof detailedProgress === 'object' ? detailedProgress.current : undefined;

                    return (
                      <Card key={job.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div>
                                <h4 className="font-medium capitalize">{job.type.replace(/_/g, ' ')}</h4>
                                <p className="text-xs text-muted-foreground break-all">ID: {job.id}</p>
                              </div>
                              {getStatusBadge(job.status)}
                              {getPriorityBadge(job.priority)}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {job.status === 'running' && <Button size="sm" variant="outline" onClick={() => handlePauseJob(job.id)}><PauseIcon className="h-4 w-4" /></Button>}
                              {job.status === 'paused' && <Button size="sm" variant="outline" onClick={() => handleResumeJob(job.id)}><PlayIcon className="h-4 w-4" /></Button>}
                              {['pending', 'running', 'paused'].includes(job.status) && <Button size="sm" variant="outline" onClick={() => handleCancelJob(job.id)}><StopIcon className="h-4 w-4" /></Button>}
                              {(job.status === 'failed' || job.status === 'dead_letter') && <Button size="sm" variant="outline" onClick={() => handleRetryJob(job.id)}><PlayIcon className="h-4 w-4 mr-1" />Retry</Button>}
                            </div>
                          </div>
                          
                          <div className="space-y-1 my-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                Progress: {completedItems}/{totalItems}
                                {failedItems > 0 && <span className="text-destructive ml-1">({failedItems} failed)</span>}
                              </span>
                              <span>{currentProgressPercentage}%</span>
                            </div>
                            <Progress value={currentProgressPercentage} className="h-2" />
                          </div>
                          
                          {job.status === 'running' && currentItem && (
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={currentItem}>Processing: {currentItem}</p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs border-t pt-2">
                            <div><span className="text-muted-foreground">Created:</span> {formatTimestamp(job.created_at)}</div>
                            {job.started_at && <div><span className="text-muted-foreground">Started:</span> {formatTimestamp(job.started_at)}</div>}
                            {job.completed_at && <div><span className="text-muted-foreground">Completed:</span> {formatTimestamp(job.completed_at)}</div>}
                            {/* {job.completed_at && job.started_at && <div><span className="text-muted-foreground">Duration:</span> {formatDuration(job.started_at, job.completed_at)}</div>} */}
                          </div>
                          
                          {(job.error || job.metadata?.error?.message) && (
                            <Alert variant="destructive" className="mt-3 text-xs">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              <AlertDescription>
                                {job.error || job.metadata?.error?.message}
                                {job.metadata?.retryCount !== undefined && job.metadata?.maxRetries !== undefined && (
                                  <span className="ml-2">(Retry {job.metadata.retryCount}/{job.metadata.maxRetries})</span>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="scheduler">
              <BatchScheduler /> {/* Ensure BatchScheduler is also refactored if it uses batchProcessor */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
