// Bundle Optimization System for DutyLeak
// Implements code splitting, lazy loading, and bundle analysis

import React, { lazy, ComponentType } from 'react'
import dynamic from 'next/dynamic'
import dashboardMetrics from './dashboard-metrics'

// Bundle size tracking
interface BundleMetrics {
  componentName: string
  loadTime: number
  bundleSize?: number
  chunkName?: string
  error?: string
}

class BundleOptimizer {
  private loadedComponents = new Set<string>()
  private loadingComponents = new Map<string, Promise<any>>()
  private bundleMetrics: BundleMetrics[] = []

  /**
   * Create a lazy-loaded component with metrics tracking
   */
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    componentName: string,
    options?: {
      fallback?: React.ComponentType
      retryCount?: number
      timeout?: number
    }
  ): ComponentType<any> {
    const { retryCount = 3, timeout = 10000 } = options || {}

    return lazy(() => {
      const startTime = performance.now()
      
      // Check if already loading
      if (this.loadingComponents.has(componentName)) {
        return this.loadingComponents.get(componentName)!
      }

      // Create loading promise with retry logic
      const loadingPromise = this.loadWithRetry(
        importFn,
        componentName,
        retryCount,
        timeout,
        startTime
      )

      this.loadingComponents.set(componentName, loadingPromise)
      
      return loadingPromise.finally(() => {
        this.loadingComponents.delete(componentName)
      })
    })
  }

  /**
   * Create a Next.js dynamic component with SSR control
   */
  createDynamicComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    componentName: string,
    options?: {
      ssr?: boolean
      loading?: (props: any) => JSX.Element | null
      suspense?: boolean
    }
  ): ComponentType<any> {
    const { ssr = false, suspense = true } = options || {}

    return dynamic(importFn, {
      ssr,
      suspense,
      loading: options?.loading || ((props) => (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ))
    })
  }

  /**
   * Preload a component for faster subsequent loading
   */
  async preloadComponent(
    importFn: () => Promise<any>,
    componentName: string
  ): Promise<void> {
    if (this.loadedComponents.has(componentName)) {
      return
    }

    try {
      const startTime = performance.now()
      await importFn()
      const loadTime = performance.now() - startTime
      
      this.loadedComponents.add(componentName)
      this.recordBundleMetric({
        componentName,
        loadTime,
        chunkName: 'preloaded'
      })
      
      dashboardMetrics.recordMetric('component_preload_success', 1, {
        component: componentName,
        loadTime
      })
    } catch (error) {
      dashboardMetrics.recordMetric('component_preload_error', 1, {
        component: componentName,
        error: error.message
      })
    }
  }

  /**
   * Load component with retry logic
   */
  private async loadWithRetry(
    importFn: () => Promise<any>,
    componentName: string,
    retryCount: number,
    timeout: number,
    startTime: number
  ): Promise<any> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout)
        })
        
        const result = await Promise.race([
          importFn(),
          timeoutPromise
        ])
        
        const loadTime = performance.now() - startTime
        this.loadedComponents.add(componentName)
        
        this.recordBundleMetric({
          componentName,
          loadTime,
          chunkName: `chunk-${componentName.toLowerCase()}`
        })
        
        dashboardMetrics.recordMetric('component_load_success', 1, {
          component: componentName,
          loadTime,
          attempt
        })
        
        return result
      } catch (error) {
        lastError = error as Error
        
        if (attempt < retryCount) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }
    
    // All retries failed
    const loadTime = performance.now() - startTime
    this.recordBundleMetric({
      componentName,
      loadTime,
      error: lastError.message
    })
    
    dashboardMetrics.recordMetric('component_load_error', 1, {
      component: componentName,
      error: lastError.message,
      attempts: retryCount
    })
    
    throw lastError
  }

  /**
   * Record bundle loading metrics
   */
  private recordBundleMetric(metric: BundleMetrics) {
    this.bundleMetrics.push(metric)
    
    // Keep only last 100 metrics
    if (this.bundleMetrics.length > 100) {
      this.bundleMetrics.shift()
    }
  }

  /**
   * Get bundle performance statistics
   */
  getBundleStats() {
    const stats = {
      totalComponents: this.bundleMetrics.length,
      loadedComponents: this.loadedComponents.size,
      averageLoadTime: 0,
      slowestComponents: [] as BundleMetrics[],
      failedLoads: [] as BundleMetrics[],
      successRate: 0
    }

    if (this.bundleMetrics.length > 0) {
      const successfulLoads = this.bundleMetrics.filter(m => !m.error)
      const failedLoads = this.bundleMetrics.filter(m => m.error)
      
      stats.averageLoadTime = successfulLoads.reduce((sum, m) => sum + m.loadTime, 0) / successfulLoads.length
      stats.slowestComponents = [...successfulLoads]
        .sort((a, b) => b.loadTime - a.loadTime)
        .slice(0, 5)
      stats.failedLoads = failedLoads
      stats.successRate = (successfulLoads.length / this.bundleMetrics.length) * 100
    }

    return stats
  }

  /**
   * Clear bundle metrics
   */
  clearMetrics() {
    this.bundleMetrics = []
  }

  /**
   * Check if component is already loaded
   */
  isComponentLoaded(componentName: string): boolean {
    return this.loadedComponents.has(componentName)
  }

  /**
   * Get loading status of a component
   */
  isComponentLoading(componentName: string): boolean {
    return this.loadingComponents.has(componentName)
  }
}

// Create singleton instance
const bundleOptimizer = new BundleOptimizer()

// Pre-configured lazy components
export const LazyComponents = {
  // Import components
  CSVImport: bundleOptimizer.createLazyComponent(
    () => import('@/components/imports/csv-import'),
    'CSVImport'
  ),
  
  CSVImportDialog: bundleOptimizer.createLazyComponent(
    () => import('@/components/imports/csv-import-dialog'),
    'CSVImportDialog'
  ),
  
  // Classification components
  HSCodeClassifier: bundleOptimizer.createLazyComponent(
    () => import('@/components/classification/hs-code-classifier'),
    'HSCodeClassifier'
  ),
  
  ClassificationDialog: bundleOptimizer.createLazyComponent(
    () => import('@/components/classification/classification-dialog'),
    'ClassificationDialog'
  ),
  
  ClassificationHistory: bundleOptimizer.createLazyComponent(
    () => import('@/components/classification/classification-history'),
    'ClassificationHistory'
  ),
  
  // Chart components
  SavingsChart: bundleOptimizer.createLazyComponent(
    () => import('@/components/charts/savings-chart'),
    'SavingsChart'
  ),
  
  ProductMetricsChart: bundleOptimizer.createLazyComponent(
    () => import('@/components/charts/product-metrics-chart'),
    'ProductMetricsChart'
  ),
  
  JobStatusChart: bundleOptimizer.createLazyComponent(
    () => import('@/components/charts/job-status-chart'),
    'JobStatusChart'
  )
}

// Dynamic components with SSR control
export const DynamicComponents = {
  // Client-side only components (charts work better without SSR)
  SavingsChart: bundleOptimizer.createDynamicComponent(
    () => import('@/components/charts/savings-chart'),
    'SavingsChart',
    { ssr: false }
  ),
  
  ProductMetricsChart: bundleOptimizer.createDynamicComponent(
    () => import('@/components/charts/product-metrics-chart'),
    'ProductMetricsChart',
    { ssr: false }
  ),
  
  JobStatusChart: bundleOptimizer.createDynamicComponent(
    () => import('@/components/charts/job-status-chart'),
    'JobStatusChart',
    { ssr: false }
  ),
  
  // SSR-enabled components
  CSVImport: bundleOptimizer.createDynamicComponent(
    () => import('@/components/imports/csv-import'),
    'CSVImport',
    { ssr: true }
  )
}

// Preloading utilities
export const preloadCriticalComponents = async () => {
  const criticalComponents = [
    () => import('@/components/charts/savings-chart'),
    () => import('@/components/imports/csv-import')
  ]
  
  const componentNames = ['SavingsChart', 'CSVImport']
  
  await Promise.allSettled(
    criticalComponents.map((importFn, index) =>
      bundleOptimizer.preloadComponent(importFn, componentNames[index])
    )
  )
}

const preloadRouteComponents = async (route: string) => {
  const routeComponentMap: Record<string, Array<{ importFn: () => Promise<any>, name: string }>> = {
    '/dashboard': [
      { importFn: () => import('@/components/charts/savings-chart'), name: 'SavingsChart' },
      { importFn: () => import('@/components/charts/product-metrics-chart'), name: 'ProductMetricsChart' }
    ],
    '/classification': [
      { importFn: () => import('@/components/classification/hs-code-classifier'), name: 'HSCodeClassifier' },
      { importFn: () => import('@/components/classification/classification-dialog'), name: 'ClassificationDialog' }
    ],
    '/import': [
      { importFn: () => import('@/components/imports/csv-import'), name: 'CSVImport' },
      { importFn: () => import('@/components/imports/csv-import-dialog'), name: 'CSVImportDialog' }
    ],
    '/charts': [
      { importFn: () => import('@/components/charts/job-status-chart'), name: 'JobStatusChart' }
    ]
  }
  
  const components = routeComponentMap[route] || []
  
  await Promise.allSettled(
    components.map(({ importFn, name }) =>
      bundleOptimizer.preloadComponent(importFn, name)
    )
  )
}

export default bundleOptimizer
export { BundleOptimizer, preloadRouteComponents }
export type { BundleMetrics }