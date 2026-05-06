import type { 
  FilepathAdapter, 
  FilepathQuery, 
  FilepathResolution,
  AdapterHealth 
} from '../types';

/**
 * DirectAdapter - Returns filepath directly from request body
 * Priority: 100 (highest - checked first)
 * 
 * This adapter short-circuits the resolution chain when a filepath
 * is provided directly in the request body.
 */
export class DirectAdapter implements FilepathAdapter {
  getName(): string {
    return 'direct';
  }

  getPriority(): number {
    return 100;
  }

  isAvailable(): boolean {
    // Always available - no external dependencies
    return true;
  }

  async resolveFilepath(query: FilepathQuery): Promise<FilepathResolution> {
    // Check if filepath is provided and non-empty
    if (!query.filepath || query.filepath.trim() === '') {
      return {
        success: false,
        error: {
          error: 'No filepath provided in request body',
          adapter: this.getName(),
        },
      };
    }

    return {
      success: true,
      data: {
        filepath: query.filepath,
        adapter: this.getName(),
        source: 'body',
        cached: false,
      },
    };
  }

  getHealthStatus(): AdapterHealth {
    return {
      status: 'healthy',
      lastCheck: Date.now(),
    };
  }
}
