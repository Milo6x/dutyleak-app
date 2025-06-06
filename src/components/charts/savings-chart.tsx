'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SavingsData {
  month: string
  savings: number
  costs: number
}

interface SavingsChartProps {
  data: SavingsData[]
  className?: string
}

export function SavingsChart({ data, className }: SavingsChartProps) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => Math.max(d.savings, d.costs)))
  }, [data])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Savings Overview</CardTitle>
        <CardDescription>
          Monthly savings compared to original costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const savingsPercentage = (item.savings / maxValue) * 100
            const costsPercentage = (item.costs / maxValue) * 100
            const savingsRate = item.costs > 0 ? ((item.savings / item.costs) * 100) : 0
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.month}</span>
                  <span className="text-green-600 font-semibold">
                    {savingsRate.toFixed(1)}% saved
                  </span>
                </div>
                
                <div className="space-y-1">
                  {/* Savings Bar */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-600 w-12">Saved</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${savingsPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">
                      {formatCurrency(item.savings)}
                    </span>
                  </div>
                  
                  {/* Original Costs Bar */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600 w-12">Cost</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${costsPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-16 text-right">
                      {formatCurrency(item.costs)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No savings data available</p>
            <p className="text-sm mt-1">Start importing products to see your savings</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SavingsChart