"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  Package, 
  Warehouse, 
  TrendingUp, 
  Info,
  Calendar,
  Calculator
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FBAFeeBreakdown {
  fulfillmentFee: number
  storageFee: number
  referralFee: number
  totalFee: number
  currency: string
  sizeTier?: string
  lastUpdated?: string
  estimatedMonthlyStorage?: number
  peakSeasonSurcharge?: number
}

interface FBAFeeDisplayProps {
  feeBreakdown: FBAFeeBreakdown
  productPrice?: number
  showComparison?: boolean
  className?: string
}

export function FBAFeeDisplay({ 
  feeBreakdown, 
  productPrice, 
  showComparison = false, 
  className 
}: FBAFeeDisplayProps) {
  const {
    fulfillmentFee,
    storageFee,
    referralFee,
    totalFee,
    currency,
    sizeTier,
    lastUpdated,
    estimatedMonthlyStorage,
    peakSeasonSurcharge
  } = feeBreakdown

  // Calculate percentages for visual representation
  const fulfillmentPercentage = (fulfillmentFee / totalFee) * 100
  const storagePercentage = (storageFee / totalFee) * 100
  const referralPercentage = (referralFee / totalFee) * 100

  // Calculate profit margin if product price is provided
  const profitMargin = productPrice ? ((productPrice - totalFee) / productPrice) * 100 : null
  const netProfit = productPrice ? productPrice - totalFee : null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) {return 'Not available'}
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            FBA Fee Breakdown
          </div>
          {sizeTier && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {sizeTier}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Detailed breakdown of Amazon FBA fees and charges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Fee Summary */}
        <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="text-sm text-muted-foreground mb-2">Total FBA Fees</div>
          <div className="text-3xl font-bold text-primary mb-2">
            {formatCurrency(totalFee)}
          </div>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" />
              Last updated: {formatDate(lastUpdated)}
            </div>
          )}
        </div>

        {/* Fee Components */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Fee Components
          </h4>
          
          {/* Fulfillment Fee */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Fulfillment Fee</span>
              </div>
              <span className="font-semibold">{formatCurrency(fulfillmentFee)}</span>
            </div>
            <Progress value={fulfillmentPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {fulfillmentPercentage.toFixed(1)}% of total fees • Picking, packing, and shipping
            </div>
          </div>

          {/* Storage Fee */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-green-500" />
                <span className="font-medium">Storage Fee</span>
                <Badge variant="secondary" className="text-xs">Monthly</Badge>
              </div>
              <span className="font-semibold">{formatCurrency(storageFee)}</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {storagePercentage.toFixed(1)}% of total fees • Warehouse storage costs
            </div>
            {estimatedMonthlyStorage && (
              <div className="text-xs text-blue-600">
                Estimated monthly: {formatCurrency(estimatedMonthlyStorage)}
              </div>
            )}
          </div>

          {/* Referral Fee */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Referral Fee</span>
              </div>
              <span className="font-semibold">{formatCurrency(referralFee)}</span>
            </div>
            <Progress value={referralPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {referralPercentage.toFixed(1)}% of total fees • Amazon commission on sales
            </div>
          </div>

          {/* Peak Season Surcharge */}
          {peakSeasonSurcharge && peakSeasonSurcharge > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Peak Season Surcharge</span>
                  <Badge variant="destructive" className="text-xs">Seasonal</Badge>
                </div>
                <span className="font-semibold">{formatCurrency(peakSeasonSurcharge)}</span>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Additional charges during peak season (Oct-Dec)
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <Separator />

        {/* Profitability Analysis */}
        {productPrice && showComparison && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Profitability Analysis
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Product Price</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(productPrice)}
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Net Profit</div>
                <div className={`text-lg font-semibold ${
                  netProfit && netProfit > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {netProfit ? formatCurrency(netProfit) : 'N/A'}
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Profit Margin</div>
                <div className={`text-lg font-semibold ${
                  profitMargin && profitMargin > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {profitMargin ? `${profitMargin.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>

            {profitMargin !== null && profitMargin < 15 && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Low profit margin detected. Consider optimizing product pricing or reducing costs.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Fee Optimization Tips */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Optimization Tips
          </h4>
          
          <div className="space-y-2 text-sm">
            {fulfillmentPercentage > 60 && (
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertDescription>
                  High fulfillment fees. Consider optimizing package dimensions to reduce size tier.
                </AlertDescription>
              </Alert>
            )}
            
            {storagePercentage > 30 && (
              <Alert>
                <Warehouse className="h-4 w-4" />
                <AlertDescription>
                  High storage costs. Consider faster inventory turnover or seasonal adjustments.
                </AlertDescription>
              </Alert>
            )}
            
            {referralPercentage > 40 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  High referral fees. Review category classification for potential savings.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}