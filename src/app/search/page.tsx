'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CubeIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface SearchResult {
  id: string
  type: 'product' | 'classification' | 'calculation' | 'report'
  title: string
  description: string
  url: string
  metadata?: any
  created_at: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(query)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (query) {
      performSearch(query)
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {return}

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {return}

      // Get user's workspace
      const { data: workspaceUser } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!workspaceUser) {return}

      const searchResults: SearchResult[] = []

      // Search products
      const { data: products } = await supabase
        .from('products')
        .select('id, title, description, asin, created_at')
        .eq('workspace_id', workspaceUser.workspace_id)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,asin.ilike.%${searchQuery}%`)
        .limit(10)

      if (products) {
        products.forEach(product => {
          searchResults.push({
            id: product.id,
            type: 'product',
            title: product.title,
            description: product.description || 'No description available',
            url: `/products?highlight=${product.id}`,
            metadata: { asin: product.asin },
            created_at: product.created_at
          })
        })
      }

      // Search classifications
      const { data: classifications } = await supabase
        .from('classifications')
        .select('id, product_id, hs6, hs8, description, created_at, products(title)')
        .eq('workspace_id', workspaceUser.workspace_id)
        .or(`hs6.ilike.%${searchQuery}%,hs8.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(10)

      if (classifications) {
        classifications.forEach(classification => {
          const hsCode = classification.hs8 || classification.hs6 || 'N/A'
          searchResults.push({
            id: classification.id,
            type: 'classification',
            title: `HS Code: ${hsCode}`,
            description: classification.description || 'No description available',
            url: `/classification?highlight=${classification.id}`,
            metadata: { 
              product_title: classification.products?.title,
              hs_code: hsCode 
            },
            created_at: classification.created_at
          })
        })
      }

      // Search duty calculations
      const { data: calculations } = await supabase
        .from('duty_calculations')
        .select('id, product_id, destination_country, created_at, products(title)')
        .eq('workspace_id', workspaceUser.workspace_id)
        .or(`destination_country.ilike.%${searchQuery}%`)
        .limit(10)

      if (calculations) {
        calculations.forEach(calculation => {
          searchResults.push({
            id: calculation.id,
            type: 'calculation',
            title: `Duty Calculation: ${calculation.destination_country}`,
            description: `Duty calculation for ${calculation.products?.title || 'Unknown product'}`,
            url: `/analytics?highlight=${calculation.id}`,
            metadata: {
              product_title: calculation.products?.title,
              destination: calculation.destination_country
            },
            created_at: calculation.created_at
          })
        })
      }

      // Sort results by relevance and date
      searchResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(searchTerm)}`)
      performSearch(searchTerm)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <CubeIcon className="h-5 w-5 text-blue-500" />
      case 'classification':
        return <DocumentTextIcon className="h-5 w-5 text-green-500" />
      case 'calculation':
        return <ChartBarIcon className="h-5 w-5 text-purple-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'product':
        return 'Product'
      case 'classification':
        return 'Classification'
      case 'calculation':
        return 'Calculation'
      default:
        return 'Result'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
            <p className="text-gray-600 mt-1">
              {query && `Results for "${query}"`}
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, classifications, calculations..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.url}
                className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getTypeLabel(result.type)}
                      </span>
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {new Date(result.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {result.title}
                    </h3>
                    <p className="text-gray-600 mt-1 line-clamp-2">
                      {result.description}
                    </p>
                    {result.metadata && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.metadata.asin && (
                          <span className="text-xs text-gray-500">ASIN: {result.metadata.asin}</span>
                        )}
                        {result.metadata.hs_code && (
                          <span className="text-xs text-gray-500">HS Code: {result.metadata.hs_code}</span>
                        )}
                        {result.metadata.origin && result.metadata.destination && (
                          <span className="text-xs text-gray-500">
                            {result.metadata.origin} → {result.metadata.destination}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or browse our categories.
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <Link
                href="/products"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Browse Products
              </Link>
              <Link
                href="/classification"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Browse Classifications
              </Link>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !query && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Start searching</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter a search term above to find products, classifications, and calculations.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}