'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from './button'
import Link from 'next/link'

interface ErrorFallbackProps {
  error?: Error
  resetError: () => void
  variant?: 'page' | 'component' | 'dashboard'
}

export function ErrorFallback({ error, resetError, variant = 'page' }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (variant === 'component') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Component Error</h3>
            <p className="text-sm text-red-700 mt-1">
              This component encountered an error and couldn&apos;t render properly.
            </p>
            {isDevelopment && error && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">Error Details</summary>
                <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                  {error.message}
                </pre>
              </details>
            )}
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'dashboard') {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 mx-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Dashboard Error</h3>
            <p className="mt-2 text-sm text-gray-500">
              We&apos;re having trouble loading your dashboard. This might be a temporary issue.
            </p>
            {isDevelopment && error && (
              <details className="mt-3 text-left">
                <summary className="text-xs text-gray-600 cursor-pointer">Technical Details</summary>
                <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-gray-100 p-2 rounded">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button onClick={resetError} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Dashboard
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default page variant
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 mx-4">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="mt-4 text-center">
          <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
          <p className="mt-2 text-sm text-gray-500">
            We apologize for the inconvenience. An unexpected error occurred while loading this page.
          </p>
          {isDevelopment && error && (
            <details className="mt-3 text-left">
              <summary className="text-xs text-gray-600 cursor-pointer">Error Details (Development)</summary>
              <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-gray-100 p-2 rounded">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Specific error fallbacks for common scenarios
export function NetworkErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Connection Error</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Unable to connect to our servers. Please check your internet connection.
          </p>
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="mt-2 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DataErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800">Data Loading Error</h3>
          <p className="text-sm text-blue-700 mt-1">
            We couldn&apos;t load the requested data. This might be a temporary issue.
          </p>
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="mt-2 text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reload Data
          </Button>
        </div>
      </div>
    </div>
  )
}