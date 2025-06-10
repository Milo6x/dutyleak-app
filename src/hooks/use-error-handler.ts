'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AppError } from '@/lib/error/app-error'
import { ERROR_CODES } from '@/lib/error/error-codes'

export interface ErrorState {
  error: AppError | null
  isError: boolean
  errorMessage: string | null
  errorCode: string | null
}

export interface UseErrorHandlerOptions {
  /**
   * Whether to show toast notifications for errors
   */
  showToast?: boolean
  
  /**
   * Custom error message overrides
   */
  errorMessages?: Record<string, string>
  
  /**
   * Component name for error tracking
   */
  component?: string
  
  /**
   * Whether to log errors to console in development
   */
  logErrors?: boolean
  
  /**
   * Custom error handler function
   */
  onError?: (error: AppError) => void
}

export interface UseErrorHandlerReturn extends ErrorState {
  /**
   * Handle an error (can be Error, AppError, or API response)
   */
  handleError: (error: unknown) => void
  
  /**
   * Clear the current error state
   */
  clearError: () => void
  
  /**
   * Check if a specific error code is active
   */
  hasErrorCode: (code: string) => boolean
  
  /**
   * Wrap an async function with error handling
   */
  withErrorHandling: <T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => (...args: T) => Promise<R | undefined>
  
  /**
   * Handle API response and extract errors
   */
  handleApiResponse: <T>(response: Response) => Promise<T>
}

/**
 * Custom hook for handling errors in React components
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { handleError, clearError, isError, errorMessage } = useErrorHandler({
 *     component: 'MyComponent',
 *     showToast: true
 *   })
 * 
 *   const handleSubmit = async (data: FormData) => {
 *     try {
 *       const response = await fetch('/api/submit', {
 *         method: 'POST',
 *         body: JSON.stringify(data)
 *       })
 *       
 *       const result = await handleApiResponse(response)
 *       // Handle success
 *     } catch (error) {
 *       handleError(error)
 *     }
 *   }
 * 
 *   return (
 *     <div>
 *       {isError && (
 *         <div className="error-banner">
 *           {errorMessage}
 *           <button onClick={clearError}>Dismiss</button>
 *         </div>
 *       )}
 *       {/\* Your component content *\/}
 *     </div>
 *   )
 * }
 * ```
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    showToast = true,
    errorMessages = {},
    component = 'Unknown',
    logErrors = process.env.NODE_ENV === 'development',
    onError
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: null,
    errorCode: null
  })

  /**
   * Convert various error types to AppError
   */
  const normalizeError = useCallback((error: unknown): AppError => {
    // Already an AppError
    if (error instanceof AppError) {
      return error
    }

    // Standard Error
    if (error instanceof Error) {
      return new AppError(
        ERROR_CODES.INTERNAL_SERVER_ERROR.code,
        error.message || 'An unexpected error occurred',
        'high',
        { originalError: error.name, component }
      )
    }

    // API Error Response (from our standardized API)
    if (typeof error === 'object' && error !== null) {
      const apiError = error as any
      
      if (apiError.error && apiError.error.code) {
        return new AppError(
          apiError.error.code,
          apiError.error.message || 'API error occurred',
          apiError.error.severity || 'medium',
          { 
            ...apiError.error.details,
            component,
            requestId: apiError.requestId
          }
        )
      }
    }

    // Fallback for unknown error types
    return new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR.code,
      'An unknown error occurred',
      'medium',
      { component, originalError: String(error) }
    )
  }, [component])

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((error: AppError): string => {
    // Check for custom message override
    if (errorMessages[error.code]) {
      return errorMessages[error.code]
    }

    // Use error message or fallback
    return error.message || 'An unexpected error occurred'
  }, [errorMessages])

  /**
   * Handle an error
   */
  const handleError = useCallback((error: unknown) => {
    const normalizedError = normalizeError(error)
    const message = getErrorMessage(normalizedError)

    // Update state
    setErrorState({
      error: normalizedError,
      isError: true,
      errorMessage: message,
      errorCode: normalizedError.code
    })

    // Log error in development
    if (logErrors) {
      console.error(`[${component}] Error:`, normalizedError)
    }

    // Show toast notification
    if (showToast) {
      const toastOptions = {
        duration: normalizedError.severity === 'critical' ? 10000 : 5000
      }

      switch (normalizedError.severity) {
        case 'critical':
        case 'high':
          toast.error(message, toastOptions)
          break
        case 'medium':
          toast.warning(message, toastOptions)
          break
        case 'low':
          toast.info(message, toastOptions)
          break
        default:
          toast.error(message, toastOptions)
      }
    }

    // Call custom error handler
    if (onError) {
      onError(normalizedError)
    }
  }, [normalizeError, getErrorMessage, logErrors, component, showToast, onError])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorMessage: null,
      errorCode: null
    })
  }, [])

  /**
   * Check if a specific error code is active
   */
  const hasErrorCode = useCallback((code: string): boolean => {
    return errorState.errorCode === code
  }, [errorState.errorCode])

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(
    <T extends any[], R>(fn: (...args: T) => Promise<R>) => {
      return async (...args: T): Promise<R | undefined> => {
        try {
          return await fn(...args)
        } catch (error) {
          handleError(error)
          return undefined
        }
      }
    },
    [handleError]
  )

  /**
   * Handle API response and extract errors
   */
  const handleApiResponse = useCallback(
    async <T>(response: Response): Promise<T> => {
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          // If we can't parse JSON, create a generic error
          throw new AppError(
            ERROR_CODES.INTERNAL_SERVER_ERROR.code,
            `HTTP ${response.status}: ${response.statusText}`,
            'high',
            { component, httpStatus: response.status }
          )
        }

        // Throw the parsed error data (will be handled by handleError)
        throw errorData
      }

      try {
        return await response.json()
      } catch (error) {
        throw new AppError(
          ERROR_CODES.INTERNAL_SERVER_ERROR.code,
          'Failed to parse response',
          'medium',
          { component, originalError: String(error) }
        )
      }
    },
    [component]
  )

  return {
    ...errorState,
    handleError,
    clearError,
    hasErrorCode,
    withErrorHandling,
    handleApiResponse
  }
}

/**
 * Hook for handling form submission errors specifically
 */
export function useFormErrorHandler(options: UseErrorHandlerOptions = {}) {
  const errorHandler = useErrorHandler({
    ...options,
    component: options.component || 'Form'
  })

  /**
   * Get field-specific error message
   */
  const getFieldError = useCallback(
    (fieldName: string): string | null => {
      if (!errorHandler.error?.context?.validationErrors) {
        return null
      }

      const validationErrors = errorHandler.error.context.validationErrors
      const fieldError = validationErrors.find(
        (err: any) => err.path && err.path.includes(fieldName)
      )

      return fieldError?.message || null
    },
    [errorHandler.error]
  )

  /**
   * Check if a specific field has an error
   */
  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return getFieldError(fieldName) !== null
    },
    [getFieldError]
  )

  return {
    ...errorHandler,
    getFieldError,
    hasFieldError
  }
}

/**
 * Hook for handling async operations with loading states
 */
export function useAsyncErrorHandler<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  options: UseErrorHandlerOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false)
  const errorHandler = useErrorHandler(options)

  const execute = useCallback(
    async (...args: T): Promise<R | undefined> => {
      setIsLoading(true)
      errorHandler.clearError()

      try {
        const result = await asyncFn(...args)
        return result
      } catch (error) {
        errorHandler.handleError(error)
        return undefined
      } finally {
        setIsLoading(false)
      }
    },
    [asyncFn, errorHandler]
  )

  return {
    ...errorHandler,
    isLoading,
    execute
  }
}