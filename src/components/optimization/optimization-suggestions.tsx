"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Lightbulb, 
  TrendingUp, 
  DollarSign,
  Package,
  Truck,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  RefreshCw,
  Filter,
  ArrowRight,
  Star
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface OptimizationSuggestion {
  id: string
  type: 'cost-reduction' | 'pricing' | 'dimensions' | 'category' | 'shipping' | 'inventory'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: {
    costSavings?: number
    revenueIncrease?: number
    marginImprovement?: number
    timeToImplement: string
    difficulty: 'easy' | 'medium' | 'hard'
  }
  currentValue?: string | number
  suggestedValue?: string | number
  reasoning: string[]
  actionItems: string[]
  relatedProducts?: string[]
  implementationSteps?: string[]
}

interface OptimizationData {
  productId?: string
  currentMetrics: {
    totalCost: number
    fbaFees: number
    profitMargin: number
    roi: number
    dimensions: {
      length: number
      width: number
      height: number
      weight: number
    }
    category: string
    price: number
  }
}

interface OptimizationSuggestionsProps {
  data?: OptimizationData
  className?: string
  onSuggestionApply?: (suggestion: OptimizationSuggestion) => void
  onRefresh?: () => void
}

const SUGGESTION_TYPES = [
  { value: 'all', label: 'All Suggestions' },
  { value: 'cost-reduction', label: 'Cost Reduction' },
  { value: 'pricing', label: 'Pricing Strategy' },
  { value: 'dimensions', label: 'Product Dimensions' },
  { value: 'category', label: 'Category Optimization' },
  { value: 'shipping', label: 'Shipping & Logistics' },
  { value: 'inventory', label: 'Inventory Management' }
]

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' }
]

export function OptimizationSuggestions({ 
  data, 
  className, 
  onSuggestionApply, 
  onRefresh 
}: OptimizationSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([])
  const [filteredSuggestions, setFilteredSuggestions] = useState<OptimizationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('suggestions')

  const applyFilters = () => {
    let filtered = [...suggestions]

    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => s.type === typeFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(s => s.priority === priorityFilter)
    }

    // Sort by priority and impact
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      const aImpact = (a.impact.costSavings || 0) + (a.impact.revenueIncrease || 0)
      const bImpact = (b.impact.costSavings || 0) + (b.impact.revenueIncrease || 0)
      
      return bImpact - aImpact
    })

    setFilteredSuggestions(filtered)
  }

  useEffect(() => {
    generateSuggestions()
  }, [data])

  useEffect(() => {
    applyFilters()
  }, [suggestions, typeFilter, priorityFilter])

  const generateSuggestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (data) {
        // Try to fetch AI-generated suggestions
        const response = await fetch('/api/optimization/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          const result = await response.json()
          if (result.suggestions) {
            setSuggestions(result.suggestions || [])
          } else {
            throw new Error('Failed to fetch suggestions')
          }
        } else {
          // No product data available
          setSuggestions([])
          setError('No product data available for optimization')
        }
      }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }

  const generateMockSuggestions = (): OptimizationSuggestion[] => {
    const currentMetrics = data?.currentMetrics || {
      totalCost: 15.50,
      fbaFees: 6.47,
      profitMargin: 18.5,
      roi: 22.3,
      dimensions: { length: 12, width: 8, height: 3, weight: 1.5 },
      category: 'electronics',
      price: 25.00
    }

    return [
      {
        id: 'dim-optimization-1',
        type: 'dimensions',
        priority: 'high',
        title: 'Optimize Package Dimensions',
        description: 'Reduce package size to move from Large Standard to Small Standard size tier',
        impact: {
          costSavings: 1.25,
          marginImprovement: 5.2,
          timeToImplement: '1-2 weeks',
          difficulty: 'medium'
        },
        currentValue: `${currentMetrics.dimensions.length}" × ${currentMetrics.dimensions.width}" × ${currentMetrics.dimensions.height}"`,
        suggestedValue: '10" × 7" × 2.5"',
        reasoning: [
          'Current dimensions qualify for Large Standard size tier ($4.09 fulfillment fee)',
          'Reducing to suggested dimensions would qualify for Small Standard ($3.22 fulfillment fee)',
          'Potential savings of $0.87 per unit in fulfillment fees'
        ],
        actionItems: [
          'Review product packaging design',
          'Consider alternative packaging materials',
          'Test new packaging with sample shipments',
          'Update product listings with new dimensions'
        ],
        implementationSteps: [
          'Analyze current packaging efficiency',
          'Design new compact packaging',
          'Source new packaging materials',
          'Test and validate new packaging',
          'Roll out to all inventory'
        ]
      },
      {
        id: 'pricing-strategy-1',
        type: 'pricing',
        priority: 'high',
        title: 'Increase Product Price',
        description: 'Market analysis suggests room for 12% price increase without significant demand impact',
        impact: {
          revenueIncrease: 3.00,
          marginImprovement: 12.0,
          timeToImplement: 'Immediate',
          difficulty: 'easy'
        },
        currentValue: currentMetrics.price,
        suggestedValue: 28.00,
        reasoning: [
          'Competitor analysis shows average price 15% higher',
          'Product reviews indicate strong value perception',
          'Current profit margin has room for improvement',
          'Price elasticity analysis suggests low sensitivity'
        ],
        actionItems: [
          'Conduct A/B test with 5% price increase',
          'Monitor conversion rates and sales volume',
          'Gradually increase to target price',
          'Update all marketplace listings'
        ]
      },
      {
        id: 'category-optimization-1',
        type: 'category',
        priority: 'medium',
        title: 'Recategorize Product',
        description: 'Moving to a different category could reduce referral fees from 15% to 8%',
        impact: {
          costSavings: 1.75,
          marginImprovement: 7.0,
          timeToImplement: '3-5 days',
          difficulty: 'easy'
        },
        currentValue: 'Electronics (15% referral fee)',
        suggestedValue: 'Home & Garden (8% referral fee)',
        reasoning: [
          'Product features align with Home & Garden category',
          'Lower referral fee structure in target category',
          'Similar products successfully listed in Home & Garden',
          'No impact on search visibility expected'
        ],
        actionItems: [
          'Review Amazon category guidelines',
          'Update product listing category',
          'Monitor search ranking changes',
          'Adjust keywords for new category'
        ]
      },
      {
        id: 'inventory-optimization-1',
        type: 'inventory',
        priority: 'medium',
        title: 'Optimize Inventory Levels',
        description: 'Reduce storage fees by optimizing inventory turnover and seasonal planning',
        impact: {
          costSavings: 0.45,
          marginImprovement: 1.8,
          timeToImplement: '2-4 weeks',
          difficulty: 'medium'
        },
        currentValue: '90 days average storage',
        suggestedValue: '45 days average storage',
        reasoning: [
          'Current inventory levels exceed optimal turnover rate',
          'Storage fees accumulate significantly over time',
          'Demand forecasting shows more predictable patterns',
          'Just-in-time inventory could reduce costs'
        ],
        actionItems: [
          'Implement demand forecasting system',
          'Set up automated reorder points',
          'Negotiate better shipping terms with suppliers',
          'Monitor inventory velocity metrics'
        ]
      },
      {
        id: 'shipping-optimization-1',
        type: 'shipping',
        priority: 'low',
        title: 'Negotiate Better Shipping Rates',
        description: 'Consolidate shipments and negotiate volume discounts with freight forwarders',
        impact: {
          costSavings: 0.75,
          marginImprovement: 3.0,
          timeToImplement: '4-6 weeks',
          difficulty: 'hard'
        },
        currentValue: '$2.50 per unit shipping cost',
        suggestedValue: '$1.75 per unit shipping cost',
        reasoning: [
          'Current shipping volume qualifies for better rates',
          'Multiple freight forwarders available for comparison',
          'Consolidation opportunities with other products',
          'Long-term contracts could secure better pricing'
        ],
        actionItems: [
          'Request quotes from 3+ freight forwarders',
          'Analyze consolidation opportunities',
          'Negotiate volume-based pricing tiers',
          'Implement new shipping procedures'
        ]
      }
    ]
  }



  const applySuggestion = (suggestion: OptimizationSuggestion) => {
    setAppliedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.id)))
    onSuggestionApply?.(suggestion)
  }

  const calculateTotalImpact = () => {
    return filteredSuggestions.reduce((total, suggestion) => {
      if (appliedSuggestions.has(suggestion.id)) {return total}
      
      return total + (suggestion.impact.costSavings || 0) + (suggestion.impact.revenueIncrease || 0)
    }, 0)
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low': return <Target className="h-4 w-4 text-green-500" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost-reduction': return <DollarSign className="h-4 w-4" />
      case 'pricing': return <TrendingUp className="h-4 w-4" />
      case 'dimensions': return <Package className="h-4 w-4" />
      case 'category': return <BarChart3 className="h-4 w-4" />
      case 'shipping': return <Truck className="h-4 w-4" />
      case 'inventory': return <Package className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'hard': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Analyzing optimization opportunities...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Optimization Suggestions
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                generateSuggestions()
                onRefresh?.()
              }}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          AI-powered recommendations to improve profitability and reduce costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suggestions">Suggestions ({filteredSuggestions.length})</TabsTrigger>
            <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUGGESTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_FILTERS.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Impact Summary */}
            {filteredSuggestions.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Total Potential Impact</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(calculateTotalImpact())}
                    </div>
                    <div className="text-sm text-blue-600">per unit improvement</div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Suggestions List */}
            {filteredSuggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No optimization suggestions found for the current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSuggestions.map((suggestion) => {
                  const isApplied = appliedSuggestions.has(suggestion.id)
                  
                  return (
                    <Card key={suggestion.id} className={`p-4 ${isApplied ? 'opacity-60 bg-gray-50' : ''}`}>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(suggestion.type)}
                              {getPriorityIcon(suggestion.priority)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{suggestion.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {suggestion.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'default' : 'secondary'}>
                              {suggestion.priority} priority
                            </Badge>
                            {isApplied && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Impact Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {suggestion.impact.costSavings && (
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-700">
                                {formatCurrency(suggestion.impact.costSavings)}
                              </div>
                              <div className="text-xs text-green-600">Cost Savings</div>
                            </div>
                          )}
                          {suggestion.impact.revenueIncrease && (
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-700">
                                {formatCurrency(suggestion.impact.revenueIncrease)}
                              </div>
                              <div className="text-xs text-blue-600">Revenue Increase</div>
                            </div>
                          )}
                          {suggestion.impact.marginImprovement && (
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-lg font-bold text-purple-700">
                                +{formatPercentage(suggestion.impact.marginImprovement)}
                              </div>
                              <div className="text-xs text-purple-600">Margin Improvement</div>
                            </div>
                          )}
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-gray-700">
                              {suggestion.impact.timeToImplement}
                            </div>
                            <div className={`text-xs ${getDifficultyColor(suggestion.impact.difficulty)}`}>
                              {suggestion.impact.difficulty} difficulty
                            </div>
                          </div>
                        </div>

                        {/* Current vs Suggested Values */}
                        {suggestion.currentValue && suggestion.suggestedValue && (
                          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground">Current</div>
                              <div className="font-medium">{suggestion.currentValue}</div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground">Suggested</div>
                              <div className="font-medium text-green-700">{suggestion.suggestedValue}</div>
                            </div>
                          </div>
                        )}

                        {/* Reasoning */}
                        <div>
                          <h5 className="font-medium mb-2">Why this matters:</h5>
                          <ul className="space-y-1">
                            {suggestion.reasoning.map((reason, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Action Items */}
                        <div>
                          <h5 className="font-medium mb-2">Action items:</h5>
                          <ul className="space-y-1">
                            {suggestion.actionItems.map((item, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Apply Button */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => applySuggestion(suggestion)}
                            disabled={isApplied}
                            variant={isApplied ? "outline" : "default"}
                          >
                            {isApplied ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Applied
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-1" />
                                Apply Suggestion
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="impact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(filteredSuggestions.reduce((sum, s) => sum + (s.impact.costSavings || 0), 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Cost Savings</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(filteredSuggestions.reduce((sum, s) => sum + (s.impact.revenueIncrease || 0), 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Revenue Potential</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercentage(filteredSuggestions.reduce((sum, s) => sum + (s.impact.marginImprovement || 0), 0))}
                  </div>
                  <div className="text-sm text-muted-foreground">Margin Improvement</div>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h4 className="font-semibold mb-4">Implementation Timeline</h4>
              <div className="space-y-3">
                {['Immediate', '1-2 weeks', '2-4 weeks', '4-6 weeks'].map(timeframe => {
                  const suggestions = filteredSuggestions.filter(s => s.impact.timeToImplement === timeframe)
                  if (suggestions.length === 0) {return null}
                  
                  return (
                    <div key={timeframe} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">{timeframe}</div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map(s => (
                            <Badge key={s.id} variant="outline">{s.title}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}