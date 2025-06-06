'use client'

// Enhanced Loading Components
// Provides various loading states with animations and progress tracking

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { animations, loadingStates, type LoadingConfig } from '@/lib/ui/ui-enhancements'
import { Loader2, RefreshCw, Zap } from 'lucide-react'

interface EnhancedLoadingProps {
  config?: LoadingConfig
  className?: string
  message?: string
  showProgress?: boolean
  progress?: number
  variant?: 'default' | 'minimal' | 'detailed'
}

// Main enhanced loading component
export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  config = { type: 'spinner', size: 'medium' },
  className,
  message,
  showProgress = false,
  progress = 0,
  variant = 'default'
}) => {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (config.type === 'dots') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 500)
      return () => clearInterval(interval)
    }
  }, [config.type])

  const renderSpinner = () => {
    const sizeClasses = {
      small: 'w-4 h-4',
      medium: 'w-6 h-6',
      large: 'w-8 h-8'
    }

    return (
      <Loader2 
        className={cn(
          'animate-spin text-blue-600',
          sizeClasses[config.size],
          className
        )} 
      />
    )
  }

  const renderSkeleton = () => {
    const heightClasses = {
      small: 'h-4',
      medium: 'h-5',
      large: 'h-6'
    }

    return (
      <div className={cn(
        'bg-gray-200 rounded animate-pulse',
        heightClasses[config.size],
        'w-full',
        className
      )} />
    )
  }

  const renderDots = () => {
    const dotSizes = {
      small: 'w-1 h-1',
      medium: 'w-2 h-2',
      large: 'w-3 h-3'
    }

    const spacing = {
      small: 'space-x-1',
      medium: 'space-x-2',
      large: 'space-x-3'
    }

    return (
      <div className={cn('flex items-center', spacing[config.size], className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-blue-600 rounded-full animate-bounce',
              dotSizes[config.size]
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    )
  }

  const renderProgress = () => {
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )
  }

  const renderLoadingContent = () => {
    switch (config.type) {
      case 'skeleton':
        return renderSkeleton()
      case 'dots':
        return renderDots()
      case 'progress':
        return renderProgress()
      case 'spinner':
      default:
        return renderSpinner()
    }
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        {renderLoadingContent()}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center space-y-4 p-8',
        animations.fadeIn,
        className
      )}>
        {renderLoadingContent()}
        {message && (
          <p className="text-sm text-gray-600 text-center max-w-xs">
            {message}{config.type === 'dots' ? dots : ''}
          </p>
        )}
        {showProgress && config.type !== 'progress' && (
          <div className="w-full max-w-xs">
            {renderProgress()}
            <p className="text-xs text-gray-500 mt-1 text-center">
              {Math.round(progress)}% complete
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-center space-x-3',
      animations.fadeIn,
      className
    )}>
      {renderLoadingContent()}
      {message && (
        <span className="text-sm text-gray-600">
          {message}{config.type === 'dots' ? dots : ''}
        </span>
      )}
    </div>
  )
}

// Specialized loading components
export const DashboardLoader: React.FC<{ message?: string }> = ({ 
  message = 'Loading dashboard...' 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <Zap className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">DutyLeak</h1>
      </div>
      <EnhancedLoading
        config={{ type: 'spinner', size: 'large' }}
        message={message}
        variant="detailed"
      />
    </div>
  </div>
)

export const TableLoader: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 animate-pulse">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-20 h-4 bg-gray-200 rounded" />
      </div>
    ))}
  </div>
)

export const CardLoader: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
      </div>
    ))}
  </div>
)

export const FormLoader: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/5" />
      <div className="h-24 bg-gray-200 rounded" />
    </div>
    <div className="flex space-x-3">
      <div className="h-10 bg-gray-200 rounded w-24" />
      <div className="h-10 bg-gray-200 rounded w-20" />
    </div>
  </div>
)

export const ChartLoader: React.FC<{ height?: string }> = ({ 
  height = 'h-64' 
}) => (
  <div className={cn('bg-gray-200 rounded-lg animate-pulse', height)} />
)

// Loading overlay component
export const LoadingOverlay: React.FC<{
  isLoading: boolean
  message?: string
  children: React.ReactNode
}> = ({ isLoading, message = 'Loading...', children }) => {
  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
        <EnhancedLoading
          config={{ type: 'spinner', size: 'large' }}
          message={message}
          variant="detailed"
        />
      </div>
    </div>
  )
}

// Progress indicator component
export const ProgressIndicator: React.FC<{
  progress: number
  message?: string
  showPercentage?: boolean
}> = ({ progress, message, showPercentage = true }) => (
  <div className="space-y-2">
    {message && (
      <p className="text-sm text-gray-600">{message}</p>
    )}
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    {showPercentage && (
      <p className="text-xs text-gray-500 text-right">
        {Math.round(progress)}%
      </p>
    )}
  </div>
)

export default EnhancedLoading