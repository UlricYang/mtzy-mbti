import type { CacheConfig, FilepathResult } from './types';

interface CacheEntry {
  value: FilepathResult;
  expiresAt: number;
}

/**
 * In-memory cache with TTL support for filepath results
 */
export class FilepathCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Generate cache key from query parameters
   */
  static generateKey(userid: string, dataType?: string, reportId?: string): string {
    return `${userid}:${dataType || ''}:${reportId || ''}`;
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get cached value if not expired
   */
  get(key: string): FilepathResult | undefined {
    if (!this.config.enabled) return undefined;
    
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  /**
   * Set cached value with TTL
   */
  set(key: string, value: FilepathResult): void {
    if (!this.config.enabled) return;
    
    // Enforce max size (LRU-style: remove oldest)
    if (this.config.maxSize && this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.config.ttlSeconds * 1000,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    if (!this.config.enabled) return false;
    
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(intervalMs: number = 60000): void {
    this.stopPeriodicCleanup();
    this.cleanupInterval = setInterval(() => this.cleanup(), intervalMs);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
