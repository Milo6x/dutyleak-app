'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, BarChart3 } from 'lucide-react'

interface ScenarioData {
  id: string
  name: string
  totalCost: number
  dutyCost: number
  shippingCost: number
  vatCost: number
  savings: number
  savingsPercentage: number
  roi: number
  implementationComplexity: number
  timeToImplement: number
  riskLevel: 'low' | 'medium' | 'high'
  category: string
}

interface ScenarioChartProps {
  data: ScenarioData[]
  type?: 'cost-comparison' | 'savings-analysis' | 'roi-analysis' | 'complexity-matrix' | 'comprehensive'
  title?: string
  description?: string
  showLegend?: boolean
  height?: number
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  info: '#06B6D4',
  success: '#22C55E',
  muted: '#6B7280'
}

const RISK_COLORS = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444'
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatPercentage = (value: number) => {
  return `${value.toFixed(1)}%`
}

const CustomTooltip = ({ active, payload, label, type }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.dataKey}:</span>
            <span className="font-medium text-gray-900">
              {type === 'currency' ? formatCurrency(entry.value) : 
               type === 'percentage' ? formatPercentage(entry.value) : 
               entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CostComparisonChart: React.FC<{ data: ScenarioData[] }> = ({ data }) => {
  const chartData = data.map(scenario => ({
    name: scenario.name,
    'Total Cost': scenario.totalCost,
    'Duty Cost': scenario.dutyCost,
    'Shipping Cost': scenario.shippingCost,
    'VAT Cost': scenario.vatCost
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip type="currency" />} />
        <Legend />
        <Bar dataKey="Duty Cost" stackId="a" fill={COLORS.primary} />
        <Bar dataKey="Shipping Cost" stackId="a" fill={COLORS.secondary} />
        <Bar dataKey="VAT Cost" stackId="a" fill={COLORS.accent} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const SavingsAnalysisChart: React.FC<{ data: ScenarioData[] }> = ({ data }) => {
  const chartData = data.map(scenario => ({
    name: scenario.name,
    'Savings ($)': scenario.savings,
    'Savings (%)': scenario.savingsPercentage
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={formatPercentage} />
        <Tooltip content={<CustomTooltip type="mixed" />} />
        <Legend />
        <Bar yAxisId="left" dataKey="Savings ($)" fill={COLORS.success} />
        <Line yAxisId="right" type="monotone" dataKey="Savings (%)" stroke={COLORS.primary} strokeWidth={3} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

const ROIAnalysisChart: React.FC<{ data: ScenarioData[] }> = ({ data }) => {
  const chartData = data.map(scenario => ({
    name: scenario.name,
    'ROI (%)': scenario.roi,
    'Implementation Time': scenario.timeToImplement
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatPercentage} />
        <Tooltip content={<CustomTooltip type="percentage" />} />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="ROI (%)" 
          stroke={COLORS.primary} 
          fill={COLORS.primary}
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const ComplexityMatrixChart: React.FC<{ data: ScenarioData[] }> = ({ data }) => {
  const chartData = data.map(scenario => ({
    x: scenario.implementationComplexity,
    y: scenario.roi,
    z: scenario.savings,
    name: scenario.name,
    risk: scenario.riskLevel
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          type="number" 
          dataKey="x" 
          name="Implementation Complexity"
          tick={{ fontSize: 12 }}
          label={{ value: 'Implementation Complexity', position: 'insideBottom', offset: -10 }}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          name="ROI (%)"
          tick={{ fontSize: 12 }}
          tickFormatter={formatPercentage}
          label={{ value: 'ROI (%)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900 mb-2">{data.name}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Complexity:</span>
                      <span className="font-medium">{data.x}/10</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">ROI:</span>
                      <span className="font-medium">{formatPercentage(data.y)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Savings:</span>
                      <span className="font-medium">{formatCurrency(data.z)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-600">Risk:</span>
                      <Badge 
                        className={`text-xs ${
                          data.risk === 'low' ? 'bg-green-100 text-green-800' :
                          data.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {data.risk}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Scatter 
          name="Scenarios" 
          data={chartData} 
          fill={COLORS.primary}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.risk]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

const ScenarioSummaryCards: React.FC<{ data: ScenarioData[] }> = ({ data }) => {
  const totalSavings = data.reduce((sum, scenario) => sum + scenario.savings, 0)
  const averageROI = data.reduce((sum, scenario) => sum + scenario.roi, 0) / data.length
  const bestScenario = data.reduce((best, scenario) => 
    scenario.savings > best.savings ? scenario : best, data[0]
  )
  const lowRiskScenarios = data.filter(s => s.riskLevel === 'low').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Savings</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSavings)}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average ROI</p>
              <p className="text-2xl font-bold text-blue-600">{formatPercentage(averageROI)}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Best Scenario</p>
              <p className="text-lg font-bold text-purple-600 truncate">{bestScenario?.name}</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Risk</p>
              <p className="text-2xl font-bold text-green-600">{lowRiskScenarios}/{data.length}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const ScenarioChart: React.FC<ScenarioChartProps> = ({
  data,
  type = 'comprehensive',
  title = 'Scenario Analysis',
  description = 'Compare different scenarios and their potential impact',
  showLegend = true,
  height = 400
}) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Run a scenario analysis to see results here.</p>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'cost-comparison':
        return <CostComparisonChart data={data} />
      case 'savings-analysis':
        return <SavingsAnalysisChart data={data} />
      case 'roi-analysis':
        return <ROIAnalysisChart data={data} />
      case 'complexity-matrix':
        return <ComplexityMatrixChart data={data} />
      case 'comprehensive':
      default:
        return (
          <Tabs defaultValue="cost-comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cost-comparison">Cost Comparison</TabsTrigger>
              <TabsTrigger value="savings-analysis">Savings Analysis</TabsTrigger>
              <TabsTrigger value="roi-analysis">ROI Analysis</TabsTrigger>
              <TabsTrigger value="complexity-matrix">Risk vs ROI</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cost-comparison" className="mt-6">
              <CostComparisonChart data={data} />
            </TabsContent>
            
            <TabsContent value="savings-analysis" className="mt-6">
              <SavingsAnalysisChart data={data} />
            </TabsContent>
            
            <TabsContent value="roi-analysis" className="mt-6">
              <ROIAnalysisChart data={data} />
            </TabsContent>
            
            <TabsContent value="complexity-matrix" className="mt-6">
              <ComplexityMatrixChart data={data} />
            </TabsContent>
          </Tabs>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScenarioSummaryCards data={data} />
        {renderChart()}
      </CardContent>
    </Card>
  )
}

export default ScenarioChart