"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Package,
  DollarSign
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FBAFeeHistoryEntry {
  id: string
  productId: string
  productName: string
  asin?: string
  fulfillmentFee: number
  storageFee: number
  referralFee: number
  totalFee: number
  sizeTier: string
  calculatedAt: string
  dimensions: {
    length: number
    width: number
    height: number
    weight: number
  }
  category: string
  productPrice?: number
}

interface FBAFeeHistoryProps {
  productId?: string
  limit?: number
  showFilters?: boolean
  className?: string
}

const TIME_FILTERS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' }
]

const SIZE_TIER_FILTERS = [
  { value: 'all', label: 'All size tiers' },
  { value: 'small-standard', label: 'Small Standard' },
  { value: 'large-standard', label: 'Large Standard' },
  { value: 'small-oversize', label: 'Small Oversize' },
  { value: 'medium-oversize', label: 'Medium Oversize' },
  { value: 'large-oversize', label: 'Large Oversize' },
  { value: 'special-oversize', label: 'Special Oversize' }
]

export function FBAFeeHistory({ 
  productId, 
  limit = 50, 
  showFilters = true, 
  className 
}: FBAFeeHistoryProps) {
  const [history, setHistory] = useState<FBAFeeHistoryEntry[]>([])
  const [filteredHistory, setFilteredHistory] = useState<FBAFeeHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState('30d')
  const [sizeTierFilter, setSizeTierFilter] = useState('all')

  useEffect(() => {
    fetchHistory()
  }, [productId, limit])

  useEffect(() => {
    applyFilters()
  }, [history, timeFilter, sizeTierFilter])

  const fetchHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(productId && { productId })
      })

      const response = await fetch(`/api/amazon/fba-fee-history?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch FBA fee history')
      }

      const data = await response.json()
      setHistory(data.history || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
      // Mock data for development
      setHistory(generateMockHistory())
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockHistory = (): FBAFeeHistoryEntry[] => {
    const mockEntries: FBAFeeHistoryEntry[] = []
    const now = new Date()
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000)) // Weekly intervals
      mockEntries.push({
        id: `mock-${i}`,
        productId: productId || `product-${i}`,
        productName: `Product ${i + 1}`,
        asin: `B0123456${i}X`,
        fulfillmentFee: 3.22 + (i * 0.5),
        storageFee: 0.75 + (i * 0.1),
        referralFee: 2.50 + (i * 0.3),
        totalFee: 6.47 + (i * 0.9),
        sizeTier: i % 2 === 0 ? 'Small Standard' : 'Large Standard',
        calculatedAt: date.toISOString(),
        dimensions: {
          length: 10 + i,
          width: 8 + i,
          height: 2 + (i * 0.5),
          weight: 1 + (i * 0.2)
        },
        category: 'electronics',
        productPrice: 25 + (i * 5)
      })
    }
    
    return mockEntries
  }

  const applyFilters = () => {
    let filtered = [...history]

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      const days = parseInt(timeFilter.replace('d', '').replace('y', '')) * (timeFilter.includes('y') ? 365 : 1)
      const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
      
      filtered = filtered.filter(entry => new Date(entry.calculatedAt) >= cutoffDate)
    }

    // Apply size tier filter
    if (sizeTierFilter !== 'all') {
      const tierMap: { [key: string]: string } = {
        'small-standard': 'Small Standard',
        'large-standard': 'Large Standard',
        'small-oversize': 'Small Oversize',
        'medium-oversize': 'Medium Oversize',
        'large-oversize': 'Large Oversize',
        'special-oversize': 'Special Oversize'
      }
      
      filtered = filtered.filter(entry => entry.sizeTier === tierMap[sizeTierFilter])
    }

    setFilteredHistory(filtered)
  }

  const calculateTrend = (entries: FBAFeeHistoryEntry[]) => {
    if (entries.length < 2) {return null}
    
    const latest = entries[0]
    const previous = entries[1]
    const change = latest.totalFee - previous.totalFee
    const percentChange = (change / previous.totalFee) * 100
    
    return {
      change,
      percentChange,
      isIncrease: change > 0
    }
  }

  const exportHistory = () => {
    const csvContent = [
      ['Date', 'Product', 'ASIN', 'Size Tier', 'Fulfillment Fee', 'Storage Fee', 'Referral Fee', 'Total Fee'].join(','),
      ...filteredHistory.map(entry => [
        new Date(entry.calculatedAt).toLocaleDateString(),
        entry.productName,
        entry.asin || '',
        entry.sizeTier,
        entry.fulfillmentFee.toFixed(2),
        entry.storageFee.toFixed(2),
        entry.referralFee.toFixed(2),
        entry.totalFee.toFixed(2)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fba-fee-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const trend = calculateTrend(filteredHistory)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading fee history...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            FBA Fee History
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportHistory}
              disabled={filteredHistory.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Track FBA fee changes over time {productId ? 'for this product' : 'across all products'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTERS.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sizeTierFilter} onValueChange={setSizeTierFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_TIER_FILTERS.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Trend Summary */}
        {trend && (
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {trend.isIncrease ? (
                <TrendingUp className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium">
                {trend.isIncrease ? 'Increase' : 'Decrease'} of {formatCurrency(Math.abs(trend.change))}
              </span>
            </div>
            <Badge variant={trend.isIncrease ? 'destructive' : 'default'}>
              {trend.percentChange > 0 ? '+' : ''}{trend.percentChange.toFixed(1)}%
            </Badge>
            <span className="text-sm text-muted-foreground">
              compared to previous calculation
            </span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No fee history found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((entry, index) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{entry.productName}</div>
                      {entry.asin && (
                        <div className="text-sm text-muted-foreground">ASIN: {entry.asin}</div>
                      )}
                    </div>
                    <Badge variant="outline">{entry.sizeTier}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(entry.totalFee)}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.calculatedAt)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fulfillment:</span>
                    <span>{formatCurrency(entry.fulfillmentFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Storage:</span>
                    <span>{formatCurrency(entry.storageFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Referral:</span>
                    <span>{formatCurrency(entry.referralFee)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>L: {entry.dimensions.length}&quot;</span>
                    <span>W: {entry.dimensions.width}&quot;</span>
                    <span>H: {entry.dimensions.height}&quot;</span>
                    <span>Weight: {entry.dimensions.weight} lbs</span>
                  </div>
                  {entry.productPrice && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Price: {formatCurrency(entry.productPrice)}
                    </div>
                  )}
                </div>
                
                {index < filteredHistory.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredHistory.length >= limit && (
          <div className="text-center">
            <Button variant="outline" onClick={() => fetchHistory()}>
              Load More History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}