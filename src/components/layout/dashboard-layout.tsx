'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  HomeIcon,
  CubeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { 
    name: 'Data Pipeline', 
    href: '/data-pipeline', 
    icon: CubeIcon,
    children: [
      { name: 'CSV Imports', href: '/products/import' },
      { name: 'SP-API Connections', href: '/sp-api' },
      { name: 'Background Jobs', href: '/jobs' }
    ]
  },
  { 
    name: 'Products', 
    href: '/products', 
    icon: CubeIcon,
    children: [
      { name: 'Product Catalog', href: '/products' },
      { name: 'HS Classification', href: '/classification', badge: '5' }
    ]
  },
  { 
    name: 'Analytics', 
    href: '/analytics', 
    icon: ChartBarIcon,
    children: [
      { name: 'Profitability', href: '/profitability' },
      { name: 'Savings Explorer', href: '/savings' },
      { name: 'Review Queue', href: '/review-queue', badge: '12' },
      { name: 'Duty Explorer', href: '/duty-explorer' }
    ]
  },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Admin', href: '/admin', icon: UserCircleIcon },
  { name: 'Help & Resources', href: '/help', icon: ClipboardDocumentListIcon },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchUserData(session.user.id)
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setProfile(null)
          setWorkspace(null)
          router.push('/auth/login')
        } else if (session?.user) {
          setUser(session.user)
          await fetchUserData(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Fetch workspace
      const { data: workspaceData } = await supabase
        .from('workspace_users')
        .select(`
          workspace_id,
          role,
          workspaces (
            id,
            name,
            plan
          )
        `)
        .eq('user_id', userId)
        .single()

      if (workspaceData?.workspaces) {
        setWorkspace(workspaceData.workspaces)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-100">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">DL</span>
              </div>
              <span className="text-xl font-bold text-blue-500">DutyLeak</span>
            </Link>
          </div>

          {/* Search */}
          <div className="px-6 py-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products, HS codes, invoices..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs font-sans font-medium text-gray-400">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href))
              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    <span className="flex-1">{item.name}</span>
                    {item.children && (
                      <svg className={`ml-2 h-4 w-4 transition-transform ${
                        isActive ? 'rotate-90' : ''
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Link>
                  {item.children && isActive && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`group flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                            pathname === child.href
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <span className="flex-1">{child.name}</span>
                          {child.badge && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-500">{workspace?.name}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">DL</span>
              </div>
              <span className="text-xl font-bold text-blue-500">DutyLeak</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-6 w-6 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-600 lg:hidden mr-4"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-900">DutyLeak</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search for mobile */}
              <div className="lg:hidden">
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              {/* Notifications */}
              <button className="relative text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19c-5 0-8-3-8-6s3-6 8-6 8 3 8 6-3 6-8 6z" />
                </svg>
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">1</span>
                </span>
              </button>
              
              {/* Theme toggle */}
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}