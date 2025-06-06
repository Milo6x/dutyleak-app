'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  PlusIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
// Remove unused import since Separator component is not found
import { DollarSign, Package, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { DashboardGridSkeleton, DashboardCardSkeleton } from '@/components/ui/skeleton'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { SavingsChart } from '@/components/charts/savings-chart'
import { ProductMetricsChart } from '@/components/charts/product-metrics-chart'
import { JobStatusChart } from '@/components/charts/job-status-chart'
import { DashboardLoader } from '@/components/ui/loading-spinner'
import { useDashboardData } from '@/hooks/use-dashboard-data'

interface Product {
  id: string
  title: string
  cost: number
  created_at: string
}

interface Job {
  id: string
  type: string
  status: string
  progress: number
  created_at: string
  completed_at?: string
  error_message?: string
}

interface DashboardStats {
  overview: {
    totalProducts: number
    totalSavings: number
    pendingReviews: number
    activeJobs: number
    totalProductValue: number
  }
  trends: {
    products: {
      current: number
      previous: number
      change: number
    }
    savings: {
      current: number
      previous: number
      change: number
    }
  }
  charts: {
    monthlySavings: Array<{
      month: string
      savings: number
      costs: number
      count: number
    }>
    productMetrics: Array<{
      category: string
      count: number
      avgSavings: number
      totalValue: number
      color: string
    }>
    jobStatus: {
      counts: Record<string, number>
      recentJobs: Job[]
    }
  }
  lastUpdated: string
}

export default function DashboardPage() {
  const { data: stats, isLoading: loading, error, refreshData, isRefetching } = useDashboardData()

  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })
  }, [])

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const handleRefresh = () => {
    refreshData()
  }

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats Grid Skeleton */}
        <DashboardGridSkeleton />
        
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error?.message || 'An error occurred'}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your savings, monitor performance, and optimize your import strategy.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRefetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </button>
          <Link
            href="/products/import"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Import Products
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Products
                </dt>
                <dd className="flex items-center">
                  <span className="text-lg font-medium text-gray-900">
                    {stats?.overview?.totalProducts?.toLocaleString() || '0'}
                  </span>
                  {stats?.trends?.products?.change !== 0 && (
                    <span className={`ml-2 flex items-center text-sm ${
                      (stats?.trends?.products?.change || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(stats?.trends?.products?.change || 0) > 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(stats?.trends?.products?.change || 0).toFixed(1)}%
                    </span>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Total Savings */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Savings
                </dt>
                <dd className="flex items-center">
                  <span className="text-lg font-medium text-gray-900">
                    {currencyFormatter.format(stats?.overview?.totalSavings || 0)}
                  </span>
                  {stats?.trends?.savings?.change !== 0 && (
                    <span className={`ml-2 flex items-center text-sm ${
                      (stats?.trends?.savings?.change || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(stats?.trends?.savings?.change || 0) > 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(stats?.trends?.savings?.change || 0).toFixed(1)}%
                    </span>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending Reviews
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats?.overview?.pendingReviews || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Active Jobs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Jobs
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats?.overview?.activeJobs || 0}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Savings</h3>
          <SavingsChart data={stats?.charts?.monthlySavings || []} />
        </div>

        {/* Product Metrics Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Product Categories</h3>
          <ProductMetricsChart data={stats?.charts?.productMetrics || []} />
        </div>
      </div>

      {/* Job Status Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Background Jobs</h3>
        <JobStatusChart jobs={stats?.charts?.jobStatus?.recentJobs || []} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/products/import"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <PlusIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Import Products</p>
              <p className="text-sm text-gray-600">Upload CSV or connect SP-API</p>
            </div>
          </Link>
          <Link
            href="/review-queue"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Review Classifications</p>
              <p className="text-sm text-gray-600">Verify HS code assignments</p>
            </div>
          </Link>
          <Link
            href="/scenarios"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Scenario Modeling</p>
              <p className="text-sm text-gray-600">Analyze different strategies</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {stats?.lastUpdated ? dateFormatter.format(new Date(stats.lastUpdated)) : 'Never'}
      </div>
    </div>
  )
}



