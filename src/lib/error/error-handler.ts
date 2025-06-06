// Enhanced Error Handling System for DutyLeak
// Provides comprehensive error tracking, logging, and user-friendly error messages

import toast from 'react-hot-toast'
import dashboardMetrics from '@/lib/performance/dashboard-metrics'

export interface ErrorContext {
  userId?: string
  workspaceId?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
}

export interface ErrorDetails {
  code: string
  message: string
  userMessage: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
  retryable: boolean
}

export class AppError extends Error {
  public readonly code: string
  public readonly userMessage: string
  public readonly severity: 'low' | 'medium' | 'high' | 'critical'
  public readonly recoverable: boolean
  public readonly retryable: boolean
  public readonly context?: ErrorContext
  public readonly timestamp: Date

  constructor(
    details: ErrorDetails,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(details.message)
    this.name = 'AppError'
    this.code = details.code
    this.userMessage = details.userMessage
    this.severity = details.severity
    this.recoverable = details.recoverable
    this.retryable = details.retryable
    this.context = context
    this.timestamp = new Date()

    if (originalError) {
      this.stack = originalError.stack
      this.cause = originalError
    }
  }
}

// Predefined error types
export const ERROR_TYPES = {
  // Authentication errors
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required',
    userMessage: 'Please sign in to continue',
    severity: 'medium' as const,
    recoverable: true,
    retryable: false
  },
  AUTH_EXPIRED: {
    code: 'AUTH_EXPIRED',
    message: 'Authentication session expired',
    userMessage: 'Your session has expired. Please sign in again',
    severity: 'medium' as const,
    recoverable: true,
    retryable: false
  },
  AUTH_INVALID: {
    code: 'AUTH_INVALID',
    message: 'Invalid authentication credentials',
    userMessage: 'Invalid email or password',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  },

  // Database errors
  DB_CONNECTION: {
    code: 'DB_CONNECTION',
    message: 'Database connection failed',
    userMessage: 'Unable to connect to the database. Please try again',
    severity: 'high' as const,
    recoverable: true,
    retryable: true
  },
  DB_QUERY: {
    code: 'DB_QUERY',
    message: 'Database query failed',
    userMessage: 'Failed to retrieve data. Please try again',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  },
  DB_TIMEOUT: {
    code: 'DB_TIMEOUT',
    message: 'Database query timeout',
    userMessage: 'Request timed out. Please try again',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  },

  // API errors
  API_NETWORK: {
    code: 'API_NETWORK',
    message: 'Network request failed',
    userMessage: 'Network error. Please check your connection',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  },
  API_TIMEOUT: {
    code: 'API_TIMEOUT',
    message: 'API request timeout',
    userMessage: 'Request timed out. Please try again',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  },
  API_SERVER: {
    code: 'API_SERVER',
    message: 'Server error',
    userMessage: 'Server error. Please try again later',
    severity: 'high' as const,
    recoverable: true,
    retryable: true
  },

  // Validation errors
  VALIDATION_REQUIRED: {
    code: 'VALIDATION_REQUIRED',
    message: 'Required field missing',
    userMessage: 'Please fill in all required fields',
    severity: 'low' as const,
    recoverable: true,
    retryable: false
  },
  VALIDATION_FORMAT: {
    code: 'VALIDATION_FORMAT',
    message: 'Invalid format',
    userMessage: 'Please check the format of your input',
    severity: 'low' as const,
    recoverable: true,
    retryable: false
  },

  // File processing errors
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'File size exceeds limit',
    userMessage: 'File is too large. Please choose a smaller file',
    severity: 'medium' as const,
    recoverable: true,
    retryable: false
  },
  FILE_INVALID_TYPE: {
    code: 'FILE_INVALID_TYPE',
    message: 'Invalid file type',
    userMessage: 'Invalid file type. Please upload a CSV file',
    severity: 'medium' as const,
    recoverable: true,
    retryable: false
  },
  FILE_PROCESSING: {
    code: 'FILE_PROCESSING',
    message: 'File processing failed',
    userMessage: 'Failed to process file. Please check the format',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  },

  // Generic errors
  UNKNOWN: {
    code: 'UNKNOWN',
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again',
    severity: 'medium' as const,
    recoverable: true,
    retryable: true
  }
} as const

class ErrorHandler {
  private errorLog: AppError[] = []
  private maxLogSize = 100

  /**
   * Handle and log an error
   */
  handleError(
    error: Error | AppError,
    context?: ErrorContext,
    showToast: boolean = true
  ): AppError {
    let appError: AppError

    if (error instanceof AppError) {
      appError = error
    } else {
      // Convert generic error to AppError
      appError = this.createAppError(error, context)
    }

    // Log the error
    this.logError(appError)

    // Record metrics
    dashboardMetrics.recordMetric('error_occurred', 1, {
      code: appError.code,
      severity: appError.severity,
      component: context?.component,
      action: context?.action
    })

    // Show user notification
    if (showToast) {
      this.showErrorToast(appError)
    }

    return appError
  }

  /**
   * Create AppError from generic error
   */
  private createAppError(error: Error, context?: ErrorContext): AppError {
    // Try to match error to known types
    let errorType: typeof ERROR_TYPES[keyof typeof ERROR_TYPES] = ERROR_TYPES.UNKNOWN

    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      errorType = ERROR_TYPES.AUTH_REQUIRED
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = ERROR_TYPES.API_NETWORK
    } else if (error.message.includes('timeout')) {
      errorType = ERROR_TYPES.API_TIMEOUT
    } else if (error.message.includes('database') || error.message.includes('query')) {
      errorType = ERROR_TYPES.DB_QUERY
    }

    return new AppError(errorType, context, error)
  }

  /**
   * Log error to internal log and external services
   */
  private logError(error: AppError) {
    // Add to internal log
    this.errorLog.unshift(error)
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop()
    }

    // Console logging based on severity
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    }

    switch (error.severity) {
      case 'critical':
      case 'high':
        console.error('Error:', logData)
        break
      case 'medium':
        console.warn('Warning:', logData)
        break
      case 'low':
        console.info('Info:', logData)
        break
    }

    // In production, you would send to external logging service
    if (process.env.NODE_ENV === 'production' && error.severity === 'critical') {
      // Send to external error tracking service (e.g., Sentry, LogRocket)
      this.sendToExternalService(error)
    }
  }

  /**
   * Show appropriate toast notification
   */
  private showErrorToast(error: AppError) {
    const toastOptions = {
      duration: error.severity === 'critical' ? 10000 : 5000
    }

    switch (error.severity) {
      case 'critical':
      case 'high':
        toast.error(error.userMessage, toastOptions)
        break
      case 'medium':
        toast(error.userMessage, { ...toastOptions, icon: '⚠️' })
        break
      case 'low':
        toast(error.userMessage, { ...toastOptions, icon: 'ℹ️' })
        break
    }

    // If retryable, emit retry event for components to handle
    if (error.retryable) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('error-retry', { detail: error }))
      }, 1000)
    }
  }

  /**
   * Send error to external logging service
   */
  private async sendToExternalService(error: AppError, context?: any) {
    // Send to external monitoring service
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: 'error',
          message: error.message,
          stack: error.stack,
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          component: context?.component,
          additionalData: context
        })
      })
    } catch (reportError) {
      // Silently fail if error reporting fails
      console.error('Failed to report error to external service:', reportError)
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errorLog.slice(0, limit)
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = []
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byCode: {} as Record<string, number>,
      recent: this.errorLog.slice(0, 5)
    }

    this.errorLog.forEach(error => {
      stats.bySeverity[error.severity]++
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1
    })

    return stats
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler()

// Utility functions
export const createError = (
  type: keyof typeof ERROR_TYPES,
  context?: ErrorContext,
  originalError?: Error
): AppError => {
  return new AppError(ERROR_TYPES[type], context, originalError)
}

export const handleError = (
  error: Error | AppError,
  context?: ErrorContext,
  showToast: boolean = true
): AppError => {
  return errorHandler.handleError(error, context, showToast)
}

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      throw handleError(error as Error, context)
    }
  }
}

export default errorHandler
export { ErrorHandler }