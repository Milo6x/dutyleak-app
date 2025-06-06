// UI/UX Enhancement System for DutyLeak
// Provides improved loading states, animations, and responsive design utilities

import toast from 'react-hot-toast'
import dashboardMetrics from '@/lib/performance/dashboard-metrics'

// Animation utilities
export const animations = {
  // Fade animations
  fadeIn: 'animate-in fade-in duration-200',
  fadeOut: 'animate-out fade-out duration-200',
  fadeInUp: 'animate-in fade-in slide-in-from-bottom-4 duration-300',
  fadeInDown: 'animate-in fade-in slide-in-from-top-4 duration-300',
  
  // Scale animations
  scaleIn: 'animate-in zoom-in-95 duration-200',
  scaleOut: 'animate-out zoom-out-95 duration-200',
  
  // Slide animations
  slideInLeft: 'animate-in slide-in-from-left duration-300',
  slideInRight: 'animate-in slide-in-from-right duration-300',
  slideOutLeft: 'animate-out slide-out-to-left duration-300',
  slideOutRight: 'animate-out slide-out-to-right duration-300',
  
  // Bounce animations
  bounceIn: 'animate-bounce',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  
  // Custom transitions
  smoothTransition: 'transition-all duration-200 ease-in-out',
  slowTransition: 'transition-all duration-500 ease-in-out'
}

// Loading state configurations
export const loadingStates = {
  skeleton: {
    line: 'h-4 bg-gray-200 rounded animate-pulse',
    circle: 'w-10 h-10 bg-gray-200 rounded-full animate-pulse',
    rectangle: 'h-20 bg-gray-200 rounded animate-pulse',
    card: 'p-4 border border-gray-200 rounded-lg animate-pulse'
  },
  
  spinner: {
    small: 'w-4 h-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin',
    medium: 'w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin',
    large: 'w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin'
  },
  
  dots: {
    small: 'flex space-x-1',
    medium: 'flex space-x-2',
    large: 'flex space-x-3'
  }
}

// Responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// Color palette
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a'
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309'
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c'
  }
}

// Enhanced loading component configurations
export interface LoadingConfig {
  type: 'skeleton' | 'spinner' | 'dots' | 'progress'
  size: 'small' | 'medium' | 'large'
  message?: string
  showProgress?: boolean
  progress?: number
}

// UI state management
class UIEnhancementManager {
  private loadingStates = new Map<string, boolean>()
  private toastQueue: Array<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }> = []
  private animationObserver?: IntersectionObserver

  constructor() {
    this.initializeAnimationObserver()
  }

  /**
   * Initialize intersection observer for scroll animations
   */
  private initializeAnimationObserver() {
    if (typeof window !== 'undefined') {
      this.animationObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in', 'fade-in', 'slide-in-from-bottom-4')
              entry.target.classList.remove('opacity-0')
            }
          })
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        }
      )
    }
  }

  /**
   * Set loading state for a component
   */
  setLoading(componentId: string, isLoading: boolean) {
    this.loadingStates.set(componentId, isLoading)
    
    dashboardMetrics.recordMetric('ui_loading_state', 1, {
      componentId,
      isLoading
    })
  }

  /**
   * Get loading state for a component
   */
  isLoading(componentId: string): boolean {
    return this.loadingStates.get(componentId) || false
  }

  /**
   * Show enhanced toast notification
   */
  showToast(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    options?: {
      duration?: number
      action?: { label: string; onClick: () => void }
      persistent?: boolean
    }
  ) {
    const { duration = 5000, persistent = false } = options || {}
    
    const toastOptions = {
      duration: persistent ? Infinity : duration
    }

    switch (type) {
      case 'success':
        toast.success(message, toastOptions)
        break
      case 'error':
        toast.error(message, toastOptions)
        break
      case 'warning':
        toast(message, { ...toastOptions, icon: '⚠️' })
        break
      case 'info':
      default:
        toast(message, { ...toastOptions, icon: 'ℹ️' })
        break
    }

    dashboardMetrics.recordMetric('ui_toast_shown', 1, {
      type,
      message: message.substring(0, 50) // Log first 50 chars
    })
  }

  /**
   * Queue multiple toast notifications
   */
  queueToasts(toasts: Array<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>) {
    this.toastQueue.push(...toasts)
    this.processToastQueue()
  }

  /**
   * Process queued toast notifications
   */
  private processToastQueue() {
    if (this.toastQueue.length === 0) {
      return
    }

    const toast = this.toastQueue.shift()
    if (toast) {
      this.showToast(toast.message, toast.type)
      
      // Process next toast after delay
      setTimeout(() => {
        this.processToastQueue()
      }, 1000)
    }
  }

  /**
   * Observe element for scroll animations
   */
  observeForAnimation(element: Element) {
    if (this.animationObserver) {
      element.classList.add('opacity-0')
      this.animationObserver.observe(element)
    }
  }

  /**
   * Unobserve element
   */
  unobserveElement(element: Element) {
    if (this.animationObserver) {
      this.animationObserver.unobserve(element)
    }
  }

  /**
   * Apply responsive classes based on screen size
   */
  getResponsiveClasses(config: {
    base?: string
    sm?: string
    md?: string
    lg?: string
    xl?: string
  }): string {
    const classes = []
    
    if (config.base) {
      classes.push(config.base)
    }
    if (config.sm) {
      classes.push(`sm:${config.sm}`)
    }
    if (config.md) {
      classes.push(`md:${config.md}`)
    }
    if (config.lg) {
      classes.push(`lg:${config.lg}`)
    }
    if (config.xl) {
      classes.push(`xl:${config.xl}`)
    }
    
    return classes.join(' ')
  }

  /**
   * Get loading component classes
   */
  getLoadingClasses(config: LoadingConfig): string {
    const { type, size } = config
    
    switch (type) {
      case 'skeleton':
        return `${loadingStates.skeleton.line} ${size === 'large' ? 'h-6' : size === 'medium' ? 'h-5' : 'h-4'}`
      case 'spinner':
        return loadingStates.spinner[size]
      case 'dots':
        return loadingStates.dots[size]
      default:
        return loadingStates.spinner.medium
    }
  }

  /**
   * Create smooth page transitions
   */
  createPageTransition(direction: 'enter' | 'exit' = 'enter'): string {
    if (direction === 'enter') {
      return `${animations.fadeInUp} ${animations.smoothTransition}`
    } else {
      return `${animations.fadeOut} ${animations.smoothTransition}`
    }
  }

  /**
   * Get UI statistics
   */
  getUIStats() {
    return {
      activeLoadingStates: Array.from(this.loadingStates.entries()).filter(([, isLoading]) => isLoading),
      queuedToasts: this.toastQueue.length,
      observedElements: this.animationObserver ? 'active' : 'inactive'
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.animationObserver) {
      this.animationObserver.disconnect()
    }
    this.loadingStates.clear()
    this.toastQueue = []
  }
}

// Create singleton instance
const uiEnhancementManager = new UIEnhancementManager()

// Utility functions
export const setLoading = (componentId: string, isLoading: boolean) => {
  uiEnhancementManager.setLoading(componentId, isLoading)
}

export const isLoading = (componentId: string): boolean => {
  return uiEnhancementManager.isLoading(componentId)
}

export const showToast = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  options?: {
    duration?: number
    action?: { label: string; onClick: () => void }
    persistent?: boolean
  }
) => {
  uiEnhancementManager.showToast(message, type, options)
}

export const queueToasts = (toasts: Array<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>) => {
  uiEnhancementManager.queueToasts(toasts)
}

export const observeForAnimation = (element: Element) => {
  uiEnhancementManager.observeForAnimation(element)
}

export const getResponsiveClasses = (config: {
  base?: string
  sm?: string
  md?: string
  lg?: string
  xl?: string
}): string => {
  return uiEnhancementManager.getResponsiveClasses(config)
}

export const getLoadingClasses = (config: LoadingConfig): string => {
  return uiEnhancementManager.getLoadingClasses(config)
}

export const createPageTransition = (direction: 'enter' | 'exit' = 'enter'): string => {
  return uiEnhancementManager.createPageTransition(direction)
}

export default uiEnhancementManager
export { UIEnhancementManager }