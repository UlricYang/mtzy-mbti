import type { FilepathConfig, APIConfig } from './types';

/**
 * Registry for managing named API configurations
 */
export class APIConfigRegistry {
  private config: FilepathConfig;

  constructor(config: FilepathConfig) {
    // Deep copy to prevent mutation
    this.config = {
      ...config,
      apis: { ...config.apis },
    };
  }

  /**
   * Get API configuration by name
   */
  get(name: string): APIConfig | undefined {
    return this.config.apis[name];
  }

  /**
   * Get default API configuration
   * Falls back to first configured API if no default specified
   */
  getDefault(): APIConfig | undefined {
    // Use explicitly configured default
    if (this.config.defaultApi) {
      return this.get(this.config.defaultApi);
    }

    // Fall back to first API in the registry
    const names = this.getNames();
    if (names.length > 0) {
      return this.get(names[0]);
    }

    return undefined;
  }

  /**
   * Get API config by name, falling back to default
   */
  getOrDefault(name?: string): APIConfig | undefined {
    if (name) {
      return this.get(name) ?? this.getDefault();
    }
    return this.getDefault();
  }

  /**
   * Check if an API configuration exists
   */
  has(name: string): boolean {
    return name in this.config.apis;
  }

  /**
   * Get all configured API names
   */
  getNames(): string[] {
    return Object.keys(this.config.apis);
  }

  /**
   * Check if any APIs are configured
   */
  hasAPIs(): boolean {
    return this.getNames().length > 0;
  }
}
