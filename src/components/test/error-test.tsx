'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import ErrorBoundary from '@/components/ui/error-boundary'
import { ErrorFallback, NetworkErrorFallback, DataErrorFallback } from '@/components/ui/error-fallback'
import { logError } from '@/lib/error-logger'

// Component that throws an error when clicked
function ErrorThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error thrown by ErrorThrowingComponent')
  }
  return <div className="p-4 bg-green-100 rounded">Component rendered successfully!</div>
}

// Component that simulates async errors
function AsyncErrorComponent() {
  const [loading, setLoading] = useState(false)
  
  const triggerAsyncError = async () => {
    setLoading(true)
    try {
      // Simulate an async operation that fails
      await new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Async operation failed'))
        }, 1000)
      })
    } catch (error) {
      logError(error as Error, 'async-test-component')
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-medium mb-2">Async Error Test</h3>
      <Button 
        onClick={triggerAsyncError} 
        disabled={loading}
        variant="outline"
      >
        {loading ? 'Loading...' : 'Trigger Async Error'}
      </Button>
    </div>
  )
}

// Main test component
export default function ErrorBoundaryTest() {
  const [throwError, setThrowError] = useState(false)
  const [showNetworkError, setShowNetworkError] = useState(false)
  const [showDataError, setShowDataError] = useState(false)

  const resetError = () => {
    setThrowError(false)
    setShowNetworkError(false)
    setShowDataError(false)
  }

  const triggerManualError = () => {
    try {
      throw new Error('Manually triggered error for testing')
    } catch (error) {
      logError(error as Error, 'manual-test-trigger', {
        testData: 'This is test data',
        timestamp: new Date().toISOString()
      })
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
        <p className="text-yellow-800">Error boundary tests are only available in development mode.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Error Boundary Testing</h2>
        <p className="text-gray-600 mb-6">
          This component helps test different error scenarios and error boundary functionality.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button 
            onClick={() => setThrowError(true)}
            variant="destructive"
          >
            Trigger React Error
          </Button>
          
          <Button 
            onClick={triggerManualError}
            variant="outline"
          >
            Trigger Manual Error (Logged)
          </Button>
          
          <Button 
            onClick={() => setShowNetworkError(true)}
            variant="secondary"
          >
            Show Network Error
          </Button>
          
          <Button 
            onClick={() => setShowDataError(true)}
            variant="secondary"
          >
            Show Data Error
          </Button>
        </div>

        {/* React Error Boundary Test */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">React Error Boundary Test</h3>
          <ErrorBoundary variant="component" context="error-test-component">
            <ErrorThrowingComponent shouldThrow={throwError} />
          </ErrorBoundary>
        </div>

        {/* Network Error Fallback Test */}
        {showNetworkError && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Network Error Fallback</h3>
            <NetworkErrorFallback resetError={resetError} />
          </div>
        )}

        {/* Data Error Fallback Test */}
        {showDataError && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Data Error Fallback</h3>
            <DataErrorFallback resetError={resetError} />
          </div>
        )}

        {/* Async Error Test */}
        <div className="mb-6">
          <AsyncErrorComponent />
        </div>

        {/* Dashboard Error Boundary Test */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Dashboard Error Boundary Test</h3>
          <ErrorBoundary variant="dashboard" context="dashboard-test">
            <div className="p-4 bg-blue-100 rounded">
              <p>Dashboard content that could potentially error</p>
              <Button 
                onClick={() => {
                  throw new Error('Dashboard component error')
                }}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Trigger Dashboard Error
              </Button>
            </div>
          </ErrorBoundary>
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button onClick={resetError} variant="outline">
            Reset All Errors
          </Button>
        </div>
      </div>
    </div>
  )
}