'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  FunnelIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface ReviewItem {
  id: string
  product_id: string
  classification_id: string
  status: 'pending' | 'approved' | 'rejected'
  confidence_score: number | null
  created_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
  products: {
    title: string | null
    asin: string | null
    category: string | null
  }
  classifications: {
    hs_code: string
    description: string
    duty_rate: number
  }
}

interface Filters {
  status: 'all' | 'pending' | 'approved' | 'rejected'
  confidenceThreshold: number
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    status: 'pending',
    confidenceThreshold: 0,
  })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchReviewItems()
  }, [filters])

  const fetchReviewItems = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!workspaceUser) return

      let query = supabase
        .from('review_queue')
        .select(`
          *,
          products!inner(title, asin, category),
          classifications!inner(hs_code, description, duty_rate)
        `)
        .eq('workspace_id', workspaceUser.workspace_id)

      // Apply status filter
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Apply confidence threshold filter
      if (filters.confidenceThreshold > 0) {
        query = query.gte('confidence_score', filters.confidenceThreshold / 100)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      setItems(data || [])
    } catch (error) {
      console.error('Error fetching review items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (itemId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setProcessingItems(prev => new Set([...prev, itemId]))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch('/api/review-queue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          item_id: itemId,
          action,
          notes,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process review')
      }

      // Remove from selected items
      setSelectedItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })

      // Refresh the list
      await fetchReviewItems()
    } catch (error) {
      console.error('Error processing review:', error)
      alert(error instanceof Error ? error.message : 'Failed to process review')
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const handleBulkReview = async (action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) return

    const confirmed = confirm(
      `Are you sure you want to ${action} ${selectedItems.size} item(s)?`
    )
    if (!confirmed) return

    try {
      const promises = Array.from(selectedItems).map(itemId => 
        handleReview(itemId, action)
      )
      await Promise.all(promises)
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Error processing bulk review:', error)
    }
  }

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
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

  const getConfidenceColor = (score: number | null) => {
    if (!score) return 'text-gray-500'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceLabel = (score: number | null) => {
    if (!score) return 'Unknown'
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckIcon className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XMarkIcon className="h-4 w-4 text-red-500" />
      default:
        return <ClockIcon className="h-4 w-4 text-yellow-500" />
    }
  }

  const pendingCount = items.filter(item => item.status === 'pending').length

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pendingCount} items pending review
            </p>
          </div>
          {selectedItems.size > 0 && (
            <div className="flex space-x-3">
              <button
                onClick={() => handleBulkReview('approve')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
                Approve ({selectedItems.size})
              </button>
              <button
                onClick={() => handleBulkReview('reject')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <XMarkIcon className="-ml-1 mr-2 h-5 w-5" />
                Reject ({selectedItems.size})
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Confidence: {filters.confidenceThreshold}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                className="w-full"
                value={filters.confidenceThreshold}
                onChange={(e) => setFilters({ ...filters, confidenceThreshold: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: 'pending', confidenceThreshold: 0 })}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Review Items */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {items.length > 0 ? (
            <>
              {/* Header */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product & Classification
                  </div>
                  <div className="w-24 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </div>
                  <div className="w-32 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </div>
                  <div className="w-32 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </div>
                  <div className="w-32 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.products.title || 'Untitled Product'}
                            </p>
                            <p className="text-sm text-gray-500">
                              ASIN: {item.products.asin || 'N/A'}
                              {item.products.category && ` • ${item.products.category}`}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-sm font-medium text-gray-900">
                              HS Code: {item.classifications.hs_code}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.classifications.description}
                            </p>
                            <p className="text-sm text-gray-500">
                              Duty Rate: {(item.classifications.duty_rate * 100).toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-24">
                        <div className="text-center">
                          <p className={`text-sm font-medium ${getConfidenceColor(item.confidence_score)}`}>
                            {item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getConfidenceLabel(item.confidence_score)}
                          </p>
                        </div>
                      </div>

                      <div className="w-32">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(item.status)}
                          <span className="text-sm text-gray-900 capitalize">
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="w-32">
                        <p className="text-sm text-gray-500">
                          {formatDate(item.created_at)}
                        </p>
                      </div>

                      <div className="w-32">
                        {item.status === 'pending' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleReview(item.id, 'approve')}
                              disabled={processingItems.has(item.id)}
                              className="text-green-600 hover:text-green-500 disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReview(item.id, 'reject')}
                              disabled={processingItems.has(item.id)}
                              className="text-red-600 hover:text-red-500 disabled:opacity-50"
                              title="Reject"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {item.reviewed_at ? formatDate(item.reviewed_at) : 'N/A'}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.reviewer_notes && (
                      <div className="mt-3 ml-8">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Notes:</strong> {item.reviewer_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No items in review queue
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.status === 'pending'
                  ? 'All classifications have been reviewed.'
                  : 'No items match the current filters.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}