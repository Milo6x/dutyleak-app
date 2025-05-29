'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-blue-500 mb-2">
                DutyLeak
              </h1>
            </Link>
            <p className="text-gray-600">
              Sign in to your account
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {children}
          </div>
        </div>
      </div>
      
      {/* Right side - Background */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-500 to-blue-600 relative">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="text-center text-white">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Welcome to DutyLeak
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Join thousands of importers who are saving 15-30% on their duty costs with our AI-powered optimization platform.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-blue-100">Real-time duty calculations</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-blue-100">AI-powered HS classification</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span className="text-blue-100">FTA optimization engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}