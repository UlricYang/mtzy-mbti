/**
 * Filepath Adapter Types
 *
 * Type definitions for the filepath resolution adapter system.
 * Supports direct filepath from request body OR fallback to external API calls.
 */

/**
 * Query for filepath resolution
 */
export interface FilepathQuery {
  /** Required - student/user identifier */
  userid: string;
  /** Optional - direct filepath from request body */
  filepath?: string;
  /** Optional - data type filter for API */
  data_type?: string;
  /** Optional - report identifier for API */
  report_id?: string;
  /** Optional - named API to use */
  api_name?: string;
}

/**
 * Result from filepath resolution
 */
export interface FilepathResult {
  /** Resolved filepath */
  filepath: string;
  /** Adapter name that resolved it */
  adapter: string;
  /** Where the filepath came from */
  source: 'body' | 'api' | 'cache';
  /** Whether result was from cache */
  cached: boolean;
}

/**
 * Error result from filepath resolution
 */
export interface FilepathError {
  /** Error message */
  error: string;
  /** Adapter that failed (if applicable) */
  adapter?: string;
}

/**
 * Combined result type for filepath resolution
 */
export type FilepathResolution =
  | { success: true; data: FilepathResult }
  | { success: false; error: FilepathError };

/**
 * Health status for an adapter
 */
export interface AdapterHealth {
  /** Current health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp of last check */
  lastCheck?: number;
  /** Average latency in ms */
  latency?: number;
  /** Error rate (0-1) */
  errorRate?: number;
  /** Total error count */
  errorCount?: number;
  /** Total success count */
  successCount?: number;
}

/** Health status type alias */
export type HealthStatus = AdapterHealth['status'];

/**
 * FilepathAdapter interface - all adapters implement this
 */
export interface FilepathAdapter {
  /** Unique adapter name */
  getName(): string;
  /** Higher = checked first */
  getPriority(): number;
  /** Can this adapter resolve? */
  isAvailable(): boolean;
  /** Attempt to resolve filepath */
  resolveFilepath(query: FilepathQuery): Promise<FilepathResolution>;
  /** Optional health check */
  getHealthStatus?(): AdapterHealth;
}

/**
 * API configuration for external API calls
 */
export interface APIConfig {
  /** API endpoint URL */
  url: string;
  /** HTTP method (default: POST) */
  method?: 'GET' | 'POST';
  /** Custom headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
  /** Request body format (default: json) */
  bodyFormat?: 'json' | 'form';
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable/disable caching */
  enabled: boolean;
  /** Time-to-live in seconds */
  ttlSeconds: number;
  /** Maximum cache entries */
  maxSize?: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Enable health tracking */
  enabled: boolean;
  /** Health check interval in ms */
  intervalMs?: number;
}

/**
 * Main configuration for filepath resolution
 */
export interface FilepathConfig {
  /** Enabled adapter names */
  adapters: string[];
  /** Default API name */
  defaultApi?: string;
  /** Named API configurations */
  apis: Record<string, APIConfig>;
  /** Cache settings */
  cache?: CacheConfig;
  /** Health check settings */
  healthCheck?: HealthCheckConfig;
}
