'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Download,
  Filter,
  Clock,
  Component,
  Bug,
  AlertCircle
} from 'lucide-react'
import { useErrorHandler } from '@/hooks/use-error-handler'
import { AppError } from '@/lib/error/app-error'

interface ErrorStats {
  total: number
  bySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
  byComponent: Record<string, number>
  byErrorCode: Record<string, number>
  recentErrors: AppError[]
  errorRate: number
}

interface ErrorPattern {
  pattern: string
  count: number
  lastSeen: string
  severity: AppError['severity']
}

interface ErrorReport {
  summary: {
    totalErrors: number
    errorRate: number
    criticalCount: number
    isHighErrorRate: boolean
  }
  breakdown: {
    bySeverity: ErrorStats['bySeverity']
    byComponent: Record<string, number>
    topPatterns: ErrorPattern[]
  }
  alerts: {
    criticalErrors: AppError[]
    highErrorRate: boolean
    newErrorPatterns: ErrorPattern[]
  }
}

interface ErrorMonitoringDashboardProps {
  /**
   * Refresh interval in milliseconds
   */
  refreshInterval?: number
  
  /**
   * Whether to auto-refresh
   */
  autoRefresh?: boolean
  
  /**
   * Time range for error analysis
   */
  timeRange?: '1h' | '24h' | '7d' | '30d'
}

export function ErrorMonitoringDashboard({
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true,
  timeRange = '24h'
}: ErrorMonitoringDashboardProps) {
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  
  const { handleError, handleApiResponse } = useErrorHandler({
    component: 'ErrorMonitoringDashboard',
    showToast: true
  })

  /**
   * Fetch error report from API
   */
  const fetchErrorReport = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/errors/report?timeRange=${selectedTimeRange}`)
      const data = await handleApiResponse<ErrorReport>(response)
      setErrorReport(data)
      setLastUpdated(new Date())
    } catch (error) {
      handleError(error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Export error report
   */
  const exportReport = async () => {
    try {
      const response = await fetch(`/api/admin/errors/export?timeRange=${selectedTimeRange}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `error-report-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      handleError(error)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    fetchErrorReport()
    
    if (autoRefresh) {
      const interval = setInterval(fetchErrorReport, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [selectedTimeRange, autoRefresh, refreshInterval])

  /**
   * Calculate severity color
   */
  const getSeverityColor = (severity: AppError['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  /**
   * Calculate trend indicator
   */
  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) {
      return { icon: TrendingUp, color: 'text-red-500', direction: 'up' }
    } else if (current < previous) {
      return { icon: TrendingDown, color: 'text-green-500', direction: 'down' }
    }
    return { icon: TrendingUp, color: 'text-gray-500', direction: 'stable' }
  }

  /**
   * Format time ago
   */
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (isLoading && !errorReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading error report...</span>
      </div>
    )
  }

  if (!errorReport) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Report</AlertTitle>
        <AlertDescription>
          Failed to load error monitoring data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Error Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and analyze application errors across all components
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={fetchErrorReport} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {errorReport.alerts.highErrorRate && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>High Error Rate Detected</AlertTitle>
          <AlertDescription>
            Error rate is above normal thresholds ({errorReport.summary.errorRate.toFixed(2)} errors/hour).
            Immediate attention may be required.
          </AlertDescription>
        </Alert>
      )}

      {errorReport.alerts.criticalErrors.length > 0 && (
        <Alert variant="destructive">
          <Bug className="h-4 w-4" />
          <AlertTitle>Critical Errors Detected</AlertTitle>
          <AlertDescription>
            {errorReport.alerts.criticalErrors.length} critical error(s) in the selected time range.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorReport.summary.totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              {errorReport.summary.errorRate.toFixed(2)} errors/hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {errorReport.summary.criticalCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {((errorReport.summary.criticalCount / errorReport.summary.totalErrors) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorReport.summary.errorRate.toFixed(1)}/hr
            </div>
            <Progress 
              value={Math.min((errorReport.summary.errorRate / 50) * 100, 100)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastUpdated ? formatTimeAgo(lastUpdated.toISOString()) : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-refresh: {autoRefresh ? 'On' : 'Off'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="components">By Component</TabsTrigger>
          <TabsTrigger value="recent">Recent Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Severity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Errors by Severity</CardTitle>
                <CardDescription>
                  Distribution of errors across severity levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(errorReport.breakdown.bySeverity).map(([severity, count]) => {
                  const percentage = errorReport.summary.totalErrors > 0 
                    ? (count / errorReport.summary.totalErrors) * 100 
                    : 0
                  
                  return (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(severity as AppError['severity'])}>
                          {severity}
                        </Badge>
                        <span className="text-sm">{count} errors</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={percentage} className="w-20" />
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Top Components */}
            <Card>
              <CardHeader>
                <CardTitle>Top Error Sources</CardTitle>
                <CardDescription>
                  Components with the most errors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(errorReport.breakdown.byComponent)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([component, count]) => {
                      const percentage = (count / errorReport.summary.totalErrors) * 100
                      return (
                        <div key={component} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Component className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{component}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{count}</span>
                            <span className="text-xs text-muted-foreground">
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Error Patterns</CardTitle>
              <CardDescription>
                Most frequently occurring error patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorReport.breakdown.topPatterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={getSeverityColor(pattern.severity)}>
                            {pattern.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {pattern.count} occurrences
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Last seen: {formatTimeAgo(pattern.lastSeen)}
                          </span>
                        </div>
                        <p className="text-sm font-mono bg-muted p-2 rounded">
                          {pattern.pattern}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Errors by Component</CardTitle>
              <CardDescription>
                Detailed breakdown of errors across all components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(errorReport.breakdown.byComponent)
                  .sort(([, a], [, b]) => b - a)
                  .map(([component, count]) => {
                    const percentage = (count / errorReport.summary.totalErrors) * 100
                    return (
                      <div key={component} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <Component className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{component}</p>
                            <p className="text-sm text-muted-foreground">
                              {count} errors ({percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                        <Progress value={percentage} className="w-24" />
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Critical Errors</CardTitle>
              <CardDescription>
                Latest critical errors requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorReport.alerts.criticalErrors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No critical errors in the selected time range
                  </p>
                ) : (
                  errorReport.alerts.criticalErrors.map((error, index) => (
                    <div key={index} className="border rounded-lg p-4 border-red-200 bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">Critical</Badge>
                          <span className="text-sm font-medium">{error.code}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(error.timestamp.toISOString())}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{error.message}</p>
                      {error.context?.component && (
                        <p className="text-xs text-muted-foreground">
                          Component: {error.context.component}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}