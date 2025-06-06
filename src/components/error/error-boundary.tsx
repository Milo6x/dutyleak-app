'use client'

// Enhanced Error Boundary Component
// Provides comprehensive error catching and user-friendly error displays

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { AppError, ErrorHandler, createError } from '@/lib/error/error-handler'
import toast from 'react-hot-toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  context?: {
    component?: string
    userId?: string
    workspaceId?: string
  }
}

interface State {
  hasError: boolean
  error: AppError | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

class ErrorBoundary extends Component<Props, State> {
  private errorHandler = new ErrorHandler()
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create AppError with context
    const appError = createError('UNKNOWN', {
      component: this.props.context?.component || 'ErrorBoundary',
      userId: this.props.context?.userId,
      workspaceId: this.props.context?.workspaceId,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    }, error)

    // Handle the error
    this.errorHandler.handleError(appError, undefined, false)

    // Update state
    this.setState({
      error: appError,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Show toast notification
    toast.error('Something went wrong. Please try refreshing the page.')
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.')
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleReportError = async () => {
    const { error, errorInfo } = this.state
    if (error) {
      // In a real app, this would send to an error reporting service
      const errorReport = {
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        },
        context: error.context,
        componentStack: errorInfo?.componentStack,
        timestamp: error.timestamp,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      // Send error report to monitoring service
      try {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorReport)
        })
      } catch (reportError) {
        // Silently fail if error reporting fails
        console.error('Failed to report error:', reportError)
      }
      toast.success('Error report sent. Thank you for helping us improve!')
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error } = this.state
      const canRetry = this.state.retryCount < this.maxRetries

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600">
                {error?.userMessage || 'An unexpected error occurred. Please try again.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error details for development */}
              {this.props.showErrorDetails && error && process.env.NODE_ENV === 'development' && (
                <div className="rounded-md bg-gray-100 p-3 text-sm">
                  <p className="font-medium text-gray-900">Error Details:</p>
                  <p className="text-gray-700">Code: {error.code}</p>
                  <p className="text-gray-700">Message: {error.message}</p>
                  {error.context?.component && (
                    <p className="text-gray-700">Component: {error.context.component}</p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col space-y-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <Button
                  onClick={this.handleRefresh}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  className="w-full"
                  variant="outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
                
                <Button
                  onClick={this.handleReportError}
                  className="w-full"
                  variant="ghost"
                  size="sm"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Report Error
                </Button>
              </div>

              {/* Retry count indicator */}
              {this.state.retryCount > 0 && (
                <div className="text-center text-sm text-gray-500">
                  Retry attempt: {this.state.retryCount} of {this.maxRetries}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized error boundaries for different contexts
export const DashboardErrorBoundary: React.FC<{ children: ReactNode; userId?: string; workspaceId?: string }> = ({
  children,
  userId,
  workspaceId
}) => (
  <ErrorBoundary
    context={{
      component: 'Dashboard',
      userId,
      workspaceId
    }}
    showErrorDetails={process.env.NODE_ENV === 'development'}
  >
    {children}
  </ErrorBoundary>
)

export const FormErrorBoundary: React.FC<{ children: ReactNode; formName?: string }> = ({
  children,
  formName
}) => (
  <ErrorBoundary
    context={{
      component: `Form-${formName || 'Unknown'}`
    }}
    fallback={
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Form Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              There was an error with this form. Please refresh the page and try again.
            </p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

export const TableErrorBoundary: React.FC<{ children: ReactNode; tableName?: string }> = ({
  children,
  tableName
}) => (
  <ErrorBoundary
    context={{
      component: `Table-${tableName || 'Unknown'}`
    }}
    fallback={
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Unable to load data
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              There was an error loading the table data. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

export default ErrorBoundary