"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChartIcon,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Package,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'

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



interface ProfitabilityData {
  overview: {
    totalRevenue: number
    totalCosts: number
    grossProfit: number
    netProfit: number
    profitMargin: number
    roi: number
    averageOrderValue: number
    totalOrders: number
  }
  trends: {
    period: string
    revenue: number
    costs: number
    profit: number
    margin: number
    orders: number
  }[]
  productAnalysis: {
    productId: string
    productName: string
    revenue: number
    costs: number
    profit: number
    margin: number
    units: number
    avgPrice: number
    fbaFees: number
    landedCost: number
    category: string
  }[]
  costBreakdown: {
    category: string
    amount: number
    percentage: number
    color: string
  }[]
  benchmarks: {
    metric: string
    current: number
    target: number
    industry: number
    status: 'above' | 'below' | 'on-target'
  }[]
  insights: {
    id: string
    type: 'opportunity' | 'warning' | 'achievement'
    title: string
    description: string
    impact: number
    actionable: boolean
  }[]
}

interface ProfitabilityAnalyticsProps {
  className?: string
  dateRange?: { start: string; end: string }
  productFilter?: string[]
  onDataExport?: (data: any) => void
}

const TIME_PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'custom', label: 'Custom range' }
]

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280'
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

export function ProfitabilityAnalytics({ 
  className, 
  dateRange, 
  productFilter, 
  onDataExport 
}: ProfitabilityAnalyticsProps) {
  const [data, setData] = useState<ProfitabilityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('profit')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalyticsData()
  }, [timePeriod, dateRange, productFilter])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        period: timePeriod,
        ...(dateRange && { startDate: dateRange.start, endDate: dateRange.end }),
        ...(productFilter && { products: productFilter.join(',') })
      })

      const response = await fetch(`/api/analytics/profitability?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      // Mock data for development
      setData(generateMockData())
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockData = (): ProfitabilityData => {
    // Generate trend data
    const trends = []
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
      trends.push({
        period: date.toISOString().split('T')[0],
        revenue: 1200 + Math.random() * 800,
        costs: 800 + Math.random() * 400,
        profit: 400 + Math.random() * 400,
        margin: 20 + Math.random() * 15,
        orders: 15 + Math.floor(Math.random() * 25)
      })
    }

    return {
      overview: {
        totalRevenue: 45680.50,
        totalCosts: 32450.75,
        grossProfit: 13229.75,
        netProfit: 11850.25,
        profitMargin: 25.9,
        roi: 36.5,
        averageOrderValue: 67.85,
        totalOrders: 673
      },
      trends,
      productAnalysis: [
        {
          productId: 'prod-1',
          productName: 'Wireless Headphones',
          revenue: 12450.00,
          costs: 8200.00,
          profit: 4250.00,
          margin: 34.1,
          units: 498,
          avgPrice: 25.00,
          fbaFees: 1650.00,
          landedCost: 6550.00,
          category: 'Electronics'
        },
        {
          productId: 'prod-2',
          productName: 'Phone Charger',
          revenue: 8920.00,
          costs: 6780.00,
          profit: 2140.00,
          margin: 24.0,
          units: 356,
          avgPrice: 25.06,
          fbaFees: 1120.00,
          landedCost: 5660.00,
          category: 'Electronics'
        },
        {
          productId: 'prod-3',
          productName: 'Kitchen Scale',
          revenue: 6750.00,
          costs: 4890.00,
          profit: 1860.00,
          margin: 27.6,
          units: 270,
          avgPrice: 25.00,
          fbaFees: 890.00,
          landedCost: 4000.00,
          category: 'Home & Garden'
        }
      ],
      costBreakdown: [
        { category: 'Product Cost', amount: 18500.00, percentage: 57.0, color: PIE_COLORS[0] },
        { category: 'FBA Fees', amount: 6200.00, percentage: 19.1, color: PIE_COLORS[1] },
        { category: 'Shipping', amount: 4100.00, percentage: 12.6, color: PIE_COLORS[2] },
        { category: 'Customs & Duties', amount: 2350.00, percentage: 7.2, color: PIE_COLORS[3] },
        { category: 'Other Fees', amount: 1300.75, percentage: 4.0, color: PIE_COLORS[4] }
      ],
      benchmarks: [
        { metric: 'Profit Margin', current: 25.9, target: 30.0, industry: 22.5, status: 'below' },
        { metric: 'ROI', current: 36.5, target: 35.0, industry: 28.0, status: 'above' },
        { metric: 'Average Order Value', current: 67.85, target: 70.0, industry: 65.0, status: 'below' },
        { metric: 'Cost Efficiency', current: 71.0, target: 75.0, industry: 68.0, status: 'below' }
      ],
      insights: [
        {
          id: 'insight-1',
          type: 'opportunity',
          title: 'Optimize FBA Fees',
          description: 'Reducing package dimensions could save $1,200/month in fulfillment fees',
          impact: 1200,
          actionable: true
        },
        {
          id: 'insight-2',
          type: 'warning',
          title: 'Declining Margins',
          description: 'Profit margins have decreased 3.2% over the last 30 days',
          impact: -850,
          actionable: true
        },
        {
          id: 'insight-3',
          type: 'achievement',
          title: 'ROI Target Exceeded',
          description: 'Current ROI of 36.5% exceeds target of 35%',
          impact: 450,
          actionable: false
        }
      ]
    }
  }

  const exportData = () => {
    if (!data) {return}

    const exportData = {
      overview: data.overview,
      trends: data.trends,
      productAnalysis: data.productAnalysis,
      generatedAt: new Date().toISOString(),
      period: timePeriod
    }

    onDataExport?.(exportData)

    // Also download as CSV
    const csvContent = [
      ['Metric', 'Value'].join(','),
      ['Total Revenue', data.overview.totalRevenue.toFixed(2)].join(','),
      ['Total Costs', data.overview.totalCosts.toFixed(2)].join(','),
      ['Gross Profit', data.overview.grossProfit.toFixed(2)].join(','),
      ['Net Profit', data.overview.netProfit.toFixed(2)].join(','),
      ['Profit Margin', `${data.overview.profitMargin.toFixed(1)}%`].join(','),
      ['ROI', `${data.overview.roi.toFixed(1)}%`].join(','),
      '',
      ['Product Analysis'].join(','),
      ['Product', 'Revenue', 'Costs', 'Profit', 'Margin %'].join(','),
      ...data.productAnalysis.map(p => [
        p.productName,
        p.revenue.toFixed(2),
        p.costs.toFixed(2),
        p.profit.toFixed(2),
        p.margin.toFixed(1)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profitability-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'above': return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case 'below': return <ArrowDownRight className="h-4 w-4 text-red-600" />
      case 'on-target': return <Minus className="h-4 w-4 text-blue-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'achievement': return <CheckCircle className="h-5 w-5 text-blue-600" />
      default: return <Target className="h-5 w-5 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading profitability analytics...
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Profitability Analytics
          </div>
          <div className="flex items-center gap-2">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map(period => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Comprehensive profit analysis and performance insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.overview.netProfit)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className="text-2xl font-bold">{formatPercentage(data.overview.profitMargin)}</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="text-2xl font-bold">{formatPercentage(data.overview.roi)}</p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-600" />
                </div>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(data.overview.totalCosts)}</div>
                <div className="text-sm text-muted-foreground">Total Costs</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(data.overview.averageOrderValue)}</div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-lg font-semibold">{data.overview.totalOrders.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-lg font-semibold">{formatCurrency(data.overview.grossProfit)}</div>
                <div className="text-sm text-muted-foreground">Gross Profit</div>
              </div>
            </div>

            {/* Benchmarks */}
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Performance Benchmarks</h4>
              <div className="space-y-4">
                {data.benchmarks.map((benchmark, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(benchmark.status)}
                      <span className="font-medium">{benchmark.metric}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="font-medium">
                          {benchmark.metric.includes('%') ? formatPercentage(benchmark.current) : benchmark.current.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground">Current</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-blue-600">
                          {benchmark.metric.includes('%') ? formatPercentage(benchmark.target) : benchmark.target.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground">Target</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-600">
                          {benchmark.metric.includes('%') ? formatPercentage(benchmark.industry) : benchmark.industry.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground">Industry</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Profitability Trends</h3>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit">Profit</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="costs">Costs</SelectItem>
                  <SelectItem value="margin">Margin %</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="p-4">
              <div style={{ height: '400px' }}>
                <Line
                  data={{
                    labels: data.trends.map(item => new Date(item.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                    datasets: [{
                      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
                      data: data.trends.map(item => item[selectedMetric as keyof typeof item]),
                      borderColor: CHART_COLORS.primary,
                      backgroundColor: CHART_COLORS.primary + '30',
                      fill: true,
                      tension: 0.4
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const value = context.parsed.y;
                            return selectedMetric === 'margin' ? `${value.toFixed(1)}%` : 
                                   selectedMetric === 'orders' ? value.toString() :
                                   formatCurrency(value);
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value) => {
                            const numValue = Number(value);
                            return selectedMetric === 'margin' ? `${numValue}%` : 
                                   selectedMetric === 'orders' ? numValue.toString() :
                                   formatCurrency(numValue);
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>

            {/* Multi-metric comparison */}
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Revenue vs Costs vs Profit</h4>
              <div style={{ height: '300px' }}>
                <Line
                  data={{
                    labels: data.trends.map(item => new Date(item.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                    datasets: [
                      {
                        label: 'Revenue',
                        data: data.trends.map(item => item.revenue),
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: CHART_COLORS.primary,
                        tension: 0.4
                      },
                      {
                        label: 'Costs',
                        data: data.trends.map(item => item.costs),
                        borderColor: CHART_COLORS.danger,
                        backgroundColor: CHART_COLORS.danger,
                        tension: 0.4
                      },
                      {
                        label: 'Profit',
                        data: data.trends.map(item => item.profit),
                        borderColor: CHART_COLORS.secondary,
                        backgroundColor: CHART_COLORS.secondary,
                        tension: 0.4
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value) => formatCurrency(Number(value))
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <h3 className="text-lg font-semibold">Product Performance Analysis</h3>
            
            <div className="space-y-4">
              {data.productAnalysis.map((product, index) => (
                <Card key={product.productId} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{product.productName}</h4>
                        <p className="text-sm text-muted-foreground">{product.category} • {product.units} units sold</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.margin > 30 ? 'default' : product.margin > 20 ? 'secondary' : 'destructive'}>
                          {formatPercentage(product.margin)} margin
                        </Badge>
                        <Badge variant="outline">
                          {formatCurrency(product.avgPrice)} avg price
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-700">{formatCurrency(product.revenue)}</div>
                        <div className="text-sm text-green-600">Revenue</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-700">{formatCurrency(product.costs)}</div>
                        <div className="text-sm text-red-600">Total Costs</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-700">{formatCurrency(product.profit)}</div>
                        <div className="text-sm text-blue-600">Profit</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-lg font-bold text-yellow-700">{formatCurrency(product.fbaFees)}</div>
                        <div className="text-sm text-yellow-600">FBA Fees</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-700">{formatCurrency(product.landedCost)}</div>
                        <div className="text-sm text-purple-600">Landed Cost</div>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(product.margin, 100)}%` }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="costs" className="space-y-6">
            <h3 className="text-lg font-semibold">Cost Breakdown Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4">
                <h4 className="font-semibold mb-4">Cost Distribution</h4>
                <div style={{ height: '300px' }}>
                  <Pie
                    data={{
                      labels: data.costBreakdown.map(item => item.category),
                      datasets: [{
                        data: data.costBreakdown.map(item => item.amount),
                        backgroundColor: data.costBreakdown.map(item => item.color),
                        borderWidth: 2,
                        borderColor: '#fff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.parsed;
                              const total = data.costBreakdown.reduce((sum, item) => sum + item.amount, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold mb-4">Cost Categories</h4>
                <div className="space-y-4">
                  {data.costBreakdown.map((cost, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cost.color }}
                          />
                          <span className="font-medium">{cost.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(cost.amount)}</div>
                          <div className="text-sm text-muted-foreground">{formatPercentage(cost.percentage)}</div>
                        </div>
                      </div>
                      <Progress value={cost.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h4 className="font-semibold mb-4">Cost Efficiency Opportunities</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">FBA Fee Optimization</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Potential savings through package dimension optimization
                  </p>
                  <div className="text-lg font-bold text-green-600">-$1,200/month</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Shipping Costs</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Negotiate better rates with freight forwarders
                  </p>
                  <div className="text-lg font-bold text-green-600">-$800/month</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Product Mix</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Focus on higher-margin products
                  </p>
                  <div className="text-lg font-bold text-green-600">+$2,100/month</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
            
            <div className="space-y-4">
              {data.insights.map((insight) => (
                <Card key={insight.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{insight.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={insight.type === 'opportunity' ? 'default' : insight.type === 'warning' ? 'destructive' : 'secondary'}>
                            {insight.type}
                          </Badge>
                          {insight.actionable && (
                            <Badge variant="outline">
                              Actionable
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Potential Impact:</span>
                          <span className={`font-bold ${
                            insight.impact > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {insight.impact > 0 ? '+' : ''}{formatCurrency(insight.impact)}
                          </span>
                        </div>
                        {insight.actionable && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              toast.success('Action item noted! This would typically open a detailed action plan or workflow.')
                              // TODO: Implement specific action based on insight type
                              console.log('Taking action for insight:', insight)
                            }}
                          >
                            Take Action
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}