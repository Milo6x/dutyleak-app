'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  CubeIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

interface HealthStatus {
  status: string
  timestamp: string
  database: string
  version: string
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    checkAuthAndRedirect()
    fetchHealth()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setCheckingAuth(false)
    }
  }

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error('Failed to fetch health status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-500">
                DutyLeak
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => {
                  const featuresSection = document.querySelector('[data-section="features"]')
                  featuresSection?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
              >
                Features
              </button>
              <button 
                onClick={() => {
                  const statusSection = document.querySelector('[data-section="status"]')
                  statusSection?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
              >
                System Status
              </button>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
                Dashboard
              </Link>
              <Link href="/products" className="text-gray-600 hover:text-gray-900 font-medium">
                Products
              </Link>
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600 mb-6">
                <span className="mr-2">🤖</span>
                AI-Powered Duty Optimization
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Stop Overpaying
                <br />
                on <span className="text-blue-500">Import Duties</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                DutyLeak uses advanced AI to analyze your products, optimize HS classifications, and unlock hidden savings. Join leading importers saving 15-30% on duties.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Start Free Trial
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
                <button 
                  className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    // Navigate to dashboard for live demo
                    window.open('/dashboard', '_blank')
                  }}
                >
                  Watch Demo
                </button>
              </div>
              <div className="mt-8 flex items-center space-x-6">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                  SOC2 Compliant
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-8">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-sm text-gray-500 mb-2">Average Savings</div>
                  <div className="text-3xl font-bold text-gray-900 mb-4">$127,450/year</div>
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Real-time duty calculations</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">AI-powered HS classification</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">FTA optimization engine</span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="text-green-500">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-gray-50" data-section="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to optimize duties
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools you need to reduce import costs and streamline compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <CubeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Management</h3>
              <p className="text-gray-600">
                Import and manage your product catalog with detailed specifications and classifications.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">HS Code Classification</h3>
              <p className="text-gray-600">
                AI-powered HS code suggestions with confidence scoring and expert review workflows.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Duty Optimization</h3>
              <p className="text-gray-600">
                Automatically find the lowest duty rates and calculate potential savings.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reporting</h3>
              <p className="text-gray-600">
                Comprehensive dashboards and reports to track savings and compliance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-50 py-12" data-section="status">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                System Status
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Current system health and API status</p>
              </div>
              <div className="mt-5">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ) : health ? (
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          health.status === 'healthy' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {health.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Database</dt>
                      <dd className="mt-1 text-sm text-gray-900">{health.database}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Version</dt>
                      <dd className="mt-1 text-sm text-gray-900">{health.version}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Check</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(health.timestamp).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-red-600">Failed to load system status</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}