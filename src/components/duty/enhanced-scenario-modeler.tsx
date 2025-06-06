'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Package,
  Truck,
  Globe,
  FileText,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Settings,
  Download,
  Share,
  RefreshCw
} from 'lucide-react'
import { SavingsAnalysisEngine, BatchSavingsAnalysis, ProductSavingsScenario, ScenarioComparisonOptions, MultiScenarioComparison } from '@/lib/duty/savings-analysis-engine'
import { toast } from 'sonner'

interface EnhancedScenarioModelerProps {
  productIds?: string[]
  onScenarioSelect?: (scenario: ProductSavingsScenario) => void
  onBatchAnalysisComplete?: (analysis: BatchSavingsAnalysis) => void
}

interface ScenarioConfiguration {
  includeShippingVariations: boolean
  includeOriginCountryVariations: boolean
  includeClassificationVariations: boolean
  includeTradeAgreements: boolean
  includeFBAOptimizations: boolean
  timeHorizonMonths: number
  confidenceThreshold: number
  minSavingThreshold: number
  maxScenarios: number
  analysisDepth: 'basic' | 'comprehensive' | 'exhaustive'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const SHIPPING_METHODS = ['standard', 'express', 'economy', 'air_freight', 'sea_freight']
const ORIGIN_COUNTRIES = ['CN', 'IN', 'VN', 'TH', 'MY', 'ID', 'PH', 'BD']
const DESTINATION_COUNTRIES = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'JP']

export function EnhancedScenarioModeler({ 
  productIds = [], 
  onScenarioSelect,
  onBatchAnalysisComplete 
}: EnhancedScenarioModelerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [batchAnalysis, setBatchAnalysis] = useState<BatchSavingsAnalysis | null>(null)
  const [multiScenarioComparison, setMultiScenarioComparison] = useState<MultiScenarioComparison | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>(productIds)
  const [configuration, setConfiguration] = useState<ScenarioConfiguration>({
    includeShippingVariations: true,
    includeOriginCountryVariations: true,
    includeClassificationVariations: true,
    includeTradeAgreements: true,
    includeFBAOptimizations: true,
    timeHorizonMonths: 12,
    confidenceThreshold: 0.7,
    minSavingThreshold: 50,
    maxScenarios: 20,
    analysisDepth: 'comprehensive'
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedScenario, setSelectedScenario] = useState<ProductSavingsScenario | null>(null)

  const savingsEngine = useMemo(() => new SavingsAnalysisEngine({
    includeShippingVariations: configuration.includeShippingVariations,
    includeOriginCountryVariations: configuration.includeOriginCountryVariations,
    includeClassificationVariations: configuration.includeClassificationVariations,
    includeTradeAgreements: configuration.includeTradeAgreements,
    includeFBAOptimizations: configuration.includeFBAOptimizations,
    timeHorizonMonths: configuration.timeHorizonMonths,
    confidenceThreshold: configuration.confidenceThreshold,
    minSavingThreshold: configuration.minSavingThreshold,
    maxScenarios: configuration.maxScenarios
  }), [configuration])

  const runBatchAnalysis = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product for analysis')
      return
    }

    setIsLoading(true)
    try {
      const analysis = await savingsEngine.analyzeBatchSavings(selectedProducts)
      setBatchAnalysis(analysis)
      onBatchAnalysisComplete?.(analysis)
      toast.success(`Analysis completed for ${analysis.totalProducts} products`)
    } catch (error) {
      console.error('Batch analysis error:', error)
      toast.error('Failed to complete batch analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const runScenarioComparison = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product for comparison')
      return
    }

    setIsLoading(true)
    try {
      const comparisonOptions: ScenarioComparisonOptions = {
        productIds: selectedProducts,
        variations: {
          shippingMethods: configuration.includeShippingVariations ? SHIPPING_METHODS : undefined,
          originCountries: configuration.includeOriginCountryVariations ? ORIGIN_COUNTRIES : undefined,
          destinationCountries: DESTINATION_COUNTRIES,
          hsCodeAlternatives: configuration.includeClassificationVariations,
          tradeAgreements: configuration.includeTradeAgreements,
          fbaOptimizations: configuration.includeFBAOptimizations
        },
        analysisDepth: configuration.analysisDepth,
        timeHorizon: configuration.timeHorizonMonths
      }

      const comparison = await savingsEngine.compareMultipleScenarios(comparisonOptions)
      setMultiScenarioComparison(comparison)
      toast.success('Scenario comparison completed')
    } catch (error) {
      console.error('Scenario comparison error:', error)
      toast.error('Failed to complete scenario comparison')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const savingsChartData = useMemo(() => {
    if (!batchAnalysis) {return []}
    
    return batchAnalysis.scenarios.map(scenario => ({
      name: scenario.name.substring(0, 20) + '...',
      current: scenario.baselineCalculation.totalLandedCost,
      optimized: scenario.optimizedCalculation.totalLandedCost,
      savings: scenario.savingsBreakdown.totalSavingsPerUnit
    }))
  }, [batchAnalysis])

  const roiChartData = useMemo(() => {
    if (!batchAnalysis) {return []}
    
    return batchAnalysis.scenarios.map(scenario => ({
      name: scenario.name.substring(0, 15) + '...',
      roi: scenario.savingsBreakdown.roi,
      confidence: scenario.confidence * 100
    }))
  }, [batchAnalysis])

  const implementationComplexityData = useMemo(() => {
    if (!batchAnalysis) {return []}
    
    const complexityCount = { low: 0, medium: 0, high: 0 }
    batchAnalysis.scenarios.forEach(scenario => {
      scenario.implementationRequirements.forEach(req => {
        complexityCount[req.complexity]++
      })
    })

    return Object.entries(complexityCount).map(([complexity, count]) => ({
      name: complexity.charAt(0).toUpperCase() + complexity.slice(1),
      value: count
    }))
  }, [batchAnalysis])

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Analysis Configuration
          </CardTitle>
          <CardDescription>
            Configure the parameters for your savings analysis and scenario modeling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Analysis Depth</Label>
              <Select 
                value={configuration.analysisDepth} 
                onValueChange={(value: 'basic' | 'comprehensive' | 'exhaustive') => 
                  setConfiguration(prev => ({ ...prev, analysisDepth: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="exhaustive">Exhaustive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Horizon (Months)</Label>
              <Input
                type="number"
                value={configuration.timeHorizonMonths}
                onChange={(e) => setConfiguration(prev => ({ 
                  ...prev, 
                  timeHorizonMonths: parseInt(e.target.value) || 12 
                }))}
                min="1"
                max="60"
              />
            </div>

            <div className="space-y-2">
              <Label>Min Saving Threshold ($)</Label>
              <Input
                type="number"
                value={configuration.minSavingThreshold}
                onChange={(e) => setConfiguration(prev => ({ 
                  ...prev, 
                  minSavingThreshold: parseInt(e.target.value) || 50 
                }))}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Confidence Threshold</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={configuration.confidenceThreshold}
                onChange={(e) => setConfiguration(prev => ({ 
                  ...prev, 
                  confidenceThreshold: parseFloat(e.target.value) || 0.7 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Scenarios</Label>
              <Input
                type="number"
                value={configuration.maxScenarios}
                onChange={(e) => setConfiguration(prev => ({ 
                  ...prev, 
                  maxScenarios: parseInt(e.target.value) || 20 
                }))}
                min="1"
                max="50"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-medium">Analysis Options</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'includeShippingVariations', label: 'Shipping Variations', icon: Truck },
                { key: 'includeOriginCountryVariations', label: 'Origin Country Variations', icon: Globe },
                { key: 'includeClassificationVariations', label: 'Classification Variations', icon: FileText },
                { key: 'includeTradeAgreements', label: 'Trade Agreements', icon: Target },
                { key: 'includeFBAOptimizations', label: 'FBA Optimizations', icon: Package }
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={configuration[key as keyof ScenarioConfiguration] as boolean}
                    onCheckedChange={(checked) => 
                      setConfiguration(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                  <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={runBatchAnalysis} 
              disabled={isLoading || selectedProducts.length === 0}
              className="flex items-center gap-2"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Run Batch Analysis
            </Button>
            <Button 
              variant="outline" 
              onClick={runScenarioComparison} 
              disabled={isLoading || selectedProducts.length === 0}
              className="flex items-center gap-2"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Compare Scenarios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      {(batchAnalysis || multiScenarioComparison) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {batchAnalysis && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Savings</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(batchAnalysis.totalSavings)}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Savings Percentage</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatPercentage(batchAnalysis.totalSavingsPercentage)}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Average ROI</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatPercentage(batchAnalysis.averageROI)}
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Products Analyzed</p>
                          <p className="text-2xl font-bold">{batchAnalysis.totalProducts}</p>
                        </div>
                        <Package className="h-8 w-8 text-gray-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Savings by Product</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={savingsChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Bar dataKey="current" fill="#ef4444" name="Current Cost" />
                          <Bar dataKey="optimized" fill="#22c55e" name="Optimized Cost" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Implementation Complexity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={implementationComplexityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {implementationComplexityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-4">
            {batchAnalysis?.scenarios.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedScenario(scenario)
                      onScenarioSelect?.(scenario)
                    }}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{scenario.name}</h3>
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(scenario.savingsBreakdown.totalSavingsPerUnit)} savings
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {formatPercentage(scenario.savingsBreakdown.totalSavingsPercentage)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {scenario.timeToImplement}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="flex items-center gap-2">
                        <Progress value={scenario.confidence * 100} className="w-20" />
                        <span className="text-sm font-medium">{formatPercentage(scenario.confidence * 100)}</span>
                      </div>
                      <div className={`text-sm font-medium ${getRiskColor(scenario.riskAssessment.overallRisk)}`}>
                        {scenario.riskAssessment.overallRisk.toUpperCase()} RISK
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {batchAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>ROI vs Confidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={roiChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="roi" stroke="#8884d8" name="ROI %" />
                        <Line type="monotone" dataKey="confidence" stroke="#82ca9d" name="Confidence %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Summary Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {batchAnalysis.summary.quickWins}
                        </div>
                        <div className="text-sm text-green-700">Quick Wins</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {batchAnalysis.summary.highImpactScenarios}
                        </div>
                        <div className="text-sm text-blue-700">High Impact</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {batchAnalysis.summary.longTermOpportunities}
                        </div>
                        <div className="text-sm text-purple-700">Long Term</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(batchAnalysis.summary.netSavings)}
                        </div>
                        <div className="text-sm text-orange-700">Net Savings</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {batchAnalysis?.recommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{recommendation.title}</h3>
                        <Badge className={getPriorityColor(recommendation.priority)}>
                          {recommendation.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(recommendation.totalSavings)} savings
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {recommendation.timeframe}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {recommendation.affectedProducts.length} products
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Implementation Cost</div>
                      <div className="font-semibold">{formatCurrency(recommendation.implementationCost)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            {multiScenarioComparison && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Best Scenario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(multiScenarioComparison.bestScenario.potentialSaving)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Potential savings per unit
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Worst Scenario
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(multiScenarioComparison.worstScenario.potentialSaving)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Potential savings per unit
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {multiScenarioComparison.recommendations.map((rec, index) => (
                        <Alert key={index}>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Risk Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {multiScenarioComparison.riskAnalysis.map((risk, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{risk}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Selected Scenario Details Modal */}
      {selectedScenario && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scenario Details: {selectedScenario.name}</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedScenario(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Cost Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Product Value:</span>
                    <span>{formatCurrency(selectedScenario.baselineCalculation.productValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duty (Current):</span>
                    <span>{formatCurrency(selectedScenario.baselineCalculation.dutyAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duty (Optimized):</span>
                    <span>{formatCurrency(selectedScenario.optimizedCalculation.dutyAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total Savings:</span>
                    <span className="text-green-600">
                      {formatCurrency(selectedScenario.savingsBreakdown.totalSavingsPerUnit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Implementation Requirements</h4>
                <div className="space-y-2">
                  {selectedScenario.implementationRequirements.map((req, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{req.description}</span>
                        <Badge variant="outline">{req.complexity}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Cost: {formatCurrency(req.estimatedCost)} • Time: {req.timeRequired}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}