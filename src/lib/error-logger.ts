'use client'

interface ErrorLogEntry {
  timestamp: string
  error: Error
  context?: string
  userId?: string
  url?: string
  userAgent?: string
  additionalData?: Record<string, any>
}

class ErrorLogger {
  private static instance: ErrorLogger
  private logs: ErrorLogEntry[] = []
  private maxLogs = 100 // Keep last 100 errors in memory

  private constructor() {
    // Initialize error logging
    if (typeof window !== 'undefined') {
      // Global error handler
      window.addEventListener('error', (event) => {
        this.logError(new Error(event.message), 'global-error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      })

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(
          new Error(`Unhandled Promise Rejection: ${event.reason}`),
          'unhandled-promise'
        )
      })
    }
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  public logError(
    error: Error,
    context?: string,
    additionalData?: Record<string, any>
  ): void {
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      } as Error,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      additionalData
    }

    // Add to in-memory logs
    this.logs.push(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // Remove oldest log
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error logged: ${error.name}`)
      console.error('Message:', error.message)
      console.error('Context:', context)
      console.error('Stack:', error.stack)
      if (additionalData) {
        console.error('Additional Data:', additionalData)
      }
      console.groupEnd()
    }

    // Store in localStorage for persistence
    this.persistToLocalStorage(logEntry)

    // Send to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry)
    }
  }

  private persistToLocalStorage(logEntry: ErrorLogEntry): void {
    try {
      if (typeof window !== 'undefined') {
        const existingLogs = this.getStoredLogs()
        const updatedLogs = [...existingLogs, logEntry].slice(-50) // Keep last 50 in storage
        localStorage.setItem('dutyleak_error_logs', JSON.stringify(updatedLogs))
      }
    } catch (e) {
      console.warn('Failed to persist error log to localStorage:', e)
    }
  }

  private async sendToExternalService(logEntry: ErrorLogEntry): Promise<void> {
    try {
      // In a real application, you would send this to your error tracking service
      // Examples: Sentry, LogRocket, Bugsnag, etc.
      
      // For now, we'll just make a POST request to our own API
      if (typeof window !== 'undefined') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(logEntry),
        })
      }
    } catch (e) {
      console.warn('Failed to send error log to external service:', e)
    }
  }

  public getStoredLogs(): ErrorLogEntry[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('dutyleak_error_logs')
        return stored ? JSON.parse(stored) : []
      }
    } catch (e) {
      console.warn('Failed to retrieve stored error logs:', e)
    }
    return []
  }

  public getRecentLogs(count: number = 10): ErrorLogEntry[] {
    return this.logs.slice(-count)
  }

  public clearLogs(): void {
    this.logs = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dutyleak_error_logs')
    }
  }

  public exportLogs(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      logs: this.logs
    }, null, 2)
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance()

// Convenience function for logging errors
export function logError(
  error: Error,
  context?: string,
  additionalData?: Record<string, any>
): void {
  errorLogger.logError(error, context, additionalData)
}

// React Error Boundary integration
export function logReactError(
  error: Error,
  errorInfo: { componentStack: string }
): void {
  errorLogger.logError(error, 'react-error-boundary', {
    componentStack: errorInfo.componentStack
  })
}

// Async error wrapper
export async function withErrorLogging<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    logError(error as Error, context)
    throw error
  }
}

// Sync error wrapper
export function withErrorLoggingSync<T>(
  fn: () => T,
  context?: string
): T {
  try {
    return fn()
  } catch (error) {
    logError(error as Error, context)
    throw error
  }
}