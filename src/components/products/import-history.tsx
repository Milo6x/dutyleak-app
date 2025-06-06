'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface ImportRecord {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_rows: number
  processed_rows: number
  successful_imports: number
  failed_imports: number
  error_message: string | null
  created_at: string
  completed_at: string | null
  user_id: string
  workspace_id: string
}

interface ImportHistoryProps {
  limit?: number
  showActions?: boolean
}

export default function ImportHistory({ limit = 10, showActions = true }: ImportHistoryProps) {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchImportHistory()
  }, [])

  const fetchImportHistory = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {return}

      // Get user's workspace
      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspaceUser) {
        setError('No workspace found')
        return
      }

      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('workspace_id', workspaceUser.workspace_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {throw error}
      
      // Map data to include missing properties required by ImportRecord interface
      const mappedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'processing' | 'completed' | 'failed',
        error_message: null,
        user_id: user.id
      }))
      
      setImports(mappedData)
    } catch (err) {
      console.error('Error fetching import history:', err)
      setError('Failed to load import history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <DocumentArrowUpIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getProgressPercentage = (record: ImportRecord) => {
    if (record.total_rows === 0) {return 0}
    return Math.round((record.processed_rows / record.total_rows) * 100)
  }

  const handleViewDetails = (importId: string) => {
    // Navigate to detailed import view
    window.open(`/products/import/${importId}`, '_blank')
  }

  const handleDownloadReport = async (importId: string) => {
    try {
      // Generate and download import report
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('id', importId)
        .single()

      if (error) {throw error}

      const report = {
        import_id: importId,
        filename: data.filename,
        status: data.status,
        summary: {
          total_rows: data.total_rows,
          processed_rows: data.processed_rows,
          successful_imports: data.successful_imports,
          failed_imports: data.failed_imports
        },
        timestamps: {
          started: data.created_at,
          completed: data.completed_at
        },
        error_message: null
      }

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `import-report-${importId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading report:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (imports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No imports yet</h3>
            <p className="text-gray-500">Import your first CSV file to see the history here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
          Import History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {imports.map((record) => (
            <div key={record.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                {getStatusIcon(record.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {record.filename}
                  </h4>
                  {getStatusBadge(record.status)}
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>
                    {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                  </span>
                  
                  {record.total_rows > 0 && (
                    <span>
                      {record.processed_rows} / {record.total_rows} rows
                      {record.status === 'processing' && (
                        <span className="ml-1">({getProgressPercentage(record)}%)</span>
                      )}
                    </span>
                  )}
                  
                  {record.status === 'completed' && (
                    <span className="text-green-600">
                      {record.successful_imports} imported
                      {record.failed_imports > 0 && (
                        <span className="text-red-600 ml-1">
                          , {record.failed_imports} failed
                        </span>
                      )}
                    </span>
                  )}
                </div>
                
                {record.error_message && (
                  <p className="text-xs text-red-600 mt-1 truncate">
                    {record.error_message}
                  </p>
                )}
              </div>
              
              {showActions && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(record.id)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  
                  {record.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadReport(record.id)}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}