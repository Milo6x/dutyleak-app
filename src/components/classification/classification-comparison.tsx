'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Copy,
  Download,
  Share,
  Filter,
  BarChart3,
  Target,
  Clock,
  DollarSign,
  Globe,
  Shield,
  Zap,
  Eye,
  Star,
  ArrowRight,
  Info
} from 'lucide-react'

interface ClassificationResult {
  id: string
  hsCode: string
  description: string
  confidence: number
  source: 'ai' | 'manual' | 'historical' | 'expert'
  timestamp: string
  dutyRate?: number
  restrictions?: string[]
  compliance: {
    status: 'compliant' | 'warning' | 'violation'
    issues: string[]
  }
  validation: {
    format: boolean
    category: boolean
    exists: boolean
  }
  metadata: {
    processingTime: number
    model?: string
    version?: string
    reviewer?: string
  }
  reasoning?: string
  alternatives?: Array<{
    hsCode: string
    confidence: number
    reason: string
  }>
}

interface ComparisonMetrics {
  accuracy: number
  consistency: number
  avgConfidence: number
  avgProcessingTime: number
  complianceRate: number
}

interface ClassificationComparisonProps {
  data?: any[]
  results?: ClassificationResult[]
  onSelectionChange?: (items: string[]) => void
  onSelectResult?: (result: ClassificationResult) => void
  onExport?: (results: ClassificationResult[]) => void
  showMetrics?: boolean
  allowFiltering?: boolean
}

const sourceLabels = {
  ai: 'AI Classification',
  manual: 'Manual Entry',
  historical: 'Historical Data',
  expert: 'Expert Review'
}

const sourceColors = {
  ai: 'bg-blue-100 text-blue-800',
  manual: 'bg-green-100 text-green-800',
  historical: 'bg-yellow-100 text-yellow-800',
  expert: 'bg-purple-100 text-purple-800'
}

const complianceColors = {
  compliant: 'text-green-600',
  warning: 'text-yellow-600',
  violation: 'text-red-600'
}

const complianceIcons = {
  compliant: CheckCircle,
  warning: AlertTriangle,
  violation: XCircle
}

export default function ClassificationComparison({
  data,
  results,
  onSelectionChange,
  onSelectResult,
  onExport,
  showMetrics = true,
  allowFiltering = true
}: ClassificationComparisonProps) {
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterCompliance, setFilterCompliance] = useState<string>('all')
  const [minConfidence, setMinConfidence] = useState<number>(0)
  const [sortBy, setSortBy] = useState<string>('confidence')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState('')

  // Use data as results if results is not provided
  const actualResults = results || data || []

  // Filter and sort results
  const filteredResults = useMemo(() => {
    const filtered = actualResults.filter(result => {
      const matchesSearch = searchTerm === '' || 
        result.hsCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSource = filterSource === 'all' || result.source === filterSource
      const matchesCompliance = filterCompliance === 'all' || result.compliance.status === filterCompliance
      const matchesConfidence = result.confidence >= minConfidence
      
      return matchesSearch && matchesSource && matchesCompliance && matchesConfidence
    })

    // Sort results
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'confidence':
          aValue = a.confidence
          bValue = b.confidence
          break
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime()
          bValue = new Date(b.timestamp).getTime()
          break
        case 'hsCode':
          aValue = a.hsCode
          bValue = b.hsCode
          break
        case 'dutyRate':
          aValue = a.dutyRate || 0
          bValue = b.dutyRate || 0
          break
        case 'processingTime':
          aValue = a.metadata.processingTime
          bValue = b.metadata.processingTime
          break
        default:
          aValue = a.confidence
          bValue = b.confidence
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [results, filterSource, filterCompliance, minConfidence, sortBy, sortOrder, searchTerm])

  // Calculate comparison metrics
  const metrics = useMemo((): ComparisonMetrics => {
    if (filteredResults.length === 0) {
      return {
        accuracy: 0,
        consistency: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        complianceRate: 0
      }
    }

    const avgConfidence = filteredResults.reduce((sum, r) => sum + r.confidence, 0) / filteredResults.length
    const avgProcessingTime = filteredResults.reduce((sum, r) => sum + r.metadata.processingTime, 0) / filteredResults.length
    const complianceRate = (filteredResults.filter(r => r.compliance.status === 'compliant').length / filteredResults.length) * 100
    
    // Calculate consistency (how similar the HS codes are)
    const uniqueCodes = new Set(filteredResults.map(r => r.hsCode.substring(0, 4)))
    const consistency = ((filteredResults.length - uniqueCodes.size + 1) / filteredResults.length) * 100
    
    // Estimate accuracy based on confidence and validation
    const accuracy = filteredResults.reduce((sum, r) => {
      const validationScore = Object.values(r.validation).filter(Boolean).length / 3
      return sum + (r.confidence * validationScore)
    }, 0) / filteredResults.length

    return {
      accuracy,
      consistency,
      avgConfidence,
      avgProcessingTime,
      complianceRate
    }
  }, [filteredResults])

  const handleSelectResult = (resultId: string) => {
    setSelectedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    )
  }

  const handleSelectAll = () => {
    if (selectedResults.length === filteredResults.length) {
      setSelectedResults([])
    } else {
      setSelectedResults(filteredResults.map(r => r.id))
    }
  }

  const handleExport = () => {
    const resultsToExport = selectedResults.length > 0 
      ? filteredResults.filter(r => selectedResults.includes(r.id))
      : filteredResults
    onExport?.(resultsToExport)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) {return 'text-green-600'}
    if (confidence >= 60) {return 'text-yellow-600'}
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) {return TrendingUp}
    if (confidence >= 60) {return Minus}
    return TrendingDown
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) {return `${ms}ms`}
    return `${(ms / 1000).toFixed(1)}s`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Classification Comparison</h2>
          <p className="text-gray-600">
            Comparing {filteredResults.length} classification result{filteredResults.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleSelectAll}
            disabled={filteredResults.length === 0}
          >
            {selectedResults.length === filteredResults.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredResults.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {showMetrics && filteredResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Accuracy</p>
                  <p className="text-lg font-semibold">{metrics.accuracy.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">Consistency</p>
                  <p className="text-lg font-semibold">{metrics.consistency.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-xs text-gray-600">Avg Confidence</p>
                  <p className="text-lg font-semibold">{metrics.avgConfidence.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Avg Time</p>
                  <p className="text-lg font-semibold">{formatDuration(metrics.avgProcessingTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">Compliance</p>
                  <p className="text-lg font-semibold">{metrics.complianceRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {allowFiltering && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Sorting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search HS codes or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="ai">AI Classification</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                    <SelectItem value="historical">Historical Data</SelectItem>
                    <SelectItem value="expert">Expert Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Compliance</Label>
                <Select value={filterCompliance} onValueChange={setFilterCompliance}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="violation">Violation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Min Confidence: {minConfidence}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex space-x-4">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence">Confidence</SelectItem>
                    <SelectItem value="timestamp">Date</SelectItem>
                    <SelectItem value="hsCode">HS Code</SelectItem>
                    <SelectItem value="dutyRate">Duty Rate</SelectItem>
                    <SelectItem value="processingTime">Processing Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Order</Label>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {filteredResults.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try adjusting your filters or search criteria</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result, index) => {
            const ConfidenceIcon = getConfidenceIcon(result.confidence)
            const ComplianceIcon = complianceIcons[result.compliance.status]
            const isSelected = selectedResults.includes(result.id)
            
            return (
              <Card 
                key={result.id} 
                className={`transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectResult(result.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span className="font-mono text-lg">{result.hsCode}</span>
                          <Badge className={sourceColors[result.source]}>
                            {sourceLabels[result.source]}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {result.description}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.hsCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {onSelectResult && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectResult(result)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="compliance">Compliance</TabsTrigger>
                      <TabsTrigger value="validation">Validation</TabsTrigger>
                      <TabsTrigger value="metadata">Metadata</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <ConfidenceIcon className={`h-4 w-4 ${getConfidenceColor(result.confidence)}`} />
                          <div>
                            <p className="text-xs text-gray-600">Confidence</p>
                            <p className="font-semibold">{result.confidence}%</p>
                          </div>
                        </div>
                        
                        {result.dutyRate !== undefined && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-xs text-gray-600">Duty Rate</p>
                              <p className="font-semibold">{result.dutyRate}%</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-600" />
                          <div>
                            <p className="text-xs text-gray-600">Processing Time</p>
                            <p className="font-semibold">{formatDuration(result.metadata.processingTime)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <ComplianceIcon className={`h-4 w-4 ${complianceColors[result.compliance.status]}`} />
                          <div>
                            <p className="text-xs text-gray-600">Compliance</p>
                            <p className="font-semibold capitalize">{result.compliance.status}</p>
                          </div>
                        </div>
                      </div>
                      
                      {result.reasoning && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Reasoning</Label>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                            {result.reasoning}
                          </p>
                        </div>
                      )}
                      
                      {result.alternatives && result.alternatives.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Alternative Classifications</Label>
                          <div className="space-y-2">
                            {result.alternatives.slice(0, 3).map((alt, i) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-sm">{alt.hsCode}</span>
                                  <Badge variant="outline">{alt.confidence}%</Badge>
                                </div>
                                <p className="text-xs text-gray-600">{alt.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="compliance" className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <ComplianceIcon className={`h-5 w-5 ${complianceColors[result.compliance.status]}`} />
                        <span className={`font-semibold capitalize ${complianceColors[result.compliance.status]}`}>
                          {result.compliance.status}
                        </span>
                      </div>
                      
                      {result.compliance.issues.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Issues</Label>
                          <ul className="space-y-1">
                            {result.compliance.issues.map((issue, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start space-x-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.restrictions && result.restrictions.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Restrictions</Label>
                          <div className="flex flex-wrap gap-1">
                            {result.restrictions.map((restriction, i) => (
                              <Badge key={i} variant="destructive">
                                {restriction}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="validation" className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          {result.validation.format ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">Format Valid</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {result.validation.category ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">Category Valid</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {result.validation.exists ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">Code Exists</span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="metadata" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="font-medium">Timestamp</Label>
                          <p className="text-gray-700">{new Date(result.timestamp).toLocaleString()}</p>
                        </div>
                        
                        {result.metadata.model && (
                          <div>
                            <Label className="font-medium">Model</Label>
                            <p className="text-gray-700">{result.metadata.model}</p>
                          </div>
                        )}
                        
                        {result.metadata.version && (
                          <div>
                            <Label className="font-medium">Version</Label>
                            <p className="text-gray-700">{result.metadata.version}</p>
                          </div>
                        )}
                        
                        {result.metadata.reviewer && (
                          <div>
                            <Label className="font-medium">Reviewer</Label>
                            <p className="text-gray-700">{result.metadata.reviewer}</p>
                          </div>
                        )}
                        
                        <div>
                          <Label className="font-medium">Processing Time</Label>
                          <p className="text-gray-700">{formatDuration(result.metadata.processingTime)}</p>
                        </div>
                        
                        <div>
                          <Label className="font-medium">Result ID</Label>
                          <p className="text-gray-700 font-mono text-xs">{result.id}</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Selected Results Summary */}
      {selectedResults.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {selectedResults.length} result{selectedResults.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedResults([])}>
                  Clear Selection
                </Button>
                <Button size="sm" onClick={handleExport}>
                  Export Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}