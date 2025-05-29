'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface Product {
  id: string
  title: string | null
  asin: string | null
  cost: number | null
  weight: number | null
  dimensions: any
  category: string | null
  subcategory: string | null
  created_at: string
  updated_at: string
}

interface Filters {
  search: string
  category: string
  sortBy: 'created_at' | 'title' | 'cost' | 'asin'
  sortOrder: 'asc' | 'desc'
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  })
  const [categories, setCategories] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [filters, currentPage])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get user's workspace
      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!workspaceUser) return

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspaceUser.workspace_id)

      // Apply search filter
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,asin.ilike.%${filters.search}%`)
      }

      // Apply category filter
      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setProducts(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
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
        .from('products')
        .select('category')
        .eq('workspace_id', workspaceUser.workspace_id)
        .not('category', 'is', null)

      const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))]
      setCategories(uniqueCategories as string[])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      setProducts(products.filter(p => p.id !== productId))
      setTotalCount(totalCount - 1)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
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
    })
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalCount} total products
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/products/import"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Import Products
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            {/* Category Filter */}
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
            >
              <option value="created_at">Date Added</option>
              <option value="title">Title</option>
              <option value="cost">Cost</option>
              <option value="asin">ASIN</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setFilters({ 
                ...filters, 
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
              })}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {filters.sortOrder === 'asc' ? (
                <ArrowUpIcon className="h-4 w-4 mr-2" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-2" />
              )}
              {filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="animate-pulse">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex-1">Product</div>
                  <div className="w-32">ASIN</div>
                  <div className="w-24">Cost</div>
                  <div className="w-32">Category</div>
                  <div className="w-32">Date Added</div>
                  <div className="w-24">Actions</div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {products.length > 0 ? (
                  products.map((product) => (
                    <div key={product.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.title || 'Untitled Product'}
                          </p>
                          {product.subcategory && (
                            <p className="text-sm text-gray-500">
                              {product.subcategory}
                            </p>
                          )}
                        </div>
                        <div className="w-32">
                          <p className="text-sm text-gray-900">
                            {product.asin || 'N/A'}
                          </p>
                        </div>
                        <div className="w-24">
                          <p className="text-sm text-gray-900">
                            {formatCurrency(product.cost)}
                          </p>
                        </div>
                        <div className="w-32">
                          <p className="text-sm text-gray-900">
                            {product.category || 'Uncategorized'}
                          </p>
                        </div>
                        <div className="w-32">
                          <p className="text-sm text-gray-500">
                            {formatDate(product.created_at)}
                          </p>
                        </div>
                        <div className="w-24">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/products/${product.id}`}
                              className="text-blue-600 hover:text-blue-500"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/products/${product.id}/edit`}
                              className="text-gray-600 hover:text-gray-500"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-500"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No products found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by importing your first products.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/products/import"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Import Products
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// Missing import
import { CubeIcon } from '@heroicons/react/24/outline'