'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Brain,
  Eye,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react'

interface ConfidenceData {
  id: string
  hsCode: string
  confidence: number
  source: 'ai' | 'manual' | 'historical' | 'expert'
  timestamp: string
  factors: {
    textAnalysis: number
    imageAnalysis?: number
    historicalMatch: number
    expertValidation?: number
    complianceCheck: number
  }
  breakdown: {
    category: string
    score: number
    weight: number
    explanation: string
  }[]
  thresholds: {
    minimum: number
    recommended: number
    high: number
  }
  risks: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    mitigation: string[]
  }
}

interface ConfidenceVisualizationProps {
  data: ConfidenceData[]
  selectedId?: string
  onSelectData?: (id: string) => void
  showComparison?: boolean
  interactive?: boolean
}

const confidenceRanges = [
  { min: 90, max: 100, label: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' },
  { min: 80, max: 89, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' },
  { min: 70, max: 79, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  { min: 60, max: 69, label: 'Poor', color: 'bg-orange-500', textColor: 'text-orange-700' },
  { min: 0, max: 59, label: 'Very Poor', color: 'bg-red-500', textColor: 'text-red-700' }
]

const riskColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-red-600 bg-red-50 border-red-200'
}

const sourceColors = {
  ai: 'bg-blue-100 text-blue-800',
  manual: 'bg-green-100 text-green-800',
  historical: 'bg-yellow-100 text-yellow-800',
  expert: 'bg-purple-100 text-purple-800'
}

export default function ConfidenceVisualization({
  data,
  selectedId,
  onSelectData,
  showComparison = true,
  interactive = true
}: ConfidenceVisualizationProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | 'all'>('24h')
  const [groupBy, setGroupBy] = useState<'source' | 'range' | 'time'>('range')

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') {return data}
    
    const now = new Date()
    const cutoff = new Date()
    
    switch (timeRange) {
      case '1h':
        cutoff.setHours(now.getHours() - 1)
        break
      case '24h':
        cutoff.setDate(now.getDate() - 1)
        break
      case '7d':
        cutoff.setDate(now.getDate() - 7)
        break
      case '30d':
        cutoff.setDate(now.getDate() - 30)
        break
    }
    
    return data.filter(item => new Date(item.timestamp) >= cutoff)
  }, [data, timeRange])

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        average: 0,
        median: 0,
        distribution: [],
        trend: 'stable' as 'up' | 'down' | 'stable',
        riskDistribution: { low: 0, medium: 0, high: 0 }
      }
    }

    const confidences = filteredData.map(d => d.confidence).sort((a, b) => a - b)
    const average = confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    const median = confidences[Math.floor(confidences.length / 2)]
    
    // Distribution by confidence ranges
    const distribution = confidenceRanges.map(range => ({
      ...range,
      count: filteredData.filter(d => d.confidence >= range.min && d.confidence <= range.max).length,
      percentage: (filteredData.filter(d => d.confidence >= range.min && d.confidence <= range.max).length / filteredData.length) * 100
    }))
    
    // Risk distribution
    const riskDistribution = {
      low: filteredData.filter(d => d.risks.level === 'low').length,
      medium: filteredData.filter(d => d.risks.level === 'medium').length,
      high: filteredData.filter(d => d.risks.level === 'high').length
    }
    
    // Simple trend calculation (last 50% vs first 50%)
    const midpoint = Math.floor(filteredData.length / 2)
    const firstHalf = filteredData.slice(0, midpoint)
    const secondHalf = filteredData.slice(midpoint)
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.confidence, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.confidence, 0) / secondHalf.length
    
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (secondAvg > firstAvg + 2) {trend = 'up'}
    else if (secondAvg < firstAvg - 2) {trend = 'down'}
    
    return { average, median, distribution, trend, riskDistribution }
  }, [filteredData])

  const selectedData = selectedId ? filteredData.find(d => d.id === selectedId) : null

  const getConfidenceRange = (confidence: number) => {
    return confidenceRanges.find(range => confidence >= range.min && confidence <= range.max) || confidenceRanges[4]
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Average Confidence</p>
                <p className="text-lg font-semibold">{stats.average.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Median</p>
                <p className="text-lg font-semibold">{stats.median.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {stats.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : stats.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Activity className="h-4 w-4 text-gray-600" />
              )}
              <div>
                <p className="text-xs text-gray-600">Trend</p>
                <p className="text-lg font-semibold capitalize">{stats.trend}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Total Classifications</p>
                <p className="text-lg font-semibold">{filteredData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Confidence Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.distribution.map((range, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded ${range.color}`} />
                    <span className="text-sm font-medium">{range.label}</span>
                    <span className="text-xs text-gray-500">({range.min}-{range.max}%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{range.count} items</span>
                    <span className="text-sm font-medium">{range.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <Progress value={range.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${riskColors.low}`}>
              <div className="text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Low Risk</p>
                <p className="text-2xl font-bold">{stats.riskDistribution.low}</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${riskColors.medium}`}>
              <div className="text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Medium Risk</p>
                <p className="text-2xl font-bold">{stats.riskDistribution.medium}</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${riskColors.high}`}>
              <div className="text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">High Risk</p>
                <p className="text-2xl font-bold">{stats.riskDistribution.high}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderDetailed = () => (
    <div className="space-y-6">
      {filteredData.map((item) => {
        const range = getConfidenceRange(item.confidence)
        const isSelected = selectedId === item.id
        
        return (
          <Card 
            key={item.id} 
            className={`transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
            }`}
            onClick={() => onSelectData?.(item.id)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span className="font-mono">{item.hsCode}</span>
                    <Badge className={sourceColors[item.source]}>
                      {item.source.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {new Date(item.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${range.textColor}`}>
                    {item.confidence}%
                  </div>
                  <Badge variant="outline" className={range.textColor}>
                    {range.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Confidence Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Confidence Factors</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Text Analysis:</span>
                      <span className="font-medium">{item.factors.textAnalysis}%</span>
                    </div>
                    {item.factors.imageAnalysis && (
                      <div className="flex justify-between">
                        <span>Image Analysis:</span>
                        <span className="font-medium">{item.factors.imageAnalysis}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Historical Match:</span>
                      <span className="font-medium">{item.factors.historicalMatch}%</span>
                    </div>
                    {item.factors.expertValidation && (
                      <div className="flex justify-between">
                        <span>Expert Validation:</span>
                        <span className="font-medium">{item.factors.expertValidation}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Compliance Check:</span>
                      <span className="font-medium">{item.factors.complianceCheck}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Detailed Breakdown</h4>
                  <div className="space-y-2">
                    {item.breakdown.map((factor, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{factor.category}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{factor.score}%</span>
                            <span className="text-xs text-gray-500">({factor.weight}x)</span>
                          </div>
                        </div>
                        <Progress value={factor.score} className="h-1" />
                        <p className="text-xs text-gray-600">{factor.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Thresholds */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Confidence Thresholds</h4>
                  <div className="relative">
                    <Progress value={100} className="h-4" />
                    <div className="absolute inset-0 flex items-center">
                      <div 
                        className="absolute w-0.5 h-6 bg-red-500"
                        style={{ left: `${item.thresholds.minimum}%` }}
                      />
                      <div 
                        className="absolute w-0.5 h-6 bg-yellow-500"
                        style={{ left: `${item.thresholds.recommended}%` }}
                      />
                      <div 
                        className="absolute w-0.5 h-6 bg-green-500"
                        style={{ left: `${item.thresholds.high}%` }}
                      />
                      <div 
                        className="absolute w-1 h-8 bg-blue-600 rounded"
                        style={{ left: `${item.confidence}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Min: {item.thresholds.minimum}%</span>
                    <span>Rec: {item.thresholds.recommended}%</span>
                    <span>High: {item.thresholds.high}%</span>
                  </div>
                </div>
                
                {/* Risk Assessment */}
                <div className={`p-3 rounded border ${riskColors[item.risks.level]}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium capitalize">{item.risks.level} Risk</span>
                  </div>
                  
                  {item.risks.factors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Risk Factors:</p>
                      <ul className="text-xs space-y-0.5">
                        {item.risks.factors.map((factor, i) => (
                          <li key={i}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {item.risks.mitigation.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-xs font-medium">Mitigation:</p>
                      <ul className="text-xs space-y-0.5">
                        {item.risks.mitigation.map((action, i) => (
                          <li key={i}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const renderComparison = () => {
    if (!selectedData) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-600">Select a classification to view detailed analysis</p>
            <p className="text-sm text-gray-500">Click on any item in the detailed view to see comparison</p>
          </CardContent>
        </Card>
      )
    }

    const range = getConfidenceRange(selectedData.confidence)
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Detailed Analysis: {selectedData.hsCode}</span>
            </CardTitle>
            <CardDescription>
              Classification performed on {new Date(selectedData.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Confidence Visualization */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Confidence Analysis</h3>
                
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <div className={`text-4xl font-bold ${range.textColor} mb-2`}>
                    {selectedData.confidence}%
                  </div>
                  <Badge className={range.color + ' text-white'}>
                    {range.label}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(selectedData.factors).map(([key, value]) => {
                    if (value === undefined) {return null}
                    
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                    
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-sm">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Breakdown Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Factor Breakdown</h3>
                
                <div className="space-y-3">
                  {selectedData.breakdown.map((factor, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{factor.category}</h4>
                        <div className="text-right">
                          <div className="font-bold">{factor.score}%</div>
                          <div className="text-xs text-gray-500">Weight: {factor.weight}x</div>
                        </div>
                      </div>
                      <Progress value={factor.score} className="h-2 mb-2" />
                      <p className="text-sm text-gray-600">{factor.explanation}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Threshold Comparison */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Threshold Analysis</h3>
              
              <div className="relative bg-gray-100 rounded-lg p-4">
                <div className="relative h-8 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded">
                  {/* Threshold markers */}
                  <div 
                    className="absolute top-0 w-1 h-8 bg-red-600 rounded"
                    style={{ left: `${selectedData.thresholds.minimum}%` }}
                  />
                  <div 
                    className="absolute top-0 w-1 h-8 bg-yellow-600 rounded"
                    style={{ left: `${selectedData.thresholds.recommended}%` }}
                  />
                  <div 
                    className="absolute top-0 w-1 h-8 bg-green-600 rounded"
                    style={{ left: `${selectedData.thresholds.high}%` }}
                  />
                  
                  {/* Current confidence marker */}
                  <div 
                    className="absolute -top-2 w-3 h-12 bg-blue-600 rounded shadow-lg"
                    style={{ left: `${selectedData.confidence}%` }}
                  />
                </div>
                
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-red-600">Min: {selectedData.thresholds.minimum}%</span>
                  <span className="text-yellow-600">Rec: {selectedData.thresholds.recommended}%</span>
                  <span className="text-green-600">High: {selectedData.thresholds.high}%</span>
                </div>
                
                <div className="text-center mt-2">
                  <span className="text-blue-600 font-medium">
                    Current: {selectedData.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Confidence Visualization</h2>
          <p className="text-gray-600">
            Analyzing {filteredData.length} classification{filteredData.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              toast.success('Exporting confidence data...')
              // TODO: Implement actual export functionality
              console.log('Exporting confidence visualization data')
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              toast.success('Refreshing confidence data...')
              // TODO: Implement actual refresh functionality
              console.log('Refreshing confidence visualization')
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Detailed</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Analysis</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>
        
        <TabsContent value="detailed">
          {renderDetailed()}
        </TabsContent>
        
        <TabsContent value="comparison">
          {renderComparison()}
        </TabsContent>
      </Tabs>
      
      {/* Alerts */}
      {stats.riskDistribution.high > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>High Risk Alert:</strong> {stats.riskDistribution.high} classification{stats.riskDistribution.high !== 1 ? 's' : ''} 
            {stats.riskDistribution.high === 1 ? ' has' : ' have'} high risk factors. Review recommended.
          </AlertDescription>
        </Alert>
      )}
      
      {stats.average < 70 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Low Confidence:</strong> Average confidence is {stats.average.toFixed(1)}%. 
            Consider reviewing classification parameters or providing additional context.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}