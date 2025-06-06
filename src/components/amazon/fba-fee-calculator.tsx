"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calculator, Package, DollarSign, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FBAFeeBreakdown {
  fulfillmentFee: number
  storageFee: number
  referralFee: number
  totalFee: number
  currency: string
}

interface ProductDimensions {
  length: number
  width: number
  height: number
  weight: number
  category: string
  asin?: string
}

interface FBAFeeCalculatorProps {
  onFeeCalculated?: (fee: FBAFeeBreakdown) => void
  initialDimensions?: Partial<ProductDimensions>
  className?: string
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

const SIZE_TIERS = {
  'small-standard': { maxLength: 15, maxWidth: 12, maxHeight: 0.75, maxWeight: 1 },
  'large-standard': { maxLength: 18, maxWidth: 14, maxHeight: 8, maxWeight: 20 },
  'small-oversize': { maxLength: 60, maxWidth: 30, maxHeight: 30, maxWeight: 70 },
  'medium-oversize': { maxLength: 108, maxWidth: 108, maxHeight: 108, maxWeight: 150 },
  'large-oversize': { maxLength: 108, maxWidth: 108, maxHeight: 108, maxWeight: 150 },
  'special-oversize': { maxLength: 270, maxWidth: 270, maxHeight: 270, maxWeight: 1000 }
}

export function FBAFeeCalculator({ onFeeCalculated, initialDimensions, className }: FBAFeeCalculatorProps) {
  const [dimensions, setDimensions] = useState<ProductDimensions>({
    length: initialDimensions?.length || 0,
    width: initialDimensions?.width || 0,
    height: initialDimensions?.height || 0,
    weight: initialDimensions?.weight || 0,
    category: initialDimensions?.category || '',
    asin: initialDimensions?.asin || ''
  })
  
  const [feeBreakdown, setFeeBreakdown] = useState<FBAFeeBreakdown | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sizeTier, setSizeTier] = useState<string>('')

  // Calculate size tier based on dimensions
  useEffect(() => {
    if (dimensions.length && dimensions.width && dimensions.height && dimensions.weight) {
      const { length, width, height, weight } = dimensions
      
      if (length <= 15 && width <= 12 && height <= 0.75 && weight <= 1) {
        setSizeTier('Small Standard')
      } else if (length <= 18 && width <= 14 && height <= 8 && weight <= 20) {
        setSizeTier('Large Standard')
      } else if (length <= 60 && width <= 30 && height <= 30 && weight <= 70) {
        setSizeTier('Small Oversize')
      } else if (length <= 108 && width <= 108 && height <= 108 && weight <= 150) {
        setSizeTier('Medium Oversize')
      } else if (weight <= 150) {
        setSizeTier('Large Oversize')
      } else {
        setSizeTier('Special Oversize')
      }
    }
  }, [dimensions])

  const calculateFees = async () => {
    if (!dimensions.length || !dimensions.width || !dimensions.height || !dimensions.weight || !dimensions.category) {
      setError('Please fill in all required fields')
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
        body: JSON.stringify(dimensions)
      })

      if (!response.ok) {
        throw new Error('Failed to calculate FBA fees')
      }

      const breakdown: FBAFeeBreakdown = await response.json()
      setFeeBreakdown(breakdown)
      onFeeCalculated?.(breakdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Fallback to estimated calculation
      const estimatedBreakdown = calculateEstimatedFees()
      setFeeBreakdown(estimatedBreakdown)
      onFeeCalculated?.(estimatedBreakdown)
    } finally {
      setIsCalculating(false)
    }
  }

  const calculateEstimatedFees = (): FBAFeeBreakdown => {
    const { length, width, height, weight } = dimensions
    const volume = (length * width * height) / 1728 // cubic feet
    
    // Simplified fee calculation (actual fees are more complex)
    let fulfillmentFee = 0
    const storageFee = volume * 0.75 // $0.75 per cubic foot per month
    const referralFee = 0 // Would need product price to calculate
    
    // Basic fulfillment fee estimation based on size tier
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
    
    const totalFee = fulfillmentFee + storageFee + referralFee
    
    return {
      fulfillmentFee,
      storageFee,
      referralFee,
      totalFee,
      currency: 'USD'
    }
  }

  const handleDimensionChange = (field: keyof ProductDimensions, value: string | number) => {
    setDimensions(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          FBA Fee Calculator
        </CardTitle>
        <CardDescription>
          Calculate Amazon FBA fees based on product dimensions and category
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Dimensions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Length (in)</Label>
            <Input
              id="length"
              type="number"
              step="0.1"
              value={dimensions.length || ''}
              onChange={(e) => handleDimensionChange('length', e.target.value)}
              placeholder="0.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Width (in)</Label>
            <Input
              id="width"
              type="number"
              step="0.1"
              value={dimensions.width || ''}
              onChange={(e) => handleDimensionChange('width', e.target.value)}
              placeholder="0.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Height (in)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={dimensions.height || ''}
              onChange={(e) => handleDimensionChange('height', e.target.value)}
              placeholder="0.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (lbs)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={dimensions.weight || ''}
              onChange={(e) => handleDimensionChange('weight', e.target.value)}
              placeholder="0.0"
            />
          </div>
        </div>

        {/* Category and ASIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Product Category</Label>
            <Select value={dimensions.category} onValueChange={(value) => handleDimensionChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asin">ASIN (Optional)</Label>
            <Input
              id="asin"
              value={dimensions.asin || ''}
              onChange={(e) => handleDimensionChange('asin', e.target.value)}
              placeholder="B01234567X"
            />
          </div>
        </div>

        {/* Size Tier Display */}
        {sizeTier && (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Size Tier:</span>
            <Badge variant="outline">{sizeTier}</Badge>
          </div>
        )}

        {/* Calculate Button */}
        <Button 
          onClick={calculateFees} 
          disabled={isCalculating || !dimensions.category}
          className="w-full"
        >
          {isCalculating ? 'Calculating...' : 'Calculate FBA Fees'}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Fee Breakdown */}
        {feeBreakdown && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Breakdown
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Fulfillment Fee</div>
                  <div className="text-lg font-semibold">
                    ${feeBreakdown.fulfillmentFee.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Storage Fee (Monthly)</div>
                  <div className="text-lg font-semibold">
                    ${feeBreakdown.storageFee.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Referral Fee</div>
                  <div className="text-lg font-semibold">
                    ${feeBreakdown.referralFee.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="text-center p-4 bg-primary/10 rounded-lg border">
                <div className="text-sm text-muted-foreground">Total FBA Fees</div>
                <div className="text-2xl font-bold text-primary">
                  ${feeBreakdown.totalFee.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}