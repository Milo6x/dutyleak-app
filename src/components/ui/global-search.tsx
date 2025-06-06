'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Command, ArrowRight, Clock, Hash, Package, FileText, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'

interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'page' | 'product' | 'classification' | 'report'
  href: string
  icon?: React.ReactNode
}

interface GlobalSearchProps {
  className?: string
  placeholder?: string
}

const searchCategories = {
  page: { icon: <Hash className="h-4 w-4" />, label: 'Pages' },
  product: { icon: <Package className="h-4 w-4" />, label: 'Products' },
  classification: { icon: <FileText className="h-4 w-4" />, label: 'Classifications' },
  report: { icon: <BarChart3 className="h-4 w-4" />, label: 'Reports' }
}

const quickActions = [
  { id: 'dashboard', title: 'Dashboard', href: '/dashboard', type: 'page' as const },
  { id: 'products', title: 'Products', href: '/products', type: 'page' as const },
  { id: 'classification', title: 'Classification', href: '/classification', type: 'page' as const },
  { id: 'optimization', title: 'Optimization', href: '/optimization', type: 'page' as const },
  { id: 'analytics', title: 'Analytics', href: '/analytics', type: 'page' as const },
  { id: 'settings', title: 'Settings', href: '/settings', type: 'page' as const },
]

export function GlobalSearch({ className, placeholder = "Search everything..." }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dutyleak-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse recent searches:', e)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('dutyleak-recent-searches', JSON.stringify(updated))
  }, [recentSearches])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
        setSelectedIndex(0)
      }
      
      // Arrow navigation when search is open
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % results.length)
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(prev => prev === 0 ? results.length - 1 : prev - 1)
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          const selected = results[selectedIndex]
          if (selected) {
            handleResultClick(selected)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  // Search function
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults(quickActions)
      return
    }

    setLoading(true)
    try {
      // Simulate API call - replace with actual search endpoint
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Filter quick actions based on search term
      const filteredActions = quickActions.filter(action => 
        action.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      // TODO: Add actual search results from API
      // const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
      // const data = await response.json()
      
      setResults(filteredActions)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query)
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
    router.push(result.href)
  }

  const handleRecentSearchClick = (searchTerm: string) => {
    setQuery(searchTerm)
    performSearch(searchTerm)
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className={cn(
          "relative w-full max-w-sm justify-start text-sm text-muted-foreground",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {placeholder}
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-2xl border">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-gray-400 mr-3" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="border-0 focus:ring-0 text-base py-4"
            autoFocus
          />
          <kbd className="hidden sm:inline-block text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Recent Searches */}
              {!query && recentSearches.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Recent
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full text-left px-2 py-2 hover:bg-gray-50 rounded text-sm text-gray-700"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {results.length > 0 ? (
                <div className="p-2">
                  {!query && (
                    <div className="text-xs font-medium text-gray-500 px-2 py-1">
                      Quick Actions
                    </div>
                  )}
                  {results.map((result, index) => {
                    const category = searchCategories[result.type]
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full text-left px-2 py-3 rounded flex items-center justify-between group",
                          selectedIndex === index ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center">
                          <div className="mr-3 text-gray-400">
                            {category.icon}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{result.title}</div>
                            {result.description && (
                              <div className="text-sm text-gray-500">{result.description}</div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )
                  })}
                </div>
              ) : query ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No results found for &quot;{query}&quot;</p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <kbd className="bg-gray-100 px-1 rounded mr-1">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center">
              <kbd className="bg-gray-100 px-1 rounded mr-1">↵</kbd>
              Select
            </span>
            <span className="flex items-center">
              <kbd className="bg-gray-100 px-1 rounded mr-1">ESC</kbd>
              Close
            </span>
          </div>
          <div className="flex items-center">
            <Command className="h-3 w-3 mr-1" />
            Search powered by DutyLeak
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlobalSearch