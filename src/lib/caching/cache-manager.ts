export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

export class CacheManager {
  private cache: Map<string, { value: any, expiry: number }>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns Cached value or null if not found or expired
   */
  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item has expired
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (default: 3600 = 1 hour)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a value from the cache
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get a value from the cache or compute it if not found
   * @param key - Cache key
   * @param fn - Function to compute the value if not found
   * @param options - Cache options
   * @returns Cached or computed value
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cachedValue = await this.get(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    const value = await fn();
    await this.set(key, value, options.ttl);
    
    return value;
  }
}
