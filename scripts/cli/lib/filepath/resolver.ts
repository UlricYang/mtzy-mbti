import type {
  FilepathAdapter,
  FilepathQuery,
  FilepathResolution,
  FilepathResult,
  FilepathConfig,
  AdapterHealth,
  CacheConfig,
} from './types';
import { FilepathCache } from './cache';
import { APIConfigRegistry } from './api-config';
import { DirectAdapter } from './adapters/direct';
import { ExternalAPIAdapter } from './adapters/external-api';
import { loadFilepathConfig } from './config-loader';

/**
 * FilepathResolver - Orchestrates adapter chain for filepath resolution
 *
 * Manages multiple adapters sorted by priority. Attempts to resolve
 * filepath by iterating through available adapters until one succeeds.
 */
export class FilepathResolver {
  private adapters: FilepathAdapter[];
  private cache: FilepathCache;

  constructor(adapters: FilepathAdapter[], cache: FilepathCache) {
    // Sort adapters by priority (descending - higher first)
    this.adapters = [...adapters].sort((a, b) => b.getPriority() - a.getPriority());
    this.cache = cache;
  }

  /**
   * Resolve filepath using adapter chain
   * Iterates through adapters sorted by priority, returns first successful result
   */
  async resolve(query: FilepathQuery): Promise<FilepathResolution> {
    const errors: { adapter: string; error: string }[] = [];

    for (const adapter of this.adapters) {
      // Skip unavailable adapters
      if (!adapter.isAvailable()) {
        continue;
      }

      const result = await adapter.resolveFilepath(query);

      if (result.success) {
        return result;
      } else {
        errors.push({
          adapter: result.error.adapter || adapter.getName(),
          error: result.error.error,
        });
      }
    }

    // All adapters failed
    const errorMessage = errors.length > 0
      ? `All adapters failed: ${errors.map(e => `[${e.adapter}] ${e.error}`).join('; ')}`
      : 'No adapters available for filepath resolution';

    return {
      success: false,
      error: {
        error: errorMessage,
      },
    };
  }

  /**
   * Get names of all configured adapters
   */
  getAdapterNames(): string[] {
    return this.adapters.map(a => a.getName());
  }

  /**
   * Get health status for all adapters
   */
  getAdapterHealth(): Record<string, AdapterHealth> {
    const health: Record<string, AdapterHealth> = {};

    for (const adapter of this.adapters) {
      if (adapter.getHealthStatus) {
        health[adapter.getName()] = adapter.getHealthStatus();
      }
    }

    return health;
  }

  /**
   * Start cache cleanup interval
   */
  startCacheCleanup(intervalMs: number = 60000): void {
    this.cache.startPeriodicCleanup(intervalMs);
  }

  /**
   * Stop cache cleanup interval
   */
  stopCacheCleanup(): void {
    this.cache.stopPeriodicCleanup();
  }

  /**
   * Create resolver from configuration
   * Factory method that loads config and creates resolver with appropriate adapters
   */
  static async createFromConfig(cwd?: string): Promise<FilepathResolver> {
    const config = await loadFilepathConfig(cwd);

    const cacheConfig: CacheConfig = config.cache || {
      enabled: true,
      ttlSeconds: 86400,
    };
    const cache = new FilepathCache(cacheConfig);

    const registry = new APIConfigRegistry(config);

    const adapters: FilepathAdapter[] = [];

    for (const adapterName of config.adapters) {
      switch (adapterName) {
        case 'direct':
          adapters.push(new DirectAdapter());
          break;
        case 'external_api':
          adapters.push(new ExternalAPIAdapter(registry, cache));
          break;
        default:
          console.warn(`Unknown adapter: ${adapterName}`);
      }
    }

    const resolver = new FilepathResolver(adapters, cache);

    // Start periodic cache cleanup if cache is enabled
    if (cacheConfig.enabled && config.healthCheck?.enabled !== false) {
      resolver.startCacheCleanup(config.healthCheck?.intervalMs);
    }

    return resolver;
  }
}

export { FilepathCache, APIConfigRegistry };
