'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/lib/external/sonner-mock'
import { DataImport } from '@/components/settings/data-import'
import { 
  CircleStackIcon, 
  ArrowDownTrayIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentArrowDownIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface DataUsage {
  classifications: number
  optimizations: number
  api_calls: number
  storage_mb: number
  last_export?: string
}

interface ExportJob {
  id: string
  type: 'full' | 'products' | 'classifications' | 'calculations' | 'workspace'
  format: 'json' | 'csv'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  file_size?: string
}

export default function DataPage() {
  const [dataUsage, setDataUsage] = useState<DataUsage | null>(null)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedExportType, setSelectedExportType] = useState<string>('full')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')
  const [selectedFormat, setSelectedFormat] = useState<string>('json')

  const supabase = createBrowserClient()

  useEffect(() => {
    fetchDataUsage()
    fetchExportJobs()
  }, [])

  const fetchDataUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch real data usage statistics from API
        const response = await fetch('/api/settings/data-usage')
        if (response.ok) {
          const usage = await response.json()
          setDataUsage(usage)
        } else {
          throw new Error('Failed to fetch data usage')
        }
      }
    } catch (error) {
      console.error('Error fetching data usage:', error)
      toast.error('Failed to load data usage')
    } finally {
      setLoading(false)
    }
  }

  const fetchExportJobs = async () => {
    try {
      const response = await fetch('/api/settings/export-jobs')
      if (response.ok) {
        const jobs = await response.json()
        setExportJobs(jobs)
      } else {
        throw new Error('Failed to fetch export jobs')
      }
    } catch (error) {
      console.error('Error fetching export jobs:', error)
      toast.error('Failed to load export jobs')
    }
  }

  const startExport = async () => {
    setExporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {throw new Error('No user found')}

      // Create real export job via API
      const response = await fetch('/api/settings/export-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: selectedExportType,
          format: selectedFormat
        })
      })

      if (response.ok) {
        const newExport = await response.json()
        setExportJobs([newExport, ...exportJobs])
        toast.success('Export started successfully. You will be notified when it\'s ready.')
        
        // Refresh export jobs to get updated status
        setTimeout(() => {
          fetchExportJobs()
        }, 2000)
      } else {
        throw new Error('Failed to start export')
      }
    } catch (error) {
      console.error('Error starting export:', error)
      toast.error('Failed to start export')
    } finally {
      setExporting(false)
    }
  }

  const downloadExport = async (job: ExportJob) => {
    if (job.status !== 'completed') {return}
    
    try {
      // Create download URL from job ID
      const downloadUrl = `/api/exports/download/${job.id}`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `dutyleak-${job.type}-export-${job.id}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Download started')
    } catch (error) {
      console.error('Error downloading export:', error)
      toast.error('Failed to download export')
    }
  }

  const deleteAllData = async () => {
    if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {throw new Error('No user found')}

      // Delete all user data via API
      const response = await fetch('/api/settings/delete-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('All data has been deleted successfully')
        fetchDataUsage()
      } else {
        throw new Error('Failed to delete data')
      }
    } catch (error) {
      console.error('Error deleting data:', error)
      toast.error('Failed to delete data')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data & Export</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your data, export information, and control data retention
        </p>
      </div>

      {/* Data Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleStackIcon className="h-5 w-5" />
            Data Usage Overview
          </CardTitle>
          <CardDescription>
            Current usage statistics and storage information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataUsage && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{dataUsage.classifications.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Classifications</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{dataUsage.optimizations.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Optimizations</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{dataUsage.api_calls.toLocaleString()}</div>
                <div className="text-sm text-gray-600">API Calls</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{dataUsage.storage_mb.toFixed(1)} MB</div>
                <div className="text-sm text-gray-600">Storage Used</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download your data in various formats for backup or migration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select value={selectedExportType} onValueChange={setSelectedExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Complete Data Export</SelectItem>
                  <SelectItem value="products">Products Only</SelectItem>
                  <SelectItem value="classifications">Classifications Only</SelectItem>
                  <SelectItem value="calculations">Calculations Only</SelectItem>
                  <SelectItem value="workspace">Workspace Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="last_30">Last 30 Days</SelectItem>
                  <SelectItem value="last_90">Last 90 Days</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              Exports are generated in ZIP format containing CSV and JSON files. Large exports may take several minutes to process.
            </AlertDescription>
          </Alert>

          <Button
            onClick={startExport}
            disabled={exporting}
            className="w-full md:w-auto"
          >
            {exporting ? 'Starting Export...' : 'Start Export'}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>
            View and download your previous data exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No exports found. Create your first export above.
              </div>
            ) : (
              exportJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DocumentArrowDownIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{job.type.replace('_', ' ')} Export</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          Created: {new Date(job.created_at).toLocaleString()}
                        </span>
                        {job.completed_at && (
                          <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
                        )}
                        {job.file_size && (
                          <span>Size: {job.file_size}</span>
                        )}
                      </div>
                      {job.status === 'processing' && (
                        <div className="mt-2">
                          <Progress value={65} className="w-48 h-2" />
                          <span className="text-xs text-gray-500">Processing... 65%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {job.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadExport(job)}
                    >
                      Download
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <TrashIcon className="h-5 w-5" />
            Delete All Data
          </CardTitle>
          <CardDescription>
            Permanently delete all your data from our servers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Warning:</strong> This action cannot be undone. All your classifications, optimizations, 
              analytics data, and account information will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Before deleting your data, consider:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Exporting your data for backup purposes</li>
              <li>Reviewing any active subscriptions or billing</li>
              <li>Informing team members if this is a shared workspace</li>
            </ul>
          </div>

          <Button
            variant="destructive"
            onClick={deleteAllData}
            disabled={deleting}
            className="w-full md:w-auto"
          >
            {deleting ? 'Deleting All Data...' : 'Delete All Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}