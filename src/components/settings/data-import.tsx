'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, AlertCircle, CheckCircle, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportJob {
  id: string
  type: 'full' | 'products' | 'classifications' | 'calculations' | 'workspace'
  format: 'json' | 'csv'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  file_name: string
  file_size?: string
  imported_count?: number
  failed_count?: number
  error_message?: string
}

interface DataImportProps {
  className?: string
}

export function DataImport({ className }: DataImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<string>('')
  const [importFormat, setImportFormat] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [importJobs, setImportJobs] = useState<ImportJob[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)

  // Fetch import jobs on component mount
  const fetchImportJobs = async () => {
    setIsLoadingJobs(true)
    try {
      const response = await fetch('/api/settings/import-jobs')
      if (response.ok) {
        const jobs = await response.json()
        setImportJobs(jobs)
      }
    } catch (error) {
      console.error('Error fetching import jobs:', error)
    } finally {
      setIsLoadingJobs(false)
    }
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/json', 'text/csv', 'text/plain']
      const isValidType = allowedTypes.includes(file.type) || 
                         file.name.endsWith('.csv') || 
                         file.name.endsWith('.json')
      
      if (!isValidType) {
        setUploadError('Please select a valid JSON or CSV file')
        return
      }
      
      setSelectedFile(file)
      setUploadError(null)
      
      // Auto-detect format from file extension
      if (file.name.endsWith('.json')) {
        setImportFormat('json')
      } else if (file.name.endsWith('.csv')) {
        setImportFormat('csv')
      }
    }
  }

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  // Handle import submission
  const handleImport = async () => {
    if (!selectedFile || !importType || !importFormat) {
      setUploadError('Please select a file, import type, and format')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', importType)
      formData.append('format', importFormat)

      const response = await fetch('/api/settings/import-jobs', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const newJob = await response.json()
      setImportJobs(prev => [newJob, ...prev])
      
      // Reset form
      setSelectedFile(null)
      setImportType('')
      setImportFormat('')
      
      // Refresh jobs list
      setTimeout(() => fetchImportJobs(), 1000)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Get status badge
  const getStatusBadge = (status: ImportJob['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, text: 'Pending' },
      processing: { variant: 'default' as const, icon: Clock, text: 'Processing' },
      completed: { variant: 'default' as const, icon: CheckCircle, text: 'Completed' },
      failed: { variant: 'destructive' as const, icon: AlertCircle, text: 'Failed' }
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Import Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>
            Upload JSON or CSV files to import your data. Supported types include products, classifications, calculations, and workspace settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-500">
                      Click to upload
                    </label>
                    {' '}or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">JSON or CSV files only</p>
                </div>
              )}
              <Input
                id="file-upload"
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Import Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="import-type">Import Type</Label>
              <Select value={importType} onValueChange={setImportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select import type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="classifications">Classifications</SelectItem>
                  <SelectItem value="calculations">Calculations</SelectItem>
                  <SelectItem value="workspace">Workspace Settings</SelectItem>
                  <SelectItem value="full">Full Data Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-format">File Format</Label>
              <Select value={importFormat} onValueChange={setImportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Display */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!selectedFile || !importType || !importFormat || isUploading}
            className="w-full"
          >
            {isUploading ? 'Importing...' : 'Start Import'}
          </Button>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>
            View the status and details of your recent data imports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <div className="text-center py-4 text-gray-500">Loading import history...</div>
          ) : importJobs.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No import jobs found</div>
          ) : (
            <div className="space-y-3">
              {importJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{job.file_name}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Type: {job.type} • Format: {job.format.toUpperCase()}
                      {job.file_size && ` • Size: ${job.file_size}`}
                    </div>
                    {job.status === 'completed' && (
                      <div className="text-sm text-green-600">
                        Imported: {job.imported_count || 0} items
                        {job.failed_count ? ` • Failed: ${job.failed_count}` : ''}
                      </div>
                    )}
                    {job.status === 'failed' && job.error_message && (
                      <div className="text-sm text-red-600">
                        Error: {job.error_message}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}