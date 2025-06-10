'use client'

import React, { useState, useEffect, useCallback } from 'react' // Added useCallback
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Users,
  Package,
  Zap,
  BarChart // For router navigation, if needed, or use Link
} from 'lucide-react'
import { useRouter } from 'next/navigation' // Added for navigation
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ComprehensiveDashboardProps {
  className?: string
}

interface DashboardData {
  summary: {
    totalValue: number
    keyInsights: string[]
    recommendations: string[]
  }
  savings: {
    totalSavings: number
    savingsPercentage: number
    optimizedProducts: number
    totalProducts: number
    monthlyTrend: Array<{ month: string; savings: number; percentage: number }>
    topSavingsOpportunities: Array<{ productId: string; productName: string; currentDuty: number; optimizedDuty: number; potentialSaving: number; savingPercentage: number }>
  }
  profitability: {
    totalRevenue: number
    grossProfit: number
    profitMargin: number
    roi: number
    costBreakdown: Array<{ category: string; amount: number; percentage: number }>
    trends: Array<{ period: string; revenue: number; profit: number }>
  }
  performance: {
    classificationAccuracy: number
    averageProcessingTime: number
    throughput: number
    errorRate: number
    systemUptime: number
    apiResponseTime: number
    userSatisfactionScore: number
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'percentage' | 'number' | 'time'
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  trend = 'neutral',
  format = 'number'
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') {return val}
    
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString()}`
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'time':
        return `${val.toFixed(1)}s`
      default:
        return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    if (trend === 'up') {return <TrendingUp className="h-4 w-4 text-green-500" />}
    if (trend === 'down') {return <TrendingDown className="h-4 w-4 text-red-500" />}
    return null
  }

  const getTrendColor = () => {
    if (trend === 'up') {return 'text-green-600'}
    if (trend === 'down') {return 'text-red-600'}
    return 'text-gray-600'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{formatValue(value)}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const ComprehensiveDashboard: React.FC<ComprehensiveDashboardProps> = ({ className }) => {
  const router = useRouter() // Initialize router
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const [exporting, setExporting] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/analytics/comprehensive?period=${period}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [period, setLoading, setError, setData]); // Added dependencies for useCallback

  // useEffect for initial fetch and polling
  useEffect(() => {
    const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    fetchDashboardData(); // Initial fetch when component mounts or fetchDashboardData changes

    const intervalId = setInterval(() => {
      console.log('Polling for comprehensive dashboard data...');
      fetchDashboardData();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchDashboardData]); // Dependency is the memoized fetchDashboardData

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      setExporting(true)
      
      const response = await fetch(
        `/api/analytics/export?type=comprehensive&period=${period}&format=${format}`
      )
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      if (format === 'json') {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics_${period}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else if (format === 'csv') {
        const csvData = await response.text()
        const blob = new Blob([csvData], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics_${period}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // PDF - would open in new tab or trigger download
        const result = await response.json()
        if (result.downloadUrl) {
          window.open(result.downloadUrl, '_blank')
        }
      }
    } catch (err) {
      setError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const getSavingsTrendData = () => {
    if (!data?.savings.monthlyTrend) {return null}
    
    return {
      labels: data.savings.monthlyTrend.map(item => item.month),
      datasets: [
        {
          label: 'Monthly Savings',
          data: data.savings.monthlyTrend.map(item => item.savings),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Savings Percentage',
          data: data.savings.monthlyTrend.map(item => item.percentage),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          yAxisID: 'y1'
        }
      ]
    }
  }

  const getProfitabilityData = () => {
    if (!data?.profitability.trends) {return null}
    
    return {
      labels: data.profitability.trends.map(item => item.period),
      datasets: [
        {
          label: 'Revenue',
          data: data.profitability.trends.map(item => item.revenue),
          backgroundColor: 'rgba(34, 197, 94, 0.8)'
        },
        {
          label: 'Profit',
          data: data.profitability.trends.map(item => item.profit),
          backgroundColor: 'rgba(59, 130, 246, 0.8)'
        }
      ]
    }
  }

  const getCostBreakdownData = () => {
    if (!data?.profitability.costBreakdown) {return null}
    
    return {
      labels: data.profitability.costBreakdown.map(item => item.category),
      datasets: [
        {
          data: data.profitability.costBreakdown.map(item => item.percentage),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(147, 51, 234, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No analytics data available</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive business intelligence and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Select onValueChange={(format) => handleExport(format as 'json' | 'csv' | 'pdf')}>
            <SelectTrigger className="w-32">
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

      {/* Key Insights */}
      {data.summary.keyInsights.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Key Insights:</strong> {data.summary.keyInsights.join(' • ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Value"
          value={data.summary.totalValue}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          format="currency"
          trend="up"
          change={12.5}
        />
        <MetricCard
          title="Total Savings"
          value={data.savings.totalSavings}
          icon={<Target className="h-5 w-5 text-blue-600" />}
          format="currency"
          trend="up"
          change={8.3}
        />
        <MetricCard
          title="Profit Margin"
          value={data.profitability.profitMargin}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          format="percentage"
          trend="up"
          change={2.1}
        />
        <MetricCard
          title="Classification Accuracy"
          value={data.performance.classificationAccuracy * 100}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          format="percentage"
          trend="up"
          change={1.2}
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Optimization Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Optimization Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Products Optimized</span>
                    <span>{data.savings.optimizedProducts} / {data.savings.totalProducts}</span>
                  </div>
                  <Progress 
                    value={(data.savings.optimizedProducts / data.savings.totalProducts) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600">
                    {((data.savings.optimizedProducts / data.savings.totalProducts) * 100).toFixed(1)}% 
                    of products have been optimized
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* "View Detailed Reports" button removed as it's redundant on the /analytics page itself */}
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      toast.info('Navigating to products page...')
                      router.push('/products')
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Optimize Products
                  </Button>
                  {/* Removed redundant Export Data button from Quick Actions */}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {data.summary.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.summary.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge variant="outline" className="mt-1">{index + 1}</Badge>
                      <p className="text-sm text-gray-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="savings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Savings Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Savings Trend</CardTitle>
                <CardDescription>Monthly savings performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {getSavingsTrendData() && (
                  <Line 
                    data={getSavingsTrendData()!} 
                    options={{
                      responsive: true,
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left'
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          grid: {
                            drawOnChartArea: false
                          }
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Top Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Top Savings Opportunities</CardTitle>
                <CardDescription>Products with highest savings potential</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.savings.topSavingsOpportunities && data.savings.topSavingsOpportunities.length > 0 ? (
                    data.savings.topSavingsOpportunities.slice(0, 5).map((opportunity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{opportunity.productName}</p>
                          <p className="text-xs text-gray-600">Current: ${opportunity.currentDuty.toFixed(2)} → Optimized: ${opportunity.optimizedDuty.toFixed(2)}</p>
                        </div>
                        <Badge variant="secondary">
                          ${opportunity.potentialSaving.toLocaleString()}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No savings opportunities available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit</CardTitle>
                <CardDescription>Financial performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {getProfitabilityData() && (
                  <Bar data={getProfitabilityData()!} options={{ responsive: true }} />
                )}
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Distribution of costs by category</CardDescription>
              </CardHeader>
              <CardContent>
                {getCostBreakdownData() && (
                  <Doughnut 
                    data={getCostBreakdownData()!} 
                    options={{ 
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }} 
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profitability Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Revenue"
              value={data.profitability.totalRevenue}
              icon={<DollarSign className="h-5 w-5 text-green-600" />}
              format="currency"
            />
            <MetricCard
              title="Gross Profit"
              value={data.profitability.grossProfit}
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              format="currency"
            />
            <MetricCard
              title="ROI"
              value={data.profitability.roi}
              icon={<Target className="h-5 w-5 text-purple-600" />}
              format="percentage"
            />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Processing Time"
              value={data.performance.averageProcessingTime}
              icon={<Clock className="h-5 w-5 text-blue-600" />}
              format="time"
            />
            <MetricCard
              title="Throughput"
              value={data.performance.throughput}
              icon={<Activity className="h-5 w-5 text-green-600" />}
              format="number"
            />
            <MetricCard
              title="Error Rate"
              value={data.performance.errorRate * 100}
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
              format="percentage"
            />
            <MetricCard
              title="System Uptime"
              value={data.performance.systemUptime * 100}
              icon={<CheckCircle className="h-5 w-5 text-green-600" />}
              format="percentage"
            />
          </div>

          {/* Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>System Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">API Response Time</span>
                    <span className="text-sm">{data.performance.apiResponseTime.toFixed(0)}ms</span>
                  </div>
                  <Progress value={Math.min((data.performance.apiResponseTime / 1000) * 100, 100)} />
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">User Satisfaction</span>
                    <span className="text-sm">{(data.performance.userSatisfactionScore * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.performance.userSatisfactionScore * 100} />
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">System Health</h4>
                    <p className="text-sm text-green-600 mt-1">
                      All systems operational with {(data.performance.systemUptime * 100).toFixed(1)}% uptime
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Performance Score</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      Excellent performance with {(data.performance.classificationAccuracy * 100).toFixed(1)}% accuracy
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ComprehensiveDashboard
