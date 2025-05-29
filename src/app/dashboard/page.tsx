'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  CubeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalProducts: number
  totalSavings: number
  pendingReviews: number
  activeJobs: number
  recentProducts: any[]
  recentJobs: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSavings: 0,
    pendingReviews: 0,
    activeJobs: 0,
    recentProducts: [],
    recentJobs: [],
  })
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get user's workspace
      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!workspaceUser) return

      const workspaceId = workspaceUser.workspace_id

      // Fetch all stats in parallel
      const [
        productsResult,
        savingsResult,
        reviewsResult,
        jobsResult,
        recentProductsResult,
        recentJobsResult,
      ] = await Promise.all([
        // Total products
        supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId),
        
        // Total savings
        supabase
          .from('savings_ledger')
          .select('savings_amount')
          .eq('workspace_id', workspaceId),
        
        // Pending reviews
        supabase
          .from('review_queue')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending'),
        
        // Active jobs
        supabase
          .from('jobs')
          .select('id', { count: 'exact' })
          .eq('workspace_id', workspaceId)
          .in('status', ['pending', 'running']),
        
        // Recent products
        supabase
          .from('products')
          .select('id, title, asin, cost, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Recent jobs
        supabase
          .from('jobs')
          .select('id, type, status, progress, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const totalSavings = savingsResult.data?.reduce(
        (sum, item) => sum + (item.savings_amount || 0),
        0
      ) || 0

      setStats({
        totalProducts: productsResult.count || 0,
        totalSavings,
        pendingReviews: reviewsResult.count || 0,
        activeJobs: jobsResult.count || 0,
        recentProducts: recentProductsResult.data || [],
        recentJobs: recentJobsResult.data || [],
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'running':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex space-x-3">
            <Link
              href="/products/import"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Import Products
            </Link>
            <Link
              href="/optimization"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
              Run Optimization
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Products
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalProducts.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Savings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats.totalSavings)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Reviews
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pendingReviews}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Jobs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.activeJobs}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Products */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Products
                </h3>
                <Link
                  href="/products"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {stats.recentProducts.length > 0 ? (
                  stats.recentProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.title || product.asin || 'Untitled Product'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.asin && `ASIN: ${product.asin}`}
                          {product.cost && ` • ${formatCurrency(product.cost)}`}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(product.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No products yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Jobs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Recent Jobs
                </h3>
                <Link
                  href="/jobs"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {stats.recentJobs.length > 0 ? (
                  stats.recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {job.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                        {job.status === 'running' && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(job.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No jobs yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}