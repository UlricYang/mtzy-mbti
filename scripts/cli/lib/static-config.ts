// scripts/cli/lib/static-config.ts
import type { StaticConfig } from './types';

/**
 * Get default headers for static files
 * 1 year cache for assets (they have content hash in filenames)
 */
export function getStaticHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=31536000', // 1 year for hashed assets
  };
}

/**
 * Create configuration for @elysiajs/static plugin
 * 
 * @param distPath - Path to the dist directory (default: 'dist')
 * @returns StaticConfig for the plugin
 */
export function createStaticConfig(distPath: string = 'dist'): StaticConfig {
  return {
    assets: distPath,
    prefix: '',          // Serve from root
    indexHTML: true,     // Enable SPA fallback routing
    headers: getStaticHeaders(),
  };
}