// tests/cli/lib/types-static.test.ts
import { describe, it, expect } from 'bun:test';
import type { ServerOptions, StaticConfig } from '../../../scripts/cli/lib/types';

describe('types-static', () => {
  describe('ServerOptions', () => {
    it('should accept vitePort as optional', () => {
      const options1: ServerOptions = {
        port: 3000,
        output: './output',
        verbose: false,
      };
      expect(options1.vitePort).toBeUndefined();

      const options2: ServerOptions = {
        port: 3000,
        vitePort: 3001,
        output: './output',
        verbose: false,
      };
      expect(options2.vitePort).toBe(3001);
    });

    it('should accept devMode flag for distinguishing dev/prod', () => {
      const options: ServerOptions = {
        port: 3000,
        output: './output',
        verbose: false,
        devMode: true,
      };
      expect(options.devMode).toBe(true);
    });
  });

  describe('StaticConfig', () => {
    it('should define correct static serving configuration', () => {
      const config: StaticConfig = {
        assets: 'dist',
        prefix: '',
        indexHTML: true,
        headers: {
          'Cache-Control': 'public, max-age=31536000',
        },
      };
      expect(config.assets).toBe('dist');
      expect(config.indexHTML).toBe(true);
    });
  });
});