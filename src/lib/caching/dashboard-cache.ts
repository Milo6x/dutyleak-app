// Dashboard data caching utility
// Implements simple in-memory caching with TTL (Time To Live)

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      // Entry has expired
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Create a singleton instance
const dashboardCache = new DashboardCache()

// Clean up expired entries every 10 minutes
// Removed 'if (typeof window !== "undefined")' to allow this to run server-side as well,
// assuming a long-lived server process where setInterval is meaningful.
// For serverless functions, cleanup-on-access remains the primary mechanism.
setInterval(() => {
  dashboardCache.cleanup()
  // console.log('Dashboard cache cleanup executed.'); // Optional: for debugging
}, 10 * 60 * 1000)

export default dashboardCache

// Cache keys constants
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  RECENT_PRODUCTS: 'recent_products',
  RECENT_JOBS: 'recent_jobs',
  PRODUCTS_COUNT: 'products_count',
  ACTIVE_JOBS_COUNT: 'active_jobs_count',
  PENDING_REVIEWS_COUNT: 'pending_reviews_count'
} as const

// Helper function to generate cache key with user context
export const generateCacheKey = (baseKey: string, userId?: string): string => {
  return userId ? `${baseKey}_${userId}` : baseKey
}
