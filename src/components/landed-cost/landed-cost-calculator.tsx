'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calculator, TrendingUp, Package, Truck, Shield, DollarSign, Info, AlertTriangle, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LandedCostForm {
  productId?: string
  productValue: number
  hsCode: string
  quantity: number
  weight: number
  originCountry: string
  destinationCountry: string
  shippingMethod: string
  shippingCost?: number
  insuranceCost?: number
  includeInsurance: boolean
  insuranceValue?: number
  customsValue?: number
  fbaFeeAmount?: number
  useStoredFbaFee: boolean
  dimensions?: {
    length: number
    width: number
    height: number
  }
  category?: string
}

interface LandedCostResult {
  dutyAmount: number
  vatAmount: number
  fbaFeeAmount: number
  totalLandedCost: number
  effectiveDutyRate: number
  breakdown: {
    productValue: number
    shippingCost: number
    insuranceCost: number
    dutyableValue: number
    dutyAmount: number
    vatableValue: number
    vatAmount: number
    fbaFeeAmount: number
  }
}

interface AdvancedLandedCostResult {
  dutyRate: number
  dutyAmount: number
  taxRate: number
  taxAmount: number
  shippingCost: number
  insuranceCost: number
  brokerFees: number
  otherFees: number
  totalLandedCost: number
  savingsAmount?: number
  savingsPercentage?: number
  confidenceScore: number
  dataSource: string
  breakdown: {
    productValue: number
    quantity: number
    dutyableValue: number
    dutyCalculation: {
      rate: number
      amount: number
      basis: string
    }
    taxCalculation: {
      rate: number
      amount: number
      basis: string
    }
    fees: {
      shipping: number
      insurance: number
      broker: number
      other: number
    }
  }
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'CA', label: 'Canada' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'TH', label: 'Thailand' },
  { value: 'MX', label: 'Mexico' }
]

const SHIPPING_METHODS = [
  { value: 'standard', label: 'Standard Shipping' },
  { value: 'express', label: 'Express Shipping' },
  { value: 'economy', label: 'Economy Shipping' },
  { value: 'air', label: 'Air Freight' },
  { value: 'sea', label: 'Sea Freight' }
]

export function LandedCostCalculator() {
  const [activeTab, setActiveTab] = useState('basic')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [basicResult, setBasicResult] = useState<LandedCostResult | null>(null)
  const [advancedResult, setAdvancedResult] = useState<AdvancedLandedCostResult | null>(null)
  const [calculationHistory, setCalculationHistory] = useState<any[]>([])
  const [isCalculatingFba, setIsCalculatingFba] = useState(false)
  const [showFbaDimensions, setShowFbaDimensions] = useState(false)
  
  const [form, setForm] = useState<LandedCostForm>({
    productValue: 100,
    hsCode: '',
    quantity: 1,
    weight: 1,
    originCountry: 'CN',
    destinationCountry: 'US',
    shippingMethod: 'standard',
    includeInsurance: false,
    useStoredFbaFee: false,
    dimensions: {
      length: 0,
      width: 0,
      height: 0
    },
    category: ''
  })

  const updateForm = (field: keyof LandedCostForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const calculateFbaFee = async () => {
    if (!form.productId) {
      setError('Product ID is required for FBA fee calculation')
      return
    }

    setIsCalculatingFba(true)
    setError(null)

    try {
      const response = await fetch('/api/core/calculate-fba-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: form.productId,
          dimensions: form.dimensions,
          weight: form.weight,
          category: form.category
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate FBA fee')
      }

      updateForm('fbaFeeAmount', data.fbaFee)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate FBA fee')
    } finally {
      setIsCalculatingFba(false)
    }
  }

  const calculateBasicLandedCost = async () => {
    if (!form.productValue || form.productValue <= 0) {
      setError('Please enter a valid product value')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/core/calculate-landed-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: form.productId || 'temp-' + Date.now(),
          destinationCountry: form.destinationCountry,
          productValue: form.productValue,
          shippingCost: form.shippingCost || 0,
          insuranceCost: form.insuranceCost || 0,
          fbaFee: form.fbaFeeAmount,
          useStoredFbaFee: form.useStoredFbaFee,
          dimensions: form.dimensions,
          weight: form.weight,
          category: form.category
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate landed cost')
      }

      setBasicResult(data.landedCostDetails)
      
      // Add to history
      setCalculationHistory(prev => [{
        id: data.calculationId,
        type: 'basic',
        timestamp: new Date(),
        result: data.landedCostDetails,
        inputs: { ...form }
      }, ...prev.slice(0, 4)])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateAdvancedLandedCost = async () => {
    if (!form.productValue || form.productValue <= 0 || !form.hsCode) {
      setError('Please enter valid product value and HS code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/core/calculate-landed-cost/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: form.productId || 'temp-' + Date.now(),
          hsCode: form.hsCode,
          productValue: form.productValue,
          quantity: form.quantity,
          weight: form.weight,
          originCountry: form.originCountry,
          destinationCountry: form.destinationCountry,
          shippingMethod: form.shippingMethod,
          includeInsurance: form.includeInsurance,
          insuranceValue: form.insuranceValue,
          customsValue: form.customsValue,
          dimensions: form.dimensions,
          category: form.category
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate advanced landed cost')
      }

      setAdvancedResult(data.result)
      
      // Add to history
      setCalculationHistory(prev => [{
        id: data.calculationId,
        type: 'advanced',
        timestamp: new Date(),
        result: data.result,
        inputs: { ...form }
      }, ...prev.slice(0, 4)])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCalculationHistory = async () => {
    try {
      const response = await fetch('/api/core/calculate-landed-cost?limit=5')
      const data = await response.json()
      
      if (data.success) {
        setCalculationHistory(data.calculations.map((calc: any) => ({
          id: calc.id,
          type: 'basic',
          timestamp: new Date(calc.created_at),
          result: {
            totalLandedCost: calc.total_landed_cost,
            dutyAmount: calc.duty_amount,
            vatAmount: calc.vat_amount
          },
          productName: calc.products?.name
        })))
      }
    } catch (err) {
      console.error('Failed to load calculation history:', err)
    }
  }

  useEffect(() => {
    loadCalculationHistory()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Landed Cost Calculator</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Calculator</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Landed Cost Calculation
              </CardTitle>
              <CardDescription>
                Calculate landed cost with known duty rates and shipping costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productValue">Product Value ($)</Label>
                  <Input
                    id="productValue"
                    type="number"
                    value={form.productValue}
                    onChange={(e) => updateForm('productValue', parseFloat(e.target.value) || 0)}
                    placeholder="Enter product value"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destinationCountry">Destination Country</Label>
                  <Select value={form.destinationCountry} onValueChange={(value) => updateForm('destinationCountry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost ($)</Label>
                  <Input
                    id="shippingCost"
                    type="number"
                    value={form.shippingCost || ''}
                    onChange={(e) => updateForm('shippingCost', parseFloat(e.target.value) || 0)}
                    placeholder="Enter shipping cost"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceCost">Insurance Cost ($)</Label>
                  <Input
                    id="insuranceCost"
                    type="number"
                    value={form.insuranceCost || ''}
                    onChange={(e) => updateForm('insuranceCost', parseFloat(e.target.value) || 0)}
                    placeholder="Enter insurance cost"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fbaFeeAmount">FBA Fee ($)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="fbaFeeAmount"
                        type="number"
                        value={form.fbaFeeAmount || ''}
                        onChange={(e) => updateForm('fbaFeeAmount', parseFloat(e.target.value) || 0)}
                        placeholder="Enter FBA fee or calculate automatically"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={calculateFbaFee}
                        disabled={isCalculatingFba || !form.productId}
                        className="whitespace-nowrap"
                      >
                        {isCalculatingFba ? (
                          <LoadingSpinner className="h-4 w-4" />
                        ) : (
                          <Calculator className="h-4 w-4" />
                        )}
                        Calculate FBA
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="useStoredFbaFee"
                      checked={form.useStoredFbaFee}
                      onCheckedChange={(checked) => updateForm('useStoredFbaFee', checked)}
                    />
                    <Label htmlFor="useStoredFbaFee">Use stored FBA fee estimate</Label>
                  </div>

                  {/* Product Dimensions for FBA Calculation */}
                  <Collapsible open={showFbaDimensions} onOpenChange={setShowFbaDimensions}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <span className="text-sm text-muted-foreground">Product Dimensions (for FBA calculation)</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showFbaDimensions ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 mt-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="length" className="text-xs">Length (in)</Label>
                          <Input
                            id="length"
                            type="number"
                            step="0.1"
                            value={form.dimensions?.length || ''}
                            onChange={(e) => updateForm('dimensions', {
                              ...form.dimensions,
                              length: parseFloat(e.target.value) || 0
                            })}
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="width" className="text-xs">Width (in)</Label>
                          <Input
                            id="width"
                            type="number"
                            step="0.1"
                            value={form.dimensions?.width || ''}
                            onChange={(e) => updateForm('dimensions', {
                              ...form.dimensions,
                              width: parseFloat(e.target.value) || 0
                            })}
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="height" className="text-xs">Height (in)</Label>
                          <Input
                            id="height"
                            type="number"
                            step="0.1"
                            value={form.dimensions?.height || ''}
                            onChange={(e) => updateForm('dimensions', {
                              ...form.dimensions,
                              height: parseFloat(e.target.value) || 0
                            })}
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="weight" className="text-xs">Weight (lbs)</Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            value={form.weight || ''}
                            onChange={(e) => updateForm('weight', parseFloat(e.target.value) || 0)}
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="category" className="text-xs">Category</Label>
                          <Select
                            value={form.category || ''}
                            onValueChange={(value) => updateForm('category', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Electronics">Electronics</SelectItem>
                              <SelectItem value="Clothing">Clothing</SelectItem>
                              <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                              <SelectItem value="Sports">Sports</SelectItem>
                              <SelectItem value="Books">Books</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>

              <Button 
                onClick={calculateBasicLandedCost} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <LoadingSpinner className="mr-2" /> : <Calculator className="mr-2 h-4 w-4" />}
                Calculate Basic Landed Cost
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Advanced Landed Cost Calculation
              </CardTitle>
              <CardDescription>
                Comprehensive calculation with HS code lookup and detailed breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hsCode">HS Code</Label>
                  <Input
                    id="hsCode"
                    value={form.hsCode}
                    onChange={(e) => updateForm('hsCode', e.target.value)}
                    placeholder="e.g., 8517.12.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advancedProductValue">Product Value ($)</Label>
                  <Input
                    id="advancedProductValue"
                    type="number"
                    value={form.productValue}
                    onChange={(e) => updateForm('productValue', parseFloat(e.target.value) || 0)}
                    placeholder="Enter product value"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={form.quantity}
                    onChange={(e) => updateForm('quantity', parseInt(e.target.value) || 1)}
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={form.weight}
                    onChange={(e) => updateForm('weight', parseFloat(e.target.value) || 1)}
                    placeholder="Enter weight"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originCountry">Origin Country</Label>
                  <Select value={form.originCountry} onValueChange={(value) => updateForm('originCountry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advancedDestinationCountry">Destination Country</Label>
                  <Select value={form.destinationCountry} onValueChange={(value) => updateForm('destinationCountry', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shippingMethod">Shipping Method</Label>
                  <Select value={form.shippingMethod} onValueChange={(value) => updateForm('shippingMethod', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping method" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPPING_METHODS.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customsValue">Customs Value ($)</Label>
                  <Input
                    id="customsValue"
                    type="number"
                    value={form.customsValue || ''}
                    onChange={(e) => updateForm('customsValue', parseFloat(e.target.value) || undefined)}
                    placeholder="Optional customs value"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeInsurance"
                    checked={form.includeInsurance}
                    onCheckedChange={(checked) => updateForm('includeInsurance', checked)}
                  />
                  <Label htmlFor="includeInsurance">Include Insurance</Label>
                </div>

                {form.includeInsurance && (
                  <div className="space-y-2">
                    <Label htmlFor="insuranceValue">Insurance Value ($)</Label>
                    <Input
                      id="insuranceValue"
                      type="number"
                      value={form.insuranceValue || ''}
                      onChange={(e) => updateForm('insuranceValue', parseFloat(e.target.value) || undefined)}
                      placeholder="Insurance value"
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={calculateAdvancedLandedCost} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <LoadingSpinner className="mr-2" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                Calculate Advanced Landed Cost
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {(basicResult || advancedResult) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'basic' && basicResult && (
              <BasicResultsDisplay result={basicResult} />
            )}
            {activeTab === 'advanced' && advancedResult && (
              <AdvancedResultsDisplay result={advancedResult} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Calculation History */}
      {calculationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Recent Calculations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calculationHistory.map((calc, index) => (
                <div key={calc.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {calc.productName || `${calc.type} calculation`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {calc.timestamp.toLocaleDateString()} at {calc.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {formatCurrency(calc.result.totalLandedCost)}
                    </div>
                    <Badge variant={calc.type === 'advanced' ? 'default' : 'secondary'}>
                      {calc.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BasicResultsDisplay({ result }: { result: LandedCostResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(result.totalLandedCost)}
          </div>
          <div className="text-sm text-blue-600">Total Landed Cost</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(result.dutyAmount)}
          </div>
          <div className="text-sm text-green-600">Duty Amount</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">
            {formatCurrency(result.vatAmount)}
          </div>
          <div className="text-sm text-purple-600">VAT/Tax Amount</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-700">
            {result.effectiveDutyRate.toFixed(2)}%
          </div>
          <div className="text-sm text-orange-600">Effective Duty Rate</div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-3">Cost Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Product Value:</span>
            <span>{formatCurrency(result.breakdown.productValue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping Cost:</span>
            <span>{formatCurrency(result.breakdown.shippingCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Insurance Cost:</span>
            <span>{formatCurrency(result.breakdown.insuranceCost)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Dutyable Value:</span>
            <span>{formatCurrency(result.breakdown.dutyableValue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Duty Amount:</span>
            <span>{formatCurrency(result.breakdown.dutyAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT Amount:</span>
            <span>{formatCurrency(result.breakdown.vatAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>FBA Fee:</span>
            <span>{formatCurrency(result.breakdown.fbaFeeAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total Landed Cost:</span>
            <span>{formatCurrency(result.totalLandedCost)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdvancedResultsDisplay({ result }: { result: AdvancedLandedCostResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(result.totalLandedCost)}
          </div>
          <div className="text-sm text-blue-600">Total Landed Cost</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">
            {result.savingsAmount ? formatCurrency(result.savingsAmount) : 'N/A'}
          </div>
          <div className="text-sm text-green-600">Potential Savings</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">
            {result.savingsPercentage ? `${result.savingsPercentage.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-sm text-purple-600">Savings Percentage</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-700">
            {(result.confidenceScore * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-orange-600">Confidence Score</div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-3">Duty & Tax Calculation</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Duty Rate:</span>
              <span>{result.dutyRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Duty Amount:</span>
              <span>{formatCurrency(result.dutyAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Rate:</span>
              <span>{result.taxRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Amount:</span>
              <span>{formatCurrency(result.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Duty Basis:</span>
              <span>{result.breakdown.dutyCalculation.basis}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax Basis:</span>
              <span>{result.breakdown.taxCalculation.basis}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Fees & Charges</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Shipping Cost:</span>
              <span>{formatCurrency(result.breakdown.fees.shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance Cost:</span>
              <span>{formatCurrency(result.breakdown.fees.insurance)}</span>
            </div>
            <div className="flex justify-between">
              <span>Broker Fees:</span>
              <span>{formatCurrency(result.breakdown.fees.broker)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Fees:</span>
              <span>{formatCurrency(result.breakdown.fees.other)}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Data Source:</span>
              <span>{result.dataSource}</span>
            </div>


          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-3">Complete Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Product Value (x{result.breakdown.quantity}):</span>
            <span>{formatCurrency(result.breakdown.productValue * result.breakdown.quantity)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Dutyable Value:</span>
            <span>{formatCurrency(result.breakdown.dutyableValue)}</span>
          </div>
          <div className="flex justify-between">
            <span>+ Duty ({result.dutyRate.toFixed(2)}%):</span>
            <span>{formatCurrency(result.dutyAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>+ Tax ({result.taxRate.toFixed(2)}%):</span>
            <span>{formatCurrency(result.taxAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>+ Broker Fees:</span>
            <span>{formatCurrency(result.brokerFees)}</span>
          </div>
          <div className="flex justify-between">
            <span>+ Other Fees:</span>
            <span>{formatCurrency(result.otherFees)}</span>
          </div>

          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total Landed Cost:</span>
            <span>{formatCurrency(result.totalLandedCost)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}