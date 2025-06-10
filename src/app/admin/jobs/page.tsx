'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge, badgeVariants } from '@/components/ui/badge' // Assuming badgeVariants for direct class usage if needed
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, RefreshCw, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link' // For navigation if needed
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card" // Added Card imports

// Define Job type based on API response from GET /api/jobs and AdvancedBatchProcessor
// This should align with the structure returned by GET /api/jobs and what's stored by AdvancedBatchProcessor
interface Job {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'dead_letter'; // Added 'dead_letter'
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // From AdvancedBatchProcessor
  progress: number; // Percentage
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  metadata?: { // This is the 'parameters' field from the jobs table, which AdvancedBatchProcessor populates
    parameters?: any; // Original parameters passed to the job
    workspaceId?: string;
    userId?: string;
    progress?: { // Detailed progress from AdvancedBatchProcessor
        total: number;
        completed: number;
        failed: number;
        current?: string;
    };
    timestamps?: any; // Timestamps from AdvancedBatchProcessor
    error?: { message: string; code: string; details?: any }; // Detailed error from AdvancedBatchProcessor
    [key: string]: any; // Allow other metadata fields
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch jobs' }));
    throw new Error(errorData.message || 'An unknown error occurred');
  }
  return res.json();
};

export default function AdminJobsPage() {
  // TODO: Add pagination state and controls
  const [currentPage, setCurrentPage] = useState(0);
  const jobsPerPage = 20;

  const { data, error, mutate, isLoading } = useSWR<{ jobs: Job[], total: number }>(
    `/api/jobs?limit=${jobsPerPage}&offset=${currentPage * jobsPerPage}`, 
    fetcher, 
    {
      refreshInterval: 5000 // Poll every 5 seconds for job status updates
    }
  );

  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      // The /api/jobs/[jobId]/rerun endpoint should re-queue the job.
      // It might create a new job or update the status of the existing one to 'pending'.
      // AdvancedBatchProcessor's loadPersistedJobs resets 'running' to 'pending', 
      // so updating status to 'pending' and clearing error/progress might be enough.
      const res = await fetch(`/api/jobs/${jobId}/rerun`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to retry job' }));
        throw new Error(errorData.error || 'Failed to retry job');
      }
      toast.success(`Job ${jobId} re-queued successfully.`);
      mutate(); // Revalidate job list
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unknown error occurred during retry.');
      console.error('Retry job error:', err);
    } finally {
      setRetryingJobId(null);
    }
  };

  const getStatusBadgeVariant = (status: Job['status']): typeof badgeVariants.arguments extends (infer R)[] ? R : any => {
    switch (status) {
      case 'completed': return 'success'; // Assuming 'success' variant exists and is green
      case 'running': return 'default';   // Default/blue
      case 'pending': return 'secondary'; // Gray
      case 'failed': return 'destructive'; // Red
      case 'dead_letter': return 'destructive'; // Also destructive, or a different dark variant
      case 'paused': return 'outline';     // Gray outline
      case 'cancelled': return 'outline';   // Gray outline
      default: return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Job Monitoring</h1>
        <Button onClick={() => mutate()} variant="outline" disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> 
          Refresh Jobs
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> Failed to load jobs: {error.message}</span>
        </div>
      )}

      {isLoading && !data && <p>Loading jobs...</p>}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Job Queue</CardTitle>
            <CardDescription>Overview of background processing jobs. List refreshes automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      No jobs found.
                    </TableCell>
                  </TableRow>
                )}
                {data.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs py-3">{job.id}</TableCell>
                    <TableCell className="py-3">{job.type}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center w-32">
                        <Progress value={job.progress || 0} className="h-2 mr-2 flex-grow" />
                        <span className="text-xs">{job.progress || 0}%</span>
                      </div>
                      {job.status === 'running' && job.metadata?.progress?.current && (
                        <p className="text-xs text-gray-500 mt-1 truncate" title={job.metadata.progress.current}>
                          Current: {job.metadata.progress.current}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm">{formatTimestamp(job.created_at)}</TableCell>
                    <TableCell className="py-3 text-xs text-red-500 max-w-[200px] truncate" title={job.error || job.metadata?.error?.message || ''}>
                      {job.error || job.metadata?.error?.message ? <AlertTriangle className="inline h-4 w-4 mr-1 text-red-400" /> : ''}
                      {job.error || job.metadata?.error?.message}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {(job.status === 'failed' || job.status === 'dead_letter') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRetryJob(job.id)}
                          disabled={retryingJobId === job.id}
                        >
                          <PlayCircle className="mr-1 h-4 w-4" />
                          {retryingJobId === job.id ? 'Retrying...' : 'Retry'}
                        </Button>
                      )}
                      {/* Add other actions like view details, cancel, pause/resume if AdvancedBatchProcessor supports them via API */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* TODO: Implement pagination controls using data.total and jobsPerPage */}
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {Math.ceil(data.total / jobsPerPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => (prev + 1) * jobsPerPage < data.total ? prev + 1 : prev)}
                disabled={(currentPage + 1) * jobsPerPage >= data.total}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper components from shadcn/ui if not globally available (usually are)
// For Card, CardHeader, CardTitle, CardDescription, CardContent
// These are typically imported from '@/components/ui/card'
// Ensure these are correctly set up in your project.
