'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  CogIcon,
  KeyIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'

const settingsNavigation = [
  {
    name: 'General',
    href: '/settings',
    icon: CogIcon,
    description: 'General application settings'
  },
  {
    name: 'API Keys',
    href: '/settings/api-keys',
    icon: KeyIcon,
    description: 'Configure external service API keys'
  },
  {
    name: 'Profile',
    href: '/settings/profile',
    icon: UserIcon,
    description: 'Manage your account profile'
  },
  {
    name: 'Notifications',
    href: '/settings/notifications',
    icon: BellIcon,
    description: 'Email and notification preferences'
  },
  {
    name: 'Security',
    href: '/settings/security',
    icon: ShieldCheckIcon,
    description: 'Security and privacy settings'
  },
  {
    name: 'Data & Export',
    href: '/settings/data',
    icon: CircleStackIcon,
    description: 'Data management and export options'
  }
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Settings Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <div className="px-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {settingsNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive
                          ? 'text-blue-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Mobile sidebar */}
        <div className="lg:hidden">
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 flex">
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
              <div className="relative flex flex-col flex-1 w-full max-w-xs bg-white">
                <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                  <div className="px-4">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
                  </div>
                  <nav className="flex-1 px-4 space-y-1">
                    {settingsNavigation.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'group flex items-center px-3 py-2 text-sm font-medium rounded-md',
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon
                            className={cn(
                              'mr-3 h-5 w-5 flex-shrink-0',
                              isActive
                                ? 'text-blue-500'
                                : 'text-gray-400 group-hover:text-gray-500'
                            )}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-medium text-gray-900">Settings</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardLayout>
  )
}