"use client"

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Calculator, 
  Package, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FBAFeeData {
  fulfillmentFee: number
  storageFee: number
  referralFee: number
  totalFee: number
  sizeTier: string
  lastCalculated: string
}

interface ProductDimensions {
  length: number
  width: number
  height: number
  weight: number
  category: string
  asin?: string
}

interface FBAFeeInputProps {
  value?: FBAFeeData | null
  onChange?: (feeData: FBAFeeData | null) => void
  productPrice?: number
  initialDimensions?: Partial<ProductDimensions>
  disabled?: boolean
  required?: boolean
  className?: string
}

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics', referralRate: 8 },
  { value: 'clothing', label: 'Clothing & Accessories', referralRate: 17 },
  { value: 'home-garden', label: 'Home & Garden', referralRate: 15 },
  { value: 'sports', label: 'Sports & Outdoors', referralRate: 15 },
  { value: 'books', label: 'Books', referralRate: 15 },
  { value: 'toys', label: 'Toys & Games', referralRate: 15 },
  { value: 'health', label: 'Health & Personal Care', referralRate: 15 },
  { value: 'automotive', label: 'Automotive', referralRate: 12 },
  { value: 'other', label: 'Other', referralRate: 15 }
]

export function FBAFeeInput({ 
  value, 
  onChange, 
  productPrice,
  initialDimensions,
  disabled = false,
  required = false,
  className 
}: FBAFeeInputProps) {
  const [dimensions, setDimensions] = useState<ProductDimensions>({
    length: initialDimensions?.length || 0,
    width: initialDimensions?.width || 0,
    height: initialDimensions?.height || 0,
    weight: initialDimensions?.weight || 0,
    category: initialDimensions?.category || '',
    asin: initialDimensions?.asin || ''
  })
  
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualFee, setManualFee] = useState<number>(0)

  // Auto-calculate when dimensions change
  useEffect(() => {
    if (!manualEntry && dimensions.length && dimensions.width && dimensions.height && dimensions.weight && dimensions.category) {
      const timer = setTimeout(() => {
        calculateFees()
      }, 1000) // Debounce for 1 second
      
      return () => clearTimeout(timer)
    }
  }, [dimensions, manualEntry])

  const calculateFees = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.height || !dimensions.weight || !dimensions.category) {
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const response = await fetch('/api/amazon/calculate-fba-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...dimensions,
          productPrice
        })
      })

      if (!response.ok) {
        throw new Error('Failed to calculate FBA fees')
      }

      const result = await response.json()
      const feeData: FBAFeeData = {
        fulfillmentFee: result.fulfillmentFee,
        storageFee: result.storageFee,
        referralFee: result.referralFee,
        totalFee: result.totalFee,
        sizeTier: result.sizeTier || calculateSizeTier(),
        lastCalculated: new Date().toISOString()
      }
      
      onChange?.(feeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
      // Fallback to estimated calculation
      const estimatedFeeData = calculateEstimatedFees()
      onChange?.(estimatedFeeData)
    } finally {
      setIsCalculating(false)
    }
  }

  const calculateSizeTier = (): string => {
    const { length, width, height, weight } = dimensions
    
    if (length <= 15 && width <= 12 && height <= 0.75 && weight <= 1) {
      return 'Small Standard'
    } else if (length <= 18 && width <= 14 && height <= 8 && weight <= 20) {
      return 'Large Standard'
    } else if (length <= 60 && width <= 30 && height <= 30 && weight <= 70) {
      return 'Small Oversize'
    } else if (length <= 108 && width <= 108 && height <= 108 && weight <= 150) {
      return 'Medium Oversize'
    } else if (weight <= 150) {
      return 'Large Oversize'
    } else {
      return 'Special Oversize'
    }
  }

  const calculateEstimatedFees = (): FBAFeeData => {
    const { length, width, height, weight, category } = dimensions
    const volume = (length * width * height) / 1728 // cubic feet
    const sizeTier = calculateSizeTier()
    
    // Simplified fee calculation
    let fulfillmentFee = 0
    const storageFee = volume * 0.75 // $0.75 per cubic foot per month
    
    // Basic fulfillment fee estimation
    if (sizeTier.includes('Small Standard')) {
      fulfillmentFee = 3.22
    } else if (sizeTier.includes('Large Standard')) {
      fulfillmentFee = 4.09 + (weight > 1 ? (weight - 1) * 0.42 : 0)
    } else if (sizeTier.includes('Small Oversize')) {
      fulfillmentFee = 9.73 + (weight > 2 ? (weight - 2) * 0.42 : 0)
    } else if (sizeTier.includes('Medium Oversize')) {
      fulfillmentFee = 19.05 + (weight > 2 ? (weight - 2) * 0.42 : 0)
    } else if (sizeTier.includes('Large Oversize')) {
      fulfillmentFee = 103.69 + (weight > 90 ? (weight - 90) * 0.83 : 0)
    } else {
      fulfillmentFee = 158.49 + (weight > 90 ? (weight - 90) * 0.83 : 0)
    }
    
    // Calculate referral fee if product price is available
    let referralFee = 0
    if (productPrice) {
      const categoryData = PRODUCT_CATEGORIES.find(cat => cat.value === category)
      const referralRate = categoryData?.referralRate || 15
      referralFee = (productPrice * referralRate) / 100
    }
    
    const totalFee = fulfillmentFee + storageFee + referralFee
    
    return {
      fulfillmentFee,
      storageFee,
      referralFee,
      totalFee,
      sizeTier,
      lastCalculated: new Date().toISOString()
    }
  }

  const handleDimensionChange = (field: keyof ProductDimensions, newValue: string | number) => {
    setDimensions(prev => ({
      ...prev,
      [field]: typeof newValue === 'string' ? parseFloat(newValue) || 0 : newValue
    }))
  }

  const handleManualFeeChange = (newFee: number) => {
    setManualFee(newFee)
    if (manualEntry) {
      const feeData: FBAFeeData = {
        fulfillmentFee: newFee,
        storageFee: 0,
        referralFee: 0,
        totalFee: newFee,
        sizeTier: 'Manual Entry',
        lastCalculated: new Date().toISOString()
      }
      onChange?.(feeData)
    }
  }

  const toggleManualEntry = () => {
    setManualEntry(!manualEntry)
    if (!manualEntry) {
      // Switching to manual entry
      handleManualFeeChange(manualFee)
    } else {
      // Switching back to calculated
      calculateFees()
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            FBA Fee Information
            {required && <span className="text-red-500">*</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleManualEntry}
            disabled={disabled}
          >
            {manualEntry ? 'Auto Calculate' : 'Manual Entry'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {manualEntry ? (
          /* Manual Entry Mode */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-fee">Total FBA Fee (USD)</Label>
              <Input
                id="manual-fee"
                type="number"
                step="0.01"
                value={manualFee || ''}
                onChange={(e) => handleManualFeeChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={disabled}
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Manual entry mode. Enter the total FBA fee amount directly.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          /* Auto Calculate Mode */
          <div className="space-y-4">
            {/* Product Dimensions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="length" className="text-xs">Length (in)</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.1"
                  value={dimensions.length || ''}
                  onChange={(e) => handleDimensionChange('length', e.target.value)}
                  placeholder="0.0"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="width" className="text-xs">Width (in)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  value={dimensions.width || ''}
                  onChange={(e) => handleDimensionChange('width', e.target.value)}
                  placeholder="0.0"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="text-xs">Height (in)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={dimensions.height || ''}
                  onChange={(e) => handleDimensionChange('height', e.target.value)}
                  placeholder="0.0"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-xs">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={dimensions.weight || ''}
                  onChange={(e) => handleDimensionChange('weight', e.target.value)}
                  placeholder="0.0"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Category and ASIN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs">Product Category</Label>
                <Select 
                  value={dimensions.category} 
                  onValueChange={(newValue) => handleDimensionChange('category', newValue)}
                  disabled={disabled}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label} ({category.referralRate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asin" className="text-xs">ASIN (Optional)</Label>
                <Input
                  id="asin"
                  value={dimensions.asin || ''}
                  onChange={(e) => handleDimensionChange('asin', e.target.value)}
                  placeholder="B01234567X"
                  disabled={disabled}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Calculate Button */}
            <Button 
              onClick={calculateFees} 
              disabled={isCalculating || disabled || !dimensions.category}
              className="w-full"
              size="sm"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate FBA Fees
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Fee Display */}
        {value && (
          <div className="space-y-3">
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">FBA Fee Calculated</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {value.sizeTier}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-2 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Fulfillment</div>
                <div className="text-sm font-semibold">
                  ${value.fulfillmentFee.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Storage</div>
                <div className="text-sm font-semibold">
                  ${value.storageFee.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Referral</div>
                <div className="text-sm font-semibold">
                  ${value.referralFee.toFixed(2)}
                </div>
              </div>
              <div className="p-2 bg-primary/10 rounded border">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-sm font-bold text-primary">
                  ${value.totalFee.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              Last calculated: {new Date(value.lastCalculated).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}