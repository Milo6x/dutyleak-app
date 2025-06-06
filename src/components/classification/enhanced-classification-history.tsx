'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoadingSpinner from '@/components/ui/loading-spinner'
import {
  ClockIcon,
  CheckCircleIcon,
  CpuChipIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChartBarIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface ClassificationHistoryItem {
  id: string
  hs6?: string
  hs8?: string
  confidence_score?: number
  source?: string
  ruling_reference?: string
  is_active: boolean
  created_at: string
  user_id?: string
  classification_data?: any
  updated_at?: string
  change_reason?: string
  previous_hs_code?: string
}

interface ClassificationAuditLog {
  id: string
  job_id: string
  level: string
  message: string
  metadata: any
  created_at: string
}

interface ClassificationAnalytics {
  totalClassifications: number
  accuracyRate: number
  averageConfidence: number
  sourceBreakdown: Record<string, number>
  confidenceDistribution: Record<string, number>
  timelineData: Array<{
    date: string
    count: number
    avgConfidence: number
  }>
  userActivity: Array<{
    userId: string
    userName: string
    count: number
    lastActivity: string
  }>
}

interface EnhancedClassificationHistoryProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
}

export default function EnhancedClassificationHistory({
  isOpen,
  onClose,
  productId,
  productName,
}: EnhancedClassificationHistoryProps) {
  const [history, setHistory] = useState<ClassificationHistoryItem[]>([])
  const [auditLogs, setAuditLogs] = useState<ClassificationAuditLog[]>([])
  const [analytics, setAnalytics] = useState<ClassificationAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('history')
  
  // Filters
  const [sourceFilter, setSourceFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Export
  const [exporting, setExporting] = useState(false)
  
  const supabase = createBrowserClient()

  useEffect(() => {
    if (isOpen && productId) {
      fetchData()
    }
  }, [isOpen, productId])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchHistory(),
        fetchAuditLogs(),
        fetchAnalytics()
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    const response = await fetch(`/api/classification/history/${productId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch classification history')
    }
    const data = await response.json()
    setHistory(data.history || [])
  }

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('job_logs')
      .select('*')
      .eq('classification_data->>product_id', productId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return
    }

    setAuditLogs(data || [])
  }

  const fetchAnalytics = async () => {
    const response = await fetch(`/api/classification/analytics/${productId}`)
    if (!response.ok) {
      console.error('Failed to fetch analytics')
      return
    }
    const data = await response.json()
    setAnalytics(data.analytics)
  }

  const exportData = async (format: 'csv' | 'json') => {
    setExporting(true)
    try {
      const response = await fetch(`/api/classification/export/${productId}?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeHistory: true,
          includeAuditLogs: true,
          includeAnalytics: true,
          filters: {
            source: sourceFilter,
            confidence: confidenceFilter,
            date: dateFilter,
            search: searchQuery
          }
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `classification-audit-${productId}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Classification audit exported as ${format.toUpperCase()}`)
    } catch (err) {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const filteredHistory = history.filter(item => {
    if (sourceFilter !== 'all' && item.source !== sourceFilter) {return false}
    if (confidenceFilter !== 'all') {
      const confidence = item.confidence_score || 0
      if (confidenceFilter === 'high' && confidence < 0.8) {return false}
      if (confidenceFilter === 'medium' && (confidence < 0.6 || confidence >= 0.8)) {return false}
      if (confidenceFilter === 'low' && confidence >= 0.6) {return false}
    }
    if (dateFilter !== 'all') {
      const itemDate = new Date(item.created_at)
      const now = new Date()
      const daysAgo = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      if (itemDate < cutoff) {return false}
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.hs6?.toLowerCase().includes(query) ||
        item.hs8?.toLowerCase().includes(query) ||
        item.source?.toLowerCase().includes(query) ||
        item.ruling_reference?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getConfidenceColor = (score?: number) => {
    if (!score) {return 'bg-gray-100 text-gray-800'}
    if (score >= 0.8) {return 'bg-green-100 text-green-800'}
    if (score >= 0.6) {return 'bg-yellow-100 text-yellow-800'}
    return 'bg-red-100 text-red-800'
  }

  const getConfidenceLabel = (score?: number) => {
    if (!score) {return 'Unknown'}
    if (score >= 0.8) {return 'High'}
    if (score >= 0.6) {return 'Medium'}
    return 'Low'
  }

  const getSourceIcon = (source?: string) => {
    switch (source?.toLowerCase()) {
      case 'zonos':
        return '🌐'
      case 'openai':
        return '🤖'
      case 'anthropic':
        return '🧠'
      case 'manual':
        return '👤'
      default:
        return '❓'
    }
  }

  const renderHistoryTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search HS codes, sources, references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="zonos">Zonos</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="high">High (≥80%)</SelectItem>
            <SelectItem value="medium">Medium (60-79%)</SelectItem>
            <SelectItem value="low">Low (&lt;60%)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-8">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No classifications found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {history.length === 0 
              ? "This product hasn't been classified yet."
              : "No classifications match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Classification Timeline
            </h3>
            <Badge variant="outline">
              {filteredHistory.length} of {history.length} classification{history.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-4">
            {filteredHistory.map((item, index) => (
              <div
                key={item.id}
                className={`relative p-4 rounded-lg border ${
                  item.is_active
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Active indicator */}
                {item.is_active && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSourceIcon(item.source)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Classification #{filteredHistory.length - index}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(item.created_at)}
                        </p>
                        {item.updated_at && item.updated_at !== item.created_at && (
                          <p className="text-xs text-amber-600">
                            Updated: {formatDate(item.updated_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Change tracking */}
                  {item.previous_hs_code && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Classification Changed</span>
                      </div>
                      <div className="text-sm text-amber-700">
                        <p>Previous: <span className="font-mono">{item.previous_hs_code}</span></p>
                        <p>Current: <span className="font-mono">{item.hs8 || item.hs6}</span></p>
                        {item.change_reason && (
                          <p className="mt-1">Reason: {item.change_reason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* HS Code Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        HS Code
                      </label>
                      <p className="mt-1 text-sm font-mono font-medium text-gray-900">
                        {item.hs8 || item.hs6 || 'N/A'}
                      </p>
                    </div>

                    {item.confidence_score && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Confidence
                        </label>
                        <div className="mt-1">
                          <Badge className={getConfidenceColor(item.confidence_score)}>
                            {getConfidenceLabel(item.confidence_score)} (
                            {Math.round(item.confidence_score * 100)}%)
                          </Badge>
                        </div>
                      </div>
                    )}

                    {item.source && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Source
                        </label>
                        <div className="mt-1">
                          <Badge variant="outline">
                            {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Information */}
                  {item.ruling_reference && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Ruling Reference
                      </label>
                      <p className="mt-1 text-sm text-gray-700">
                        {item.ruling_reference}
                      </p>
                    </div>
                  )}

                  {/* HS Code Breakdown */}
                  {(item.hs6 || item.hs8) && (
                    <div className="bg-white rounded-md p-3 border">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        HS Code Breakdown
                      </label>
                      <div className="mt-2 space-y-1">
                        {item.hs6 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">HS6:</span>
                            <span className="font-mono font-medium">{item.hs6}</span>
                          </div>
                        )}
                        {item.hs8 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">HS8:</span>
                            <span className="font-mono font-medium">{item.hs8}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderAuditTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Audit Trail
        </h3>
        <Badge variant="outline">
          {auditLogs.length} log{auditLogs.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {auditLogs.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No audit logs
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            No detailed audit logs available for this product.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    Job: {log.job_id}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(log.created_at)}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {!analytics ? (
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Analytics not available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Analytics data could not be loaded.
          </p>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classifications</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalClassifications}</p>
                </div>
                <CpuChipIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.accuracyRate.toFixed(1)}%</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.averageConfidence.toFixed(1)}%</p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics.userActivity.length}</p>
                </div>
                <UserIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Source Breakdown */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Source Breakdown</h4>
            <div className="space-y-3">
              {Object.entries(analytics.sourceBreakdown).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSourceIcon(source)}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(count / analytics.totalClassifications) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Activity */}
          {analytics.userActivity.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">User Activity</h4>
              <div className="space-y-3">
                {analytics.userActivity.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{user.userName || user.userId}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{user.count} classifications</p>
                      <p className="text-xs text-gray-500">Last: {formatDate(user.lastActivity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Enhanced Classification History & Audit Trail
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {productName}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" text="Loading classification data..." />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">⚠️</div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportData('csv')}
                    disabled={exporting}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    {exporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportData('json')}
                    disabled={exporting}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    Export JSON
                  </Button>
                </div>
              </div>

              <TabsContent value="history" className="mt-0">
                {renderHistoryTab()}
              </TabsContent>

              <TabsContent value="audit" className="mt-0">
                {renderAuditTab()}
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                {renderAnalyticsTab()}
              </TabsContent>
            </Tabs>
          </>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}