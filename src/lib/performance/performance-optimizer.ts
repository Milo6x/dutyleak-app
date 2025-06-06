// Performance Optimization System for DutyLeak
// Implements database query optimization, bundle optimization, and performance monitoring

import { createBrowserClient } from '@/lib/supabase'
import dashboardCache, { CACHE_KEYS, generateCacheKey } from '@/lib/caching/dashboard-cache'
import dashboardMetrics, { trackDataFetch, trackDataFetchComplete, trackCacheOperation } from './dashboard-metrics'

interface QueryOptimizationOptions {
  useCache?: boolean
  cacheKey?: string
  cacheTTL?: number
  enableMetrics?: boolean
  batchSize?: number
}

interface PerformanceConfig {
  enableQueryOptimization: boolean
  enableCaching: boolean
  enableMetrics: boolean
  maxCacheSize: number
  defaultCacheTTL: number
  queryTimeout: number
}

class PerformanceOptimizer {
  private supabase = createBrowserClient()
  private config: PerformanceConfig = {
    enableQueryOptimization: true,
    enableCaching: true,
    enableMetrics: true,
    maxCacheSize: 100,
    defaultCacheTTL: 5 * 60 * 1000, // 5 minutes
    queryTimeout: 10000 // 10 seconds
  }

  constructor(config?: Partial<PerformanceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Optimized database query with caching and metrics
   */
  async optimizedQuery<T>(
    queryBuilder: any,
    options: QueryOptimizationOptions = {}
  ): Promise<T> {
    const {
      useCache = this.config.enableCaching,
      cacheKey,
      cacheTTL = this.config.defaultCacheTTL,
      enableMetrics = this.config.enableMetrics,
      batchSize
    } = options

    const queryId = cacheKey || this.generateQueryId(queryBuilder)
    
    if (enableMetrics) {
      trackDataFetch(queryId)
    }

    // Check cache first
    if (useCache && cacheKey) {
      const cachedResult = dashboardCache.get<T>(cacheKey)
      if (cachedResult) {
        if (enableMetrics) {
          trackCacheOperation('hit', cacheKey)
          trackDataFetchComplete(queryId, Array.isArray(cachedResult) ? cachedResult.length : 1)
        }
        return cachedResult
      }
      if (enableMetrics) {
        trackCacheOperation('miss', cacheKey)
      }
    }

    try {
      // Execute query with timeout
      const queryPromise = this.executeWithTimeout(queryBuilder, this.config.queryTimeout)
      const { data, error } = await queryPromise

      if (error) {
        throw new Error(`Database query failed: ${error.message}`)
      }

      // Cache the result
      if (useCache && cacheKey && data) {
        dashboardCache.set(cacheKey, data, cacheTTL)
        if (enableMetrics) {
          trackCacheOperation('set', cacheKey)
        }
      }

      if (enableMetrics) {
        trackDataFetchComplete(queryId, Array.isArray(data) ? data.length : 1)
      }

      return data as T
    } catch (error) {
      if (enableMetrics) {
        dashboardMetrics.recordMetric(`query_error_${queryId}`, 1, { error: (error as Error).message })
      }
      throw error
    }
  }

  /**
   * Batch multiple queries for better performance
   */
  async batchQueries<T>(
    queries: Array<{ query: any; cacheKey?: string; options?: QueryOptimizationOptions }>
  ): Promise<T[]> {
    const startTime = performance.now()
    
    try {
      const results = await Promise.all(
        queries.map(({ query, cacheKey, options = {} }) =>
          this.optimizedQuery(query, { ...options, cacheKey })
        )
      )

      const duration = performance.now() - startTime
      dashboardMetrics.recordMetric('batch_query_duration', duration, {
        queryCount: queries.length
      })

      return results as T[]
    } catch (error) {
      dashboardMetrics.recordMetric('batch_query_error', 1, {
        queryCount: queries.length,
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Optimized dashboard data fetching
   */
  async fetchDashboardData(userId: string, workspaceId: string) {
    const cacheKey = generateCacheKey(CACHE_KEYS.DASHBOARD_STATS, userId)
    
    return this.optimizedQuery(
      this.supabase.from('products').select('*').eq('workspace_id', workspaceId),
      {
        cacheKey,
        cacheTTL: 2 * 60 * 1000, // 2 minutes for dashboard data
        enableMetrics: true
      }
    )
  }

  /**
   * Optimized product listing with pagination
   */
  async fetchProducts(
    workspaceId: string,
    page: number = 1,
    limit: number = 50,
    filters?: Record<string, any>
  ) {
    const offset = (page - 1) * limit
    const cacheKey = `products_${workspaceId}_${page}_${limit}_${JSON.stringify(filters || {})}`
    
    let query = this.supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        hs_code,
        classification_confidence,
        landed_cost,
        created_at,
        updated_at
      `)
      .eq('workspace_id', workspaceId)
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = (query as any).eq(key, value)
        }
      })
    }

    return this.optimizedQuery(query, {
      cacheKey,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableMetrics: true
    })
  }

  /**
   * Preload critical data for faster navigation
   */
  async preloadCriticalData(userId: string, workspaceId: string) {
    const preloadQueries = [
      {
        query: this.supabase.from('products').select('*').eq('workspace_id', workspaceId),
        cacheKey: generateCacheKey(CACHE_KEYS.DASHBOARD_STATS, userId)
      },
      {
        query: this.supabase
          .from('products')
          .select('id, name, sku, hs_code')
          .eq('workspace_id', workspaceId)
          .limit(20)
          .order('updated_at', { ascending: false }),
        cacheKey: generateCacheKey(CACHE_KEYS.RECENT_PRODUCTS, userId)
      },
      {
        query: this.supabase
          .from('jobs')
          .select('id, type, status, created_at')
          .eq('workspace_id', workspaceId)
          .limit(10)
          .order('created_at', { ascending: false }),
        cacheKey: generateCacheKey(CACHE_KEYS.RECENT_JOBS, userId)
      }
    ]

    try {
      await this.batchQueries(preloadQueries)
      dashboardMetrics.recordMetric('preload_success', 1)
    } catch (error) {
      dashboardMetrics.recordMetric('preload_error', 1, { error: (error as Error).message })
      console.warn('Failed to preload critical data:', error)
    }
  }

  /**
   * Clear cache for specific user or all cache
   */
  clearCache(userId?: string) {
    if (userId) {
      // Clear user-specific cache entries
      Object.values(CACHE_KEYS).forEach(key => {
        const userCacheKey = generateCacheKey(key, userId)
        dashboardCache.delete(userCacheKey)
      })
    } else {
      dashboardCache.clear()
    }
    
    dashboardMetrics.recordMetric('cache_clear', 1, { userId: userId || 'all' })
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      cache: dashboardCache.getStats(),
      metrics: dashboardMetrics.getSummary(),
      config: this.config
    }
  }

  /**
   * Update performance configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  // Private helper methods
  private generateQueryId(queryBuilder: any): string {
    // Generate a simple hash of the query for identification
    const queryString = JSON.stringify(queryBuilder)
    return `query_${this.simpleHash(queryString)}`
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private async executeWithTimeout(queryBuilder: any, timeout: number) {
    return Promise.race([
      queryBuilder,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ])
  }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer()

export default performanceOptimizer
export { PerformanceOptimizer, type PerformanceConfig, type QueryOptimizationOptions }