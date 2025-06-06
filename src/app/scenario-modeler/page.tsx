'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Calculator, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Lightbulb,
  FileText,
  Download,
  Share,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { EnhancedScenarioModeler } from '@/components/duty/enhanced-scenario-modeler'
import { ScenarioModeler } from '@/components/scenario/scenario-modeler'
import ScenarioManagementUI from '@/components/scenario/scenario-management-ui'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { EnhancedScenario } from '@/types/scenario'
import { Database } from '@/lib/database.types'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface Product {
  id: string
  title: string
  cost: number | null
  category: string | null
  description: string | null
}

interface ScenarioTemplate {
  id: string
  name: string
  description: string
  configuration: any
  category: 'optimization' | 'comparison' | 'analysis'
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'cost-optimization',
    name: 'Cost Optimization',
    description: 'Find the most cost-effective shipping and classification options',
    category: 'optimization',
    configuration: {
      includeShippingVariations: true,
      includeOriginCountryVariations: true,
      includeClassificationVariations: true,
      includeTradeAgreements: true,
      includeFBAOptimizations: true,
      analysisDepth: 'comprehensive'
    }
  },
  {
    id: 'multi-country-analysis',
    name: 'Multi-Country Analysis',
    description: 'Compare costs across different destination countries',
    category: 'comparison',
    configuration: {
      includeShippingVariations: false,
      includeOriginCountryVariations: false,
      includeClassificationVariations: false,
      includeTradeAgreements: true,
      includeFBAOptimizations: true,
      analysisDepth: 'basic'
    }
  },
  {
    id: 'classification-impact',
    name: 'Classification Impact',
    description: 'Analyze the impact of different HS code classifications',
    category: 'analysis',
    configuration: {
      includeShippingVariations: false,
      includeOriginCountryVariations: false,
      includeClassificationVariations: true,
      includeTradeAgreements: true,
      includeFBAOptimizations: false,
      analysisDepth: 'comprehensive'
    }
  },
  {
    id: 'fba-optimization',
    name: 'FBA Optimization',
    description: 'Optimize for Amazon FBA fulfillment costs',
    category: 'optimization',
    configuration: {
      includeShippingVariations: true,
      includeOriginCountryVariations: true,
      includeClassificationVariations: false,
      includeTradeAgreements: false,
      includeFBAOptimizations: true,
      analysisDepth: 'comprehensive'
    }
  }
]

export default function ScenarioModelerPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTemplate, setActiveTemplate] = useState<ScenarioTemplate | null>(null)
  const [activeTab, setActiveTab] = useState('enhanced')
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false)
  const [selectedScenariosForComparison, setSelectedScenariosForComparison] = useState<EnhancedScenario[]>([])
  const [currentScenarioState, setCurrentScenarioState] = useState<any>(null)
  
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in to access scenario modeling')
        return
      }

      const { data, error }: {
        data: Array<{
          id: string;
          title: string;
          cost: number | null;
          category: string | null;
          description: string | null;
        }> | null;
        error: any;
      } = await supabase
        .from('products')
        .select('id, title, cost, category, description')
        .eq('workspace_id', user.id)
        .limit(50)

      if (error) {throw error}
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = (template: ScenarioTemplate) => {
    setActiveTemplate(template)
    toast.success(`Applied ${template.name} template`)
  }

  const handleProductSelection = (productId: string, selected: boolean) => {
    if (selected) {
      setSelectedProducts(prev => [...prev, productId])
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    }
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const handleBatchAnalysisComplete = (analysis: any) => {
    setAnalysisResults(analysis)
    setIsAnalysisRunning(false)
    
    // Update current scenario state for saving
    setCurrentScenarioState({
      selectedProducts,
      activeTemplate,
      analysisResults: analysis,
      timestamp: new Date().toISOString()
    })
    
    toast.success('Batch analysis completed successfully')
  }
  
  const handleScenarioLoad = (scenario: EnhancedScenario) => {
    try {
      const config = scenario.configuration as any
      if (config) {
        // Load scenario configuration
        if (config.selectedProducts) {
          setSelectedProducts(config.selectedProducts)
        }
        if (config.activeTemplate) {
          setActiveTemplate(config.activeTemplate)
        }
        if (config.analysisResults) {
          setAnalysisResults(config.analysisResults)
        }
        
        setCurrentScenarioState(config)
        toast.success(`Loaded scenario: ${scenario.name}`)
      }
    } catch (error) {
      console.error('Error loading scenario:', error)
      toast.error('Failed to load scenario configuration')
    }
  }
  
  const handleScenariosSelect = (scenarios: EnhancedScenario[]) => {
    setSelectedScenariosForComparison(scenarios)
    if (scenarios.length === 2) {
      toast.success('Two scenarios selected for comparison')
    }
  }

  const handleExportResults = () => {
    if (!analysisResults) {
      toast.error('No analysis results to export')
      return
    }

    const dataStr = JSON.stringify(analysisResults, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `scenario-analysis-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Analysis results exported')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'optimization': return 'bg-green-100 text-green-800'
      case 'comparison': return 'bg-blue-100 text-blue-800'
      case 'analysis': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'optimization': return <Target className="h-4 w-4" />
      case 'comparison': return <BarChart3 className="h-4 w-4" />
      case 'analysis': return <TrendingUp className="h-4 w-4" />
      default: return <Calculator className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scenario modeler...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scenario Modeler</h1>
            <p className="text-gray-600 mt-1">
              Model and compare different duty calculation scenarios to optimize your costs
            </p>
          </div>
          <div className="flex items-center gap-3">
            {analysisResults && (
              <Button onClick={handleExportResults} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            )}
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Selected</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProducts.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Templates</p>
                  <p className="text-2xl font-bold text-gray-900">{SCENARIO_TEMPLATES.length}</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Analysis Status</p>
                  <p className="text-sm font-medium text-gray-900">
                    {isAnalysisRunning ? 'Running' : analysisResults ? 'Complete' : 'Ready'}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  isAnalysisRunning ? 'bg-yellow-100' : analysisResults ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {isAnalysisRunning ? (
                    <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full" />
                  ) : analysisResults ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <Play className="h-4 w-4 text-gray-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scenario Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Scenario Templates
            </CardTitle>
            <CardDescription>
              Choose a pre-configured template to get started quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SCENARIO_TEMPLATES.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    activeTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(template.category)}
                        <h3 className="font-medium text-sm">{template.name}</h3>
                      </div>
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Selection</CardTitle>
                <CardDescription>
                  Select products to include in your scenario analysis
                </CardDescription>
              </div>
              <Button 
                onClick={handleSelectAllProducts}
                variant="outline"
                size="sm"
              >
                {selectedProducts.length === products.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No products found. Please add products to your inventory first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {products.map((product) => (
                  <div 
                    key={product.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedProducts.includes(product.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleProductSelection(product.id, !selectedProducts.includes(product.id))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          Category: {product.category} | ${product.cost}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.description}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedProducts.includes(product.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedProducts.includes(product.id) && (
                          <div className="w-2 h-2 bg-white rounded-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scenario Management */}
        <ScenarioManagementUI
          currentState={currentScenarioState}
          onScenarioLoad={handleScenarioLoad}
          onScenariosSelect={handleScenariosSelect}
          maxSelectableScenarios={2}
          showComparison={true}
        />
        
        {/* Scenario Comparison Results */}
        {selectedScenariosForComparison.length === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Scenario Comparison
              </CardTitle>
              <CardDescription>
                Comparing: {selectedScenariosForComparison.map(s => s.name).join(' vs ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedScenariosForComparison.map((scenario, index) => (
                  <div key={scenario.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <h3 className="font-medium">{scenario.name}</h3>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Status:</span>
                          <Badge className={scenario.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {scenario.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Created:</span>
                          <span>{new Date(scenario.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => {
                    // TODO: Implement detailed comparison logic
                    toast.info('Detailed comparison feature coming soon')
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Run Detailed Comparison
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenario Modeler Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Scenario Analysis</CardTitle>
            <CardDescription>
              Choose your preferred modeling approach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="enhanced">Enhanced Modeler</TabsTrigger>
                <TabsTrigger value="basic">Basic Modeler</TabsTrigger>
              </TabsList>
              
              <TabsContent value="enhanced" className="mt-6">
                <EnhancedScenarioModeler
                  productIds={selectedProducts}
                  onBatchAnalysisComplete={handleBatchAnalysisComplete}
                />
              </TabsContent>
              
              <TabsContent value="basic" className="mt-6">
                <ScenarioModeler
                  onResultsGenerated={(results) => {
                    setAnalysisResults(results)
                    setCurrentScenarioState({
                      selectedProducts,
                      activeTemplate,
                      analysisResults: results,
                      timestamp: new Date().toISOString()
                    })
                    toast.success('Scenario analysis completed')
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Analysis Results Summary */}
        {analysisResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analysis Results
              </CardTitle>
              <CardDescription>
                Summary of your scenario analysis results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Total Savings</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    ${analysisResults.totalSavings?.toLocaleString() || '0'}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Scenarios Analyzed</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {analysisResults.totalScenarios || analysisResults.length || '0'}
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Avg ROI</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {analysisResults.averageROI?.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}