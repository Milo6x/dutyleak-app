"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Trash2, 
  Copy, 
  Play, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calculator,
  Save,
  Download,
  Upload
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface ScenarioInput {
  id: string
  name: string
  productPrice: number
  dimensions: {
    length: number
    width: number
    height: number
    weight: number
  }
  category: string
  quantity: number
  shippingCost?: number
  customDuty?: number
  additionalFees?: number
}

interface ScenarioResult {
  id: string
  name: string
  totalCost: number
  fbaFees: {
    fulfillment: number
    storage: number
    referral: number
    total: number
  }
  landedCost: number
  profitMargin: number
  profitAmount: number
  roi: number
  breakEvenQuantity: number
}

interface ScenarioComparison {
  bestScenario: string
  worstScenario: string
  costDifference: number
  profitDifference: number
  recommendations: string[]
}

interface ScenarioModelerProps {
  className?: string
  onScenarioSave?: (scenario: ScenarioInput) => void
  onResultsGenerated?: (results: ScenarioResult[]) => void
}

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing & Accessories' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'sports', label: 'Sports & Outdoors' },
  { value: 'books', label: 'Books' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'health', label: 'Health & Personal Care' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' }
]

const DEFAULT_SCENARIO: Omit<ScenarioInput, 'id'> = {
  name: 'New Scenario',
  productPrice: 25.00,
  dimensions: {
    length: 10,
    width: 8,
    height: 2,
    weight: 1
  },
  category: 'electronics',
  quantity: 100,
  shippingCost: 0,
  customDuty: 0,
  additionalFees: 0
}

export function ScenarioModeler({ 
  className, 
  onScenarioSave, 
  onResultsGenerated 
}: ScenarioModelerProps) {
  const [scenarios, setScenarios] = useState<ScenarioInput[]>([])
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [activeTab, setActiveTab] = useState('scenarios')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize with one default scenario
    if (scenarios.length === 0) {
      addScenario()
    }
  }, [])

  const addScenario = () => {
    const newScenario: ScenarioInput = {
      ...DEFAULT_SCENARIO,
      id: `scenario-${Date.now()}`,
      name: `Scenario ${scenarios.length + 1}`
    }
    setScenarios([...scenarios, newScenario])
  }

  const removeScenario = (id: string) => {
    if (scenarios.length <= 1) {return} // Keep at least one scenario
    setScenarios(scenarios.filter(s => s.id !== id))
    setResults(results.filter(r => r.id !== id))
  }

  const duplicateScenario = (id: string) => {
    const scenario = scenarios.find(s => s.id === id)
    if (!scenario) {return}

    const duplicated: ScenarioInput = {
      ...scenario,
      id: `scenario-${Date.now()}`,
      name: `${scenario.name} (Copy)`
    }
    setScenarios([...scenarios, duplicated])
  }

  const updateScenario = (id: string, updates: Partial<ScenarioInput>) => {
    setScenarios(scenarios.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ))
  }

  const calculateScenarios = async () => {
    setIsCalculating(true)
    setError(null)

    try {
      const calculationPromises = scenarios.map(async (scenario) => {
        // Calculate FBA fees
        const fbaResponse = await fetch('/api/amazon/calculate-fba-fees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dimensions: scenario.dimensions,
            category: scenario.category,
            productPrice: scenario.productPrice
          })
        })

        let fbaFees = {
          fulfillment: 3.22,
          storage: 0.75,
          referral: scenario.productPrice * 0.15,
          total: 0
        }

        if (fbaResponse.ok) {
          const fbaData = await fbaResponse.json()
          fbaFees = fbaData.fees
        }

        fbaFees.total = fbaFees.fulfillment + fbaFees.storage + fbaFees.referral

        // Calculate landed cost
        const landedCost = scenario.productPrice + 
                          (scenario.shippingCost || 0) + 
                          (scenario.customDuty || 0) + 
                          (scenario.additionalFees || 0)

        // Calculate total cost per unit
        const totalCostPerUnit = landedCost + fbaFees.total

        // Calculate profit metrics
        const profitAmount = scenario.productPrice - totalCostPerUnit
        const profitMargin = (profitAmount / scenario.productPrice) * 100
        const roi = (profitAmount / totalCostPerUnit) * 100
        const breakEvenQuantity = Math.ceil(landedCost / profitAmount) || 0

        const result: ScenarioResult = {
          id: scenario.id,
          name: scenario.name,
          totalCost: totalCostPerUnit * scenario.quantity,
          fbaFees,
          landedCost,
          profitMargin,
          profitAmount,
          roi,
          breakEvenQuantity
        }

        return result
      })

      const calculatedResults = await Promise.all(calculationPromises)
      setResults(calculatedResults)
      
      // Generate comparison
      generateComparison(calculatedResults)
      
      // Notify parent component
      onResultsGenerated?.(calculatedResults)
      
      setActiveTab('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }

  const generateComparison = (results: ScenarioResult[]) => {
    if (results.length < 2) {
      setComparison(null)
      return
    }

    const sortedByProfit = [...results].sort((a, b) => b.profitAmount - a.profitAmount)
    const best = sortedByProfit[0]
    const worst = sortedByProfit[sortedByProfit.length - 1]

    const recommendations: string[] = []
    
    if (best.profitMargin > 20) {
      recommendations.push('Consider increasing quantity for the best performing scenario')
    }
    
    if (worst.profitMargin < 10) {
      recommendations.push('Review pricing strategy for low-margin scenarios')
    }
    
    const avgROI = results.reduce((sum, r) => sum + r.roi, 0) / results.length
    if (avgROI < 15) {
      recommendations.push('Consider optimizing product dimensions to reduce FBA fees')
    }

    setComparison({
      bestScenario: best.name,
      worstScenario: worst.name,
      costDifference: worst.totalCost - best.totalCost,
      profitDifference: best.profitAmount - worst.profitAmount,
      recommendations
    })
  }

  const saveScenarios = () => {
    scenarios.forEach(scenario => {
      onScenarioSave?.(scenario)
    })
    
    // Also save to localStorage
    localStorage.setItem('dutyleak-scenarios', JSON.stringify(scenarios))
  }

  const loadScenarios = () => {
    try {
      const saved = localStorage.getItem('dutyleak-scenarios')
      if (saved) {
        const parsedScenarios = JSON.parse(saved)
        setScenarios(parsedScenarios)
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err)
    }
  }

  const exportResults = () => {
    if (results.length === 0) {return}

    const csvContent = [
      ['Scenario', 'Total Cost', 'Landed Cost', 'FBA Fees', 'Profit Amount', 'Profit Margin %', 'ROI %', 'Break Even Qty'].join(','),
      ...results.map(result => [
        result.name,
        result.totalCost.toFixed(2),
        result.landedCost.toFixed(2),
        result.fbaFees.total.toFixed(2),
        result.profitAmount.toFixed(2),
        result.profitMargin.toFixed(2),
        result.roi.toFixed(2),
        result.breakEvenQuantity.toString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scenario-analysis-${new Date().toISOString().split('T')[0]}.csv`
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Scenario Modeler
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadScenarios}
            >
              <Upload className="h-4 w-4 mr-1" />
              Load
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveScenarios}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            {results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportResults}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Model different scenarios to compare costs, fees, and profitability
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scenarios">Scenarios ({scenarios.length})</TabsTrigger>
            <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Configure Scenarios</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addScenario}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Scenario
                </Button>
                <Button
                  onClick={calculateScenarios}
                  disabled={isCalculating || scenarios.length === 0}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isCalculating ? 'Calculating...' : 'Calculate All'}
                </Button>
              </div>
            </div>

            {isCalculating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Calculating scenarios...</span>
                  <span>Processing {scenarios.length} scenarios</span>
                </div>
                <Progress value={33} className="w-full" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {scenarios.map((scenario, index) => (
                <Card key={scenario.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        value={scenario.name}
                        onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                        className="font-medium max-w-xs"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateScenario(scenario.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeScenario(scenario.id)}
                          disabled={scenarios.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Product Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={scenario.productPrice}
                          onChange={(e) => updateScenario(scenario.id, { productPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={scenario.category}
                          onValueChange={(value) => updateScenario(scenario.id, { category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={scenario.quantity}
                          onChange={(e) => updateScenario(scenario.id, { quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Shipping Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={scenario.shippingCost || 0}
                          onChange={(e) => updateScenario(scenario.id, { shippingCost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Length (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={scenario.dimensions.length}
                          onChange={(e) => updateScenario(scenario.id, {
                            dimensions: { ...scenario.dimensions, length: parseFloat(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Width (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={scenario.dimensions.width}
                          onChange={(e) => updateScenario(scenario.id, {
                            dimensions: { ...scenario.dimensions, width: parseFloat(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (in)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={scenario.dimensions.height}
                          onChange={(e) => updateScenario(scenario.id, {
                            dimensions: { ...scenario.dimensions, height: parseFloat(e.target.value) || 0 }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Weight (lbs)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={scenario.dimensions.weight}
                          onChange={(e) => updateScenario(scenario.id, {
                            dimensions: { ...scenario.dimensions, weight: parseFloat(e.target.value) || 0 }
                          })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Custom Duty</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={scenario.customDuty || 0}
                          onChange={(e) => updateScenario(scenario.id, { customDuty: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Additional Fees</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={scenario.additionalFees || 0}
                          onChange={(e) => updateScenario(scenario.id, { additionalFees: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results yet. Configure scenarios and click &quot;Calculate All&quot; to see results.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{result.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.profitMargin > 20 ? 'default' : result.profitMargin > 10 ? 'secondary' : 'destructive'}>
                            {formatPercentage(result.profitMargin)} margin
                          </Badge>
                          <Badge variant="outline">
                            {formatPercentage(result.roi)} ROI
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{formatCurrency(result.totalCost)}</div>
                          <div className="text-sm text-muted-foreground">Total Cost</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{formatCurrency(result.fbaFees.total)}</div>
                          <div className="text-sm text-muted-foreground">FBA Fees</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{formatCurrency(result.profitAmount)}</div>
                          <div className="text-sm text-muted-foreground">Profit/Unit</div>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{result.breakEvenQuantity}</div>
                          <div className="text-sm text-muted-foreground">Break Even Qty</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span>Fulfillment Fee:</span>
                          <span>{formatCurrency(result.fbaFees.fulfillment)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Storage Fee:</span>
                          <span>{formatCurrency(result.fbaFees.storage)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Referral Fee:</span>
                          <span>{formatCurrency(result.fbaFees.referral)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {!comparison ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Add at least 2 scenarios and calculate results to see comparison.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-green-200 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Best Scenario</span>
                    </div>
                    <div className="text-lg font-bold text-green-900">{comparison.bestScenario}</div>
                  </Card>
                  
                  <Card className="p-4 border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-800">Needs Improvement</span>
                    </div>
                    <div className="text-lg font-bold text-red-900">{comparison.worstScenario}</div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(comparison.costDifference)}</div>
                    <div className="text-sm text-muted-foreground">Cost Difference</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{formatCurrency(comparison.profitDifference)}</div>
                    <div className="text-sm text-muted-foreground">Profit Difference</div>
                  </div>
                </div>

                {comparison.recommendations.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3">Recommendations</h4>
                    <ul className="space-y-2">
                      {comparison.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}