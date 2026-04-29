/**
 * Filepath Configuration Loader
 *
 * Loads and merges configuration using c12.
 * Supports: filepath.config.ts, .filepathrc, .filepathrc.json
 */

import { loadConfig } from 'c12';
import type { FilepathConfig } from './types';

// Default configuration
const DEFAULT_CONFIG: FilepathConfig = {
  adapters: ['direct', 'external_api'],
  defaultApi: undefined,
  apis: {},
  cache: {
    enabled: true,
    ttlSeconds: 86400, // 24 hours
  },
  healthCheck: {
    enabled: true,
    intervalMs: 60000,
  },
};

/**
 * Load filepath configuration
 * Supports: filepath.config.ts, .filepathrc, .filepathrc.json
 *
 * @param cwd - Working directory to search for config files (defaults to process.cwd())
 * @returns Merged configuration with defaults
 */
export async function loadFilepathConfig(cwd?: string): Promise<FilepathConfig> {
  const { config } = await loadConfig<FilepathConfig>({
    name: 'filepath',
    cwd: cwd || process.cwd(),
    defaults: DEFAULT_CONFIG,
  });

  return config;
}

export { DEFAULT_CONFIG };
