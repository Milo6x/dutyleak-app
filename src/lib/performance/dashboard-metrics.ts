// Dashboard performance monitoring utility
// Tracks loading times, cache hits, and user interactions

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceStats {
  count: number
  avg: number
  min: number
  max: number
  latest: number
}

class DashboardMetrics {
  private metrics: PerformanceMetric[] = []
  private startTimes: Map<string, number> = new Map()

  // Start timing a metric
  startTiming(name: string, metadata?: Record<string, any>): void {
    this.startTimes.set(name, performance.now())
    if (metadata) {
      this.recordMetric(`${name}_start`, 0, metadata)
    }
  }

  // End timing and record the metric
  endTiming(name: string, metadata?: Record<string, any>): number {
    const startTime = this.startTimes.get(name)
    if (!startTime) {
      console.warn(`No start time found for metric: ${name}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.recordMetric(name, duration, metadata)
    this.startTimes.delete(name)
    return duration
  }

  // Record a metric directly
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    })

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  // Get metrics by name
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) {
      return [...this.metrics]
    }
    return this.metrics.filter(metric => metric.name === name)
  }

  // Get average value for a metric
  getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) {return 0}
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / metrics.length
  }

  // Get latest metric value
  getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.getMetrics(name)
    return metrics.length > 0 ? metrics[metrics.length - 1] : null
  }

  // Clear all metrics
  clear(): void {
    this.metrics = []
    this.startTimes.clear()
  }

  // Export metrics for analysis
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: this.getSummary()
    }, null, 2)
  }

  // Get performance summary
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {}
    const metricNames = Array.from(new Set(this.metrics.map(m => m.name)))
    
    metricNames.forEach(name => {
      const metrics = this.getMetrics(name)
      if (metrics.length > 0) {
        summary[name] = {
          count: metrics.length,
          average: this.getAverageMetric(name),
          min: Math.min(...metrics.map(m => m.value)),
          max: Math.max(...metrics.map(m => m.value)),
          latest: metrics[metrics.length - 1].value
        }
      }
    })
    
    return summary
  }

  // Log performance summary to console
  logSummary(): void {
    console.group('📊 Dashboard Performance Metrics')
    const summary = this.getSummary()
    
    Object.entries(summary).forEach(([name, stats]) => {
      this.logMetrics(name, stats)
    })
    
    console.groupEnd()
  }

  private logMetrics(name: string, stats: PerformanceStats) {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`${name}:`, stats)
    }
    
    // Send metrics to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendMetricsToService(name, stats)
    }
  }

  private async sendMetricsToService(name: string, stats: PerformanceStats) {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metric_name: name,
          stats,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      // Silently fail if metrics reporting fails
    }
  }
}

// Create singleton instance
const dashboardMetrics = new DashboardMetrics()

// Helper functions for common dashboard metrics
export const trackDashboardLoad = () => {
  dashboardMetrics.startTiming('dashboard_load')
}

export const trackDashboardLoadComplete = (cacheHit = false) => {
  const duration = dashboardMetrics.endTiming('dashboard_load', { cacheHit })
  console.log(`🚀 Dashboard loaded in ${duration.toFixed(2)}ms ${cacheHit ? '(cache hit)' : '(fresh data)'}`)
  return duration
}

export const trackDataFetch = (source: string) => {
  dashboardMetrics.startTiming(`data_fetch_${source}`)
}

export const trackDataFetchComplete = (source: string, recordCount = 0) => {
  const duration = dashboardMetrics.endTiming(`data_fetch_${source}`, { recordCount })
  console.log(`📡 ${source} data fetched in ${duration.toFixed(2)}ms (${recordCount} records)`)
  return duration
}

export const trackCacheOperation = (operation: 'hit' | 'miss' | 'set', key: string) => {
  dashboardMetrics.recordMetric(`cache_${operation}`, 1, { key })
}

export const trackUserInteraction = (action: string, metadata?: Record<string, any>) => {
  dashboardMetrics.recordMetric(`user_${action}`, 1, metadata)
}

// Export the metrics instance
export default dashboardMetrics

// Performance monitoring hook for React components
export const usePerformanceMonitoring = (componentName: string) => {
  const startTime = performance.now()
  
  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime
      dashboardMetrics.recordMetric(`render_${componentName}`, renderTime)
      return renderTime
    },
    trackInteraction: (action: string, metadata?: Record<string, any>) => {
      trackUserInteraction(`${componentName}_${action}`, metadata)
    }
  }
}