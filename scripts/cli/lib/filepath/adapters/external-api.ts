import type {
  FilepathAdapter,
  FilepathQuery,
  FilepathResolution,
  FilepathResult,
  APIConfig,
  AdapterHealth,
} from '../types';
import { FilepathCache } from '../cache';
import { APIConfigRegistry } from '../api-config';

/**
 * ExternalAPIAdapter - Calls external API to resolve filepath
 * Priority: 10 (lowest - checked after direct adapter)
 */
export class ExternalAPIAdapter implements FilepathAdapter {
  private registry: APIConfigRegistry;
  private cache: FilepathCache;
  private healthStats: {
    successCount: number;
    errorCount: number;
    totalLatency: number;
    lastError?: string;
  } = { successCount: 0, errorCount: 0, totalLatency: 0 };

  constructor(registry: APIConfigRegistry, cache: FilepathCache) {
    this.registry = registry;
    this.cache = cache;
  }

  getName(): string {
    return 'external_api';
  }

  getPriority(): number {
    return 10;
  }

  isAvailable(): boolean {
    return this.registry.hasAPIs();
  }

  async resolveFilepath(query: FilepathQuery): Promise<FilepathResolution> {
    const cacheKey = FilepathCache.generateKey(
      query.userid,
      query.data_type,
      query.report_id
    );

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        success: true,
        data: { ...cached, cached: true },
      };
    }

    // Get API config
    const apiConfig = this.registry.getOrDefault(query.api_name);
    if (!apiConfig) {
      return {
        success: false,
        error: {
          error: 'No API configured for filepath resolution',
          adapter: this.getName(),
        },
      };
    }

    const startTime = Date.now();

    try {
      // Use Bun's native fetch
      const response = await fetch(apiConfig.url, {
        method: apiConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiConfig.headers,
        },
        body: JSON.stringify({
          userid: query.userid,
          data_type: query.data_type,
          report_id: query.report_id,
        }),
        signal: AbortSignal.timeout(apiConfig.timeout || 5000),
      });

      const latency = Date.now() - startTime;
      this.healthStats.totalLatency += latency;

      if (!response.ok) {
        const errorMsg = `API returned ${response.status}: ${response.statusText}`;
        this.healthStats.errorCount++;
        this.healthStats.lastError = errorMsg;

        return {
          success: false,
          error: {
            error: errorMsg,
            adapter: this.getName(),
          },
        };
      }

      const data = await response.json();

      // Validate response format
      if (!data.filepath) {
        const errorMsg = 'API response missing filepath field';
        this.healthStats.errorCount++;
        this.healthStats.lastError = errorMsg;

        return {
          success: false,
          error: {
            error: errorMsg,
            adapter: this.getName(),
          },
        };
      }

      // Create result
      const result: FilepathResult = {
        filepath: data.filepath,
        adapter: this.getName(),
        source: 'api',
        cached: false,
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      // Update health stats
      this.healthStats.successCount++;

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.healthStats.errorCount++;
      this.healthStats.lastError = errorMsg;

      return {
        success: false,
        error: {
          error: `API call failed: ${errorMsg}`,
          adapter: this.getName(),
        },
      };
    }
  }

  getHealthStatus(): AdapterHealth {
    const total = this.healthStats.successCount + this.healthStats.errorCount;
    const errorRate = total > 0 ? this.healthStats.errorCount / total : 0;
    const avgLatency = this.healthStats.successCount > 0
      ? this.healthStats.totalLatency / this.healthStats.successCount
      : 0;

    let status: AdapterHealth['status'] = 'healthy';
    if (errorRate > 0.5 || this.healthStats.errorCount > 10) {
      status = 'unhealthy';
    } else if (errorRate > 0.1 || avgLatency > 5000) {
      status = 'degraded';
    }

    return {
      status,
      lastCheck: Date.now(),
      latency: avgLatency,
      errorRate,
      errorCount: this.healthStats.errorCount,
      successCount: this.healthStats.successCount,
    };
  }
}
