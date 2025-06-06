'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowUpRight,
  Target,
  Zap,
  Shield,
  Package
} from 'lucide-react'
import { format } from 'date-fns'

interface ClassificationSummary {
  totalClassifications: number
  pendingReview: number
  highConfidence: number
  lowConfidence: number
  averageConfidence: number
  accuracyRate: number
  processingTime: number
  recentActivity: number
}

interface ClassificationItem {
  id: string
  hsCode: string
  productName: string
  productDescription: string
  category: string
  confidence: number
  source: 'ai' | 'manual' | 'historical' | 'expert'
  timestamp: string
  originCountry?: string
  destinationCountry?: string
  riskLevel: 'low' | 'medium' | 'high'
  tags: string[]
  userId?: string
  companyId?: string
  validationStatus: 'pending' | 'validated' | 'rejected'
  complianceFlags: string[]
  alternativeCodes?: string[]
  imageAnalysis?: boolean
  expertReview?: boolean
}

interface PerformanceMetrics {
  accuracy: number
  speed: number
  consistency: number
  coverage: number
}

interface EnhancedClassificationDashboardProps {
  data?: ClassificationItem[]
  onItemSelect?: (id: string) => void
  viewMode?: 'split' | 'grid' | 'list'
  compactMode?: boolean
  onNewClassification?: () => void
  onViewClassification?: (id: string) => void
  onEditClassification?: (id: string) => void
}

export default function EnhancedClassificationDashboard({
  data,
  onItemSelect,
  viewMode,
  compactMode,
  onNewClassification,
  onViewClassification,
  onEditClassification
}: EnhancedClassificationDashboardProps) {
  const [summary, setSummary] = useState<ClassificationSummary | null>(null)
  const [classifications, setClassifications] = useState<ClassificationItem[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch summary data
      const summaryResponse = await fetch('/api/classification/dashboard/summary')
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setSummary(summaryData)
      }

      // Fetch recent classifications
      const classificationsResponse = await fetch('/api/classification/dashboard/recent')
      if (classificationsResponse.ok) {
        const classificationsData = await classificationsResponse.json()
        setClassifications(classificationsData.classifications || [])
      }

      // Fetch performance metrics
      const metricsResponse = await fetch('/api/classification/dashboard/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'review': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) {return 'bg-green-100 text-green-800'}
    if (confidence >= 60) {return 'bg-yellow-100 text-yellow-800'}
    return 'bg-red-100 text-red-800'
  }

  const getComplianceColor = (status?: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'restricted': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredClassifications = classifications.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.hsCode.includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || item.validationStatus === statusFilter
    const matchesConfidence = confidenceFilter === 'all' ||
      (confidenceFilter === 'high' && item.confidence >= 80) ||
      (confidenceFilter === 'medium' && item.confidence >= 60 && item.confidence < 80) ||
      (confidenceFilter === 'low' && item.confidence < 60)
    const matchesSource = sourceFilter === 'all' || item.source === sourceFilter
    
    return matchesSearch && matchesStatus && matchesConfidence && matchesSource
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classification Dashboard</h1>
          <p className="text-gray-600">Monitor and manage HS code classifications</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={onNewClassification}>
            <Plus className="h-4 w-4 mr-2" />
            New Classification
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Classifications</p>
                  <p className="text-2xl font-bold">{summary.totalClassifications.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+{summary.recentActivity}</span>
                <span className="text-gray-600 ml-1">this week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Confidence</p>
                  <p className="text-2xl font-bold">{summary.averageConfidence.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={summary.averageConfidence} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Accuracy Rate</p>
                  <p className="text-2xl font-bold">{summary.accuracyRate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <Progress value={summary.accuracyRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold">{summary.pendingReview}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              {summary.pendingReview > 0 && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Requires attention
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{metrics.accuracy}%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
                <Progress value={metrics.accuracy} className="mt-1" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metrics.speed}%</div>
                <div className="text-sm text-gray-600">Speed</div>
                <Progress value={metrics.speed} className="mt-1" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metrics.consistency}%</div>
                <div className="text-sm text-gray-600">Consistency</div>
                <Progress value={metrics.consistency} className="mt-1" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metrics.coverage}%</div>
                <div className="text-sm text-gray-600">Coverage</div>
                <Progress value={metrics.coverage} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Classifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Confidence</p>
                    <p className="text-xl font-bold text-green-600">{summary?.highConfidence || 0}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Low Confidence</p>
                    <p className="text-xl font-bold text-red-600">{summary?.lowConfidence || 0}</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Processing Time</p>
                    <p className="text-xl font-bold">{summary?.processingTime || 0}ms</p>
                  </div>
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Alert */}
          {summary && summary.pendingReview > 5 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have {summary.pendingReview} classifications pending review. Consider reviewing them to maintain accuracy.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by product name or HS code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Confidence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Confidence</SelectItem>
                    <SelectItem value="high">High (80%+)</SelectItem>
                    <SelectItem value="medium">Medium (60-79%)</SelectItem>
                    <SelectItem value="low">Low (&lt;60%)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="enhanced">Enhanced</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Classifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Classifications ({filteredClassifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredClassifications.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{item.productName}</h4>
                        <Badge className={getStatusColor(item.validationStatus)}>
                          {item.validationStatus}
                        </Badge>
                        {item.complianceFlags.length > 0 && (
                          <Badge className={getComplianceColor('warning')}>
                            <Shield className="h-3 w-3 mr-1" />
                            {item.complianceFlags.length} flags
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="font-mono">{item.hsCode}</span>
                        <Badge className={getConfidenceColor(item.confidence)}>
                          {item.confidence}% confidence
                        </Badge>
                        <span>{item.source}</span>
                        <span>{format(new Date(item.timestamp), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewClassification?.(item.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditClassification?.(item.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredClassifications.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2" />
                    <p>No classifications found matching your filters.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Classifications</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classifications.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classifications.filter(c => c.confidence >= 0.8).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {classifications.length > 0 ? Math.round((classifications.filter(c => c.confidence >= 0.8).length / classifications.length) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classifications.filter(c => c.confidence < 0.6).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {classifications.length > 0 ? Math.round((classifications.filter(c => c.confidence < 0.6).length / classifications.length) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classifications.length > 0 ? Math.round((classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Overall accuracy</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Classification Sources</CardTitle>
              <CardDescription>Distribution of classification sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(classifications.map(c => c.source))).map(source => {
                  const count = classifications.filter(c => c.source === source).length
                  const percentage = classifications.length > 0 ? (count / classifications.length) * 100 : 0
                  return (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{source}</Badge>
                        <span className="text-sm text-muted-foreground">{count} classifications</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{Math.round(percentage)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}