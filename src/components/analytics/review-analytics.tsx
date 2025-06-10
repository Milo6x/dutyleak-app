'use client'

import React, { useState, useEffect, useCallback } from 'react' // Added useCallback
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  Download,
  Calendar,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
)

interface ReviewAnalyticsData {
  overview: {
    totalReviews: number
    pendingReviews: number
    completedReviews: number
    averageReviewTime: number
    accuracyRate: number
    flaggedItems: number
    escalatedItems: number
    autoApprovedItems: number
  }
  performance: {
    reviewerId: string
    reviewerName: string
    reviewsCompleted: number
    averageTime: number
    accuracyRate: number
    flaggedRate: number
    escalationRate: number
    lastActive: string
  }[]
  trends: {
    date: string
    pending: number
    completed: number
    flagged: number
    accuracy: number
  }[]
  categories: {
    category: string
    count: number
    averageTime: number
    accuracyRate: number
    flaggedRate: number
  }[]
  timeDistribution: {
    timeRange: string
    count: number
    percentage: number
  }[]
  actionBreakdown: {
    action: string
    count: number
    percentage: number
    color: string
  }[]
}

interface ReviewAnalyticsProps {
  className?: string
}

export function ReviewAnalytics({ className }: ReviewAnalyticsProps) {
  const [data, setData] = useState<ReviewAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('overview')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)


  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics/review?timeRange=${timeRange}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        // Fallback to mock data for development
        setData(generateMockData())
      }
    } catch (error) {
      console.error('Failed to fetch review analytics:', error)
      setData(generateMockData())
    } finally {
      setIsLoading(false)
      setLastUpdated(new Date())
    }
  }, [timeRange, setIsLoading, setData, setLastUpdated]); // Added dependencies

  // useEffect for initial fetch and polling
  useEffect(() => {
    const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    fetchAnalyticsData(); // Initial fetch

    const intervalId = setInterval(() => {
      console.log('Polling for review analytics data...');
      fetchAnalyticsData();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchAnalyticsData]); // Dependency is the memoized fetchAnalyticsData

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!data) {
      toast.error('No data available to export.')
      return
    }
    setExporting(true)
    setExportError(null)

    try {
      const params = new URLSearchParams({
        type: 'review',
        period: timeRange, // Using timeRange as the period for this component
        format,
      })

      const response = await fetch(`/api/analytics/export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Export failed with status ${response.status}`)
      }

      if (format === 'json') {
        const jsonData = await response.json()
        const blob = new Blob([JSON.stringify(jsonData.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `review_analytics_${timeRange}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('JSON export successful!')
      } else if (format === 'csv') {
        const csvData = await response.text()
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `review_analytics_${timeRange}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('CSV export successful!')
      } else if (format === 'pdf') {
        const pdfResult = await response.json()
        if (pdfResult.success && pdfResult.downloadUrl) {
          window.open(pdfResult.downloadUrl, '_blank')
          toast.success('PDF generation started!')
        } else {
          throw new Error(pdfResult.error || 'PDF generation failed to start.')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during export.'
      setExportError(errorMessage)
      toast.error(`Export failed: ${errorMessage}`)
    } finally {
      setExporting(false)
    }
  }

  const generateMockData = (): ReviewAnalyticsData => {
    const now = new Date()
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    
    return {
      overview: {
        totalReviews: 1247,
        pendingReviews: 89,
        completedReviews: 1158,
        averageReviewTime: 4.2,
        accuracyRate: 94.8,
        flaggedItems: 156,
        escalatedItems: 23,
        autoApprovedItems: 892
      },
      performance: [
        {
          reviewerId: 'rev_001',
          reviewerName: 'Sarah Chen',
          reviewsCompleted: 234,
          averageTime: 3.8,
          accuracyRate: 96.2,
          flaggedRate: 12.5,
          escalationRate: 2.1,
          lastActive: '2024-01-15T10:30:00Z'
        },
        {
          reviewerId: 'rev_002',
          reviewerName: 'Mike Johnson',
          reviewsCompleted: 198,
          averageTime: 4.5,
          accuracyRate: 93.7,
          flaggedRate: 15.2,
          escalationRate: 3.4,
          lastActive: '2024-01-15T09:45:00Z'
        },
        {
          reviewerId: 'rev_003',
          reviewerName: 'Emily Rodriguez',
          reviewsCompleted: 267,
          averageTime: 3.2,
          accuracyRate: 97.1,
          flaggedRate: 8.9,
          escalationRate: 1.5,
          lastActive: '2024-01-15T11:15:00Z'
        }
      ],
      trends: Array.from({ length: days }, (_, i) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (days - 1 - i))
        return {
          date: date.toISOString().split('T')[0],
          pending: Math.floor(Math.random() * 50) + 20,
          completed: Math.floor(Math.random() * 80) + 40,
          flagged: Math.floor(Math.random() * 20) + 5,
          accuracy: Math.random() * 10 + 90
        }
      }),
      categories: [
        {
          category: 'Classification',
          count: 456,
          averageTime: 3.8,
          accuracyRate: 95.2,
          flaggedRate: 11.3
        },
        {
          category: 'Fee Calculation',
          count: 298,
          averageTime: 5.1,
          accuracyRate: 92.8,
          flaggedRate: 16.7
        },
        {
          category: 'Data Quality',
          count: 234,
          averageTime: 2.9,
          accuracyRate: 97.1,
          flaggedRate: 8.5
        },
        {
          category: 'Optimization',
          count: 170,
          averageTime: 6.2,
          accuracyRate: 89.4,
          flaggedRate: 22.1
        }
      ],
      timeDistribution: [
        { timeRange: '< 2 min', count: 342, percentage: 27.4 },
        { timeRange: '2-5 min', count: 456, percentage: 36.6 },
        { timeRange: '5-10 min', count: 298, percentage: 23.9 },
        { timeRange: '10-30 min', count: 123, percentage: 9.9 },
        { timeRange: '> 30 min', count: 28, percentage: 2.2 }
      ],
      actionBreakdown: [
        { action: 'Approved', count: 892, percentage: 71.5, color: '#10b981' },
        { action: 'Modified', count: 234, percentage: 18.8, color: '#f59e0b' },
        { action: 'Rejected', count: 89, percentage: 7.1, color: '#ef4444' },
        { action: 'Escalated', count: 23, percentage: 1.8, color: '#8b5cf6' },
        { action: 'Info Requested', count: 9, percentage: 0.7, color: '#06b6d4' }
      ]
    }
  }

  const getMetricIcon = (metric: string, trend?: number) => {
    const iconProps = { className: 'h-4 w-4' }
    
    if (trend !== undefined) {
      if (trend > 0) {return <ArrowUpRight {...iconProps} className="h-4 w-4 text-green-500" />}
      if (trend < 0) {return <ArrowDownRight {...iconProps} className="h-4 w-4 text-red-500" />}
      return <Minus {...iconProps} className="h-4 w-4 text-gray-500" />
    }
    
    switch (metric) {
      case 'reviews': return <Eye {...iconProps} />
      case 'time': return <Clock {...iconProps} />
      case 'accuracy': return <Target {...iconProps} />
      case 'flagged': return <AlertTriangle {...iconProps} />
      default: return <BarChart3 {...iconProps} />
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {return `${minutes.toFixed(1)}m`}
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins.toFixed(0)}m`
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Review Analytics</h2>
            <p className="text-muted-foreground">Performance metrics and insights for the review queue</p>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load review analytics data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  const overviewMetrics = [
    {
      title: 'Total Reviews',
      value: data.overview.totalReviews.toLocaleString(),
      change: '+12.5%',
      trend: 1,
      icon: 'reviews',
      description: 'Reviews processed in selected period'
    },
    {
      title: 'Pending Reviews',
      value: data.overview.pendingReviews.toLocaleString(),
      change: '-8.2%',
      trend: -1,
      icon: 'time',
      description: 'Items awaiting review'
    },
    {
      title: 'Average Review Time',
      value: formatTime(data.overview.averageReviewTime),
      change: '-15.3%',
      trend: -1,
      icon: 'time',
      description: 'Time per review completion'
    },
    {
      title: 'Accuracy Rate',
      value: formatPercentage(data.overview.accuracyRate),
      change: '+2.1%',
      trend: 1,
      icon: 'accuracy',
      description: 'Review decision accuracy'
    },
    {
      title: 'Flagged Items',
      value: data.overview.flaggedItems.toLocaleString(),
      change: '+5.7%',
      trend: 1,
      icon: 'flagged',
      description: 'Items requiring attention'
    },
    {
      title: 'Auto-Approved',
      value: data.overview.autoApprovedItems.toLocaleString(),
      change: '+18.9%',
      trend: 1,
      icon: 'reviews',
      description: 'Automatically processed items'
    },
    {
      title: 'Escalated Items',
      value: data.overview.escalatedItems.toLocaleString(),
      change: '-12.4%',
      trend: -1,
      icon: 'flagged',
      description: 'Items escalated to senior review'
    },
    {
      title: 'Completion Rate',
      value: formatPercentage((data.overview.completedReviews / data.overview.totalReviews) * 100),
      change: '+3.2%',
      trend: 1,
      icon: 'accuracy',
      description: 'Reviews completed vs. initiated'
    }
  ]

  const trendsChartData = {
    labels: data.trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Completed Reviews',
        data: data.trends.map(t => t.completed),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Pending Reviews',
        data: data.trends.map(t => t.pending),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Flagged Items',
        data: data.trends.map(t => t.flagged),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const accuracyChartData = {
    labels: data.trends.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Accuracy Rate (%)',
        data: data.trends.map(t => t.accuracy),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const categoryChartData = {
    labels: data.categories.map(c => c.category),
    datasets: [
      {
        label: 'Review Count',
        data: data.categories.map(c => c.count),
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0
      }
    ]
  }

  const actionBreakdownData = {
    labels: data.actionBreakdown.map(a => a.action),
    datasets: [
      {
        data: data.actionBreakdown.map(a => a.count),
        backgroundColor: data.actionBreakdown.map(a => a.color),
        borderWidth: 0
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Review Analytics</h2>
          <p className="text-muted-foreground">
            Performance metrics and insights for the review queue
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => handleExport(value as 'json' | 'csv' | 'pdf')}
            disabled={exporting || isLoading}
          >
            <SelectTrigger className="w-[110px]" disabled={exporting || isLoading}>
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {exportError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {getMetricIcon(metric.icon)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getMetricIcon('trend', metric.trend)}
                <span className={`ml-1 ${
                  metric.trend > 0 ? 'text-green-600' : 
                  metric.trend < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metric.change}
                </span>
                <span className="ml-2">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Reviewer Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Review Actions Breakdown</CardTitle>
                <CardDescription>Distribution of review decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Doughnut data={actionBreakdownData} options={doughnutOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Time Distribution</CardTitle>
                <CardDescription>Time taken to complete reviews</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.timeDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.timeRange}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={item.percentage} className="w-20" />
                      <span className="text-sm text-muted-foreground w-12">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reviewer Performance</CardTitle>
              <CardDescription>Individual reviewer metrics and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.performance.map((reviewer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{reviewer.reviewerName}</div>
                        <div className="text-sm text-muted-foreground">
                          Last active: {new Date(reviewer.lastActive).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium">{reviewer.reviewsCompleted}</div>
                        <div className="text-xs text-muted-foreground">Reviews</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{formatTime(reviewer.averageTime)}</div>
                        <div className="text-xs text-muted-foreground">Avg Time</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{formatPercentage(reviewer.accuracyRate)}</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{formatPercentage(reviewer.flaggedRate)}</div>
                        <div className="text-xs text-muted-foreground">Flagged</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{formatPercentage(reviewer.escalationRate)}</div>
                        <div className="text-xs text-muted-foreground">Escalated</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Review Volume Trends</CardTitle>
                <CardDescription>Daily review activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={trendsChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy Trends</CardTitle>
                <CardDescription>Review accuracy rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={accuracyChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reviews by Category</CardTitle>
                <CardDescription>Distribution of review types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={categoryChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Metrics by review category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.categories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{category.category}</div>
                        <div className="text-sm text-muted-foreground">
                          {category.count} reviews
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-sm font-medium">{formatTime(category.averageTime)}</div>
                          <div className="text-xs text-muted-foreground">Avg Time</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{formatPercentage(category.accuracyRate)}</div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{formatPercentage(category.flaggedRate)}</div>
                          <div className="text-xs text-muted-foreground">Flagged</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            Real-time data
          </Badge>
          <Badge variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}
          </Badge>
        </div>
      </div>
    </div>
  )
}
