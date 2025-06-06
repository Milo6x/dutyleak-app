'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProductMetric {
  category: string
  count: number
  avgSavings: number
  totalValue: number
  color: string
}

interface ProductMetricsChartProps {
  data: ProductMetric[]
  className?: string
}

export function ProductMetricsChart({ data, className }: ProductMetricsChartProps) {
  const totalProducts = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0)
  }, [data])

  const totalValue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.totalValue, 0)
  }, [data])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Product Categories</CardTitle>
        <CardDescription>
          Breakdown by product category and performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(totalProducts)}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            {data.map((item, index) => {
              const percentage = totalProducts > 0 ? (item.count / totalProducts) * 100 : 0
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium">{item.category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.count} items
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(item.avgSavings)}</div>
                      <div className="text-xs text-gray-500">avg savings</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Total Value: {formatCurrency(item.totalValue)}</span>
                    <span>Avg per item: {formatCurrency(item.totalValue / Math.max(item.count, 1))}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No product data available</p>
            <p className="text-sm mt-1">Import products to see category breakdown</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductMetricsChart