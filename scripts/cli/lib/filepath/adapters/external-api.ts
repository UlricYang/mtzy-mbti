import { mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { APIConfigRegistry } from '../api-config';
import { FilepathCache } from '../cache';
import {
    AdapterHealth,
    type FilepathAdapter,
    type FilepathQuery,
    type FilepathResolution,
    type FilepathResult
} from '../types';

/**
 * ExternalAPIAdapter - Calls external API to resolve filepath
 * Priority: 10 (lowest - checked after direct adapter)
 * 
 * API Response Handling:
 * - If response.data is a string: treated as file path, moved to ./data/input
 * - If response.data is an object: treated as JSON data, written to ./data/input
 * - If response.filepath is present: legacy format, returns filepath directly
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

  /**
   * Ensure input directory exists
   */
  private async ensureInputDir(): Promise<string> {
    const inputDir = join(process.cwd(), 'data', 'input');
    const dirExists = await Bun.file(inputDir).exists();
    if (!dirExists) {
      await mkdir(inputDir, { recursive: true });
    }
    return inputDir;
  }

  /**
   * Generate unique filename based on query
   */
  private generateFilename(query: FilepathQuery): string {
    const timestamp = Date.now();
    const sanitizedUserId = query.userid.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `api-${sanitizedUserId}-${timestamp}.json`;
  }

  /**
   * Handle API response data - unify to ./data/input directory
   */
  private async handleResponseData(
    data: unknown,
    query: FilepathQuery
  ): Promise<{ success: true; filepath: string } | { success: false; error: string }> {
    try {
      const inputDir = await this.ensureInputDir();

      // Case 1: API returns a string - treat as file path
      if (typeof data === 'string') {
        const sourcePath = data;
        
        // If it's already in the input directory, return as-is
        if (sourcePath.startsWith(inputDir)) {
          return { success: true, filepath: sourcePath };
        }

        // Move file to ./data/input
        const filename = this.generateFilename(query);
        const targetPath = join(inputDir, filename);
        
        const sourceFile = Bun.file(sourcePath);
        const sourceExists = await sourceFile.exists();
        if (!sourceExists) {
          return { success: false, error: `Source file not found: ${sourcePath}` };
        }

        await rename(sourcePath, targetPath);
        return { success: true, filepath: targetPath };
      }

      // Case 2: API returns an object with 'filepath' field (legacy format)
      if (data && typeof data === 'object' && 'filepath' in data) {
        const filepath = (data as { filepath: string }).filepath;
        
        // If it's already in the input directory, return as-is
        if (filepath.startsWith(inputDir)) {
          return { success: true, filepath };
        }

        // Move file to ./data/input
        const filename = this.generateFilename(query);
        const targetPath = join(inputDir, filename);
        
        const sourceFile = Bun.file(filepath);
        const sourceExists = await sourceFile.exists();
        if (!sourceExists) {
          return { success: false, error: `Source file not found: ${filepath}` };
        }

        await rename(filepath, targetPath);
        return { success: true, filepath: targetPath };
      }

      // Case 3: API returns JSON data directly - write to file
      if (data && typeof data === 'object') {
        const filename = this.generateFilename(query);
        const targetPath = join(inputDir, filename);
        
        await Bun.write(targetPath, JSON.stringify(data, null, 2));
      }

      return { success: false, error: 'Unsupported API response format' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to handle response data: ${errorMsg}` };
    }
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

      const responseData = await response.json();

      // Handle response data - unify to ./data/input directory
      const handleResult = await this.handleResponseData(responseData, query);
      
      if (!handleResult.success) {
        this.healthStats.errorCount++;
        this.healthStats.lastError = handleResult.error;
        
        return {
          success: false,
          error: {
            error: handleResult.error,
            adapter: this.getName(),
          },
        };
      }

      // Create result
      const result: FilepathResult = {
        filepath: handleResult.filepath,
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
