'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Upload,
  BarChart3,
  Settings,
  FileText,
  Zap,
  CheckCircle,
  Building2,
  Search,
  Home
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
}

interface MobileNavProps {
  navigation: NavigationItem[]
  className?: string
}

export function MobileNav({ navigation, className }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: pathname === item.href || pathname.startsWith(item.href + '/')
  }))

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("lg:hidden", className)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Menu panel */}
          <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-xl">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <Link href="/dashboard" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">DL</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">DutyLeak</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {updatedNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                          item.current
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <Icon className={cn(
                          'h-5 w-5 flex-shrink-0',
                          item.current ? 'text-blue-500' : 'text-gray-400'
                        )} />
                        <span>{item.name}</span>
                        {item.current && (
                          <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </Link>
                    )
                  })}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <Link
                      href="/products/new"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <Package className="h-4 w-4 text-gray-400" />
                      <span>Add Product</span>
                    </Link>
                    <Link
                      href="/data-pipeline"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <Upload className="h-4 w-4 text-gray-400" />
                      <span>Upload Data</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        // Trigger global search
                        const event = new KeyboardEvent('keydown', {
                          key: 'k',
                          metaKey: true,
                          bubbles: true
                        })
                        document.dispatchEvent(event)
                      }}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full text-left"
                    >
                      <Search className="h-4 w-4 text-gray-400" />
                      <span>Search</span>
                      <kbd className="ml-auto text-xs bg-gray-100 px-1.5 py-0.5 rounded border">
                        ⌘K
                      </kbd>
                    </button>
                  </div>
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  <p>DutyLeak v1.0</p>
                  <p className="mt-1">Optimize your import duties</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileNav