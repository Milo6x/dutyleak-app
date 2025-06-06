'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface JobStatus {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  created_at: string
  completed_at?: string
  error_message?: string
}

interface JobStatusChartProps {
  jobs: JobStatus[]
  className?: string
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Pending'
  },
  running: {
    icon: PlayIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Running'
  },
  completed: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Completed'
  },
  failed: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed'
  },
  cancelled: {
    icon: ExclamationTriangleIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Cancelled'
  }
}

export function JobStatusChart({ jobs, className }: JobStatusChartProps) {
  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    }
    
    if (jobs && Array.isArray(jobs)) {
      jobs.forEach(job => {
        counts[job.status]++
      })
    }
    
    return counts
  }, [jobs])

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const getJobTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      'csv_import': 'CSV Import',
      'hs_classification': 'HS Classification',
      'duty_calculation': 'Duty Calculation',
      'data_sync': 'Data Sync',
      'report_generation': 'Report Generation'
    }
    return typeLabels[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const totalJobs = jobs?.length || 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Job Status Monitor</CardTitle>
        <CardDescription>
          Background job progress and status overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Summary */}
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(statusCounts).map(([status, count]) => {
              const config = statusConfig[status as keyof typeof statusConfig]
              const Icon = config.icon
              const percentage = totalJobs > 0 ? (count / totalJobs) * 100 : 0
              
              return (
                <div key={status} className="text-center">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor} mb-1`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs text-gray-600">{config.label}</div>
                  <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>

          {/* Recent Jobs */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Recent Jobs</h4>
            {(jobs || []).slice(0, 5).map((job) => {
              const config = statusConfig[job.status]
              const Icon = config.icon
              
              return (
                <div key={job.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getJobTypeLabel(job.type)}
                      </p>
                      <Badge 
                        variant={job.status === 'completed' ? 'default' : 
                                job.status === 'failed' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {config.label}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Started {formatDate(job.created_at)}
                      {job.completed_at && ` • Completed ${formatDate(job.completed_at)}`}
                    </p>
                    
                    {job.status === 'running' && job.progress !== undefined && (
                      <div className="mt-2">
                        <Progress value={job.progress} className="h-1" />
                        <p className="text-xs text-gray-500 mt-1">{job.progress}% complete</p>
                      </div>
                    )}
                    
                    {job.status === 'failed' && job.error_message && (
                      <p className="text-xs text-red-600 mt-1 truncate">
                        Error: {job.error_message}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {(!jobs || jobs.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No recent jobs</p>
            <p className="text-sm mt-1">Background jobs will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default JobStatusChart