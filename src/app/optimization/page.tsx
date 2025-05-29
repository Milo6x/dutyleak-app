'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  PlayIcon,
  StopIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface OptimizationJob {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  created_at: string
  completed_at: string | null
  error_message: string | null
}

interface OptimizationStats {
  totalProducts: number
  optimizedProducts: number
  totalSavings: number
  averageSavings: number
}

export default function OptimizationPage() {
  const [jobs, setJobs] = useState<OptimizationJob[]>([])
  const [stats, setStats] = useState<OptimizationStats>({
    totalProducts: 0,
    optimizedProducts: 0,
    totalSavings: 0,
    averageSavings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [runningOptimization, setRunningOptimization] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchJobs, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    await Promise.all([fetchJobs(), fetchStats()])
    setLoading(false)
  }

  const fetchJobs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!workspaceUser) return

      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('workspace_id', workspaceUser.workspace_id)
        .in('type', ['duty_calculation', 'optimization'])
        .order('created_at', { ascending: false })
        .limit(10)

      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!workspaceUser) return

      const workspaceId = workspaceUser.workspace_id

      // Fetch stats in parallel
      const [
        productsResult,
        savingsResult,
        optimizedResult,
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
        
        // Products with duty calculations
        supabase
          .from('duty_calculations')
          .select('product_id')
          .eq('workspace_id', workspaceId),
      ])

      const totalSavings = savingsResult.data?.reduce(
        (sum, item) => sum + (item.savings_amount || 0),
        0
      ) || 0

      const optimizedProducts = new Set(optimizedResult.data?.map(item => item.product_id)).size
      const totalProducts = productsResult.count || 0

      setStats({
        totalProducts,
        optimizedProducts,
        totalSavings,
        averageSavings: optimizedProducts > 0 ? totalSavings / optimizedProducts : 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const startOptimization = async (type: 'duty_calculation' | 'optimization') => {
    try {
      setRunningOptimization(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start optimization')
      }

      // Refresh jobs list
      await fetchJobs()
    } catch (error) {
      console.error('Error starting optimization:', error)
      alert(error instanceof Error ? error.message : 'Failed to start optimization')
    } finally {
      setRunningOptimization(false)
    }
  }

  const stopJob = async (jobId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/jobs/${jobId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to stop job')
      }

      // Refresh jobs list
      await fetchJobs()
    } catch (error) {
      console.error('Error stopping job:', error)
      alert(error instanceof Error ? error.message : 'Failed to stop job')
    }
  }

  const rerunJob = async (jobId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(`/api/jobs/${jobId}/rerun`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to rerun job')
      }

      // Refresh jobs list
      await fetchJobs()
    } catch (error) {
      console.error('Error rerunning job:', error)
      alert(error instanceof Error ? error.message : 'Failed to rerun job')
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'running':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
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

  const hasRunningJobs = jobs.some(job => job.status === 'running')

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Optimization</h1>
            <p className="text-sm text-gray-500 mt-1">
              Run duty calculations and optimize your product classifications
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => startOptimization('duty_calculation')}
              disabled={runningOptimization || hasRunningJobs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
              Calculate Duties
            </button>
            <button
              onClick={() => startOptimization('optimization')}
              disabled={runningOptimization || hasRunningJobs}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runningOptimization ? (
                <div className="animate-spin -ml-1 mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <PlayIcon className="-ml-1 mr-2 h-5 w-5" />
              )}
              Run Optimization
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
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
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Optimized Products
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.optimizedProducts.toLocaleString()}
                      <span className="text-sm text-gray-500 ml-1">
                        ({stats.totalProducts > 0 ? Math.round((stats.optimizedProducts / stats.totalProducts) * 100) : 0}%)
                      </span>
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
                  <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Avg. Savings per Product
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats.averageSavings)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optimization Jobs */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Optimization Jobs
            </h3>
            
            {jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getJobStatusIcon(job.status)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {job.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                          <p className="text-sm text-gray-500">
                            Started {formatDate(job.created_at)}
                            {job.completed_at && ` • Completed ${formatDate(job.completed_at)}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        
                        {job.status === 'running' && (
                          <button
                            onClick={() => stopJob(job.id)}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                          >
                            <StopIcon className="h-3 w-3 mr-1" />
                            Stop
                          </button>
                        )}
                        
                        {job.status === 'failed' && (
                          <button
                            onClick={() => rerunJob(job.id)}
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50"
                          >
                            <ArrowPathIcon className="h-3 w-3 mr-1" />
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {job.status === 'running' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {job.error_message && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">{job.error_message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No optimization jobs yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start your first optimization to calculate duties and find savings.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => startOptimization('optimization')}
                    disabled={runningOptimization}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlayIcon className="-ml-1 mr-2 h-5 w-5" />
                    Run First Optimization
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}