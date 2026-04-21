// tests/cli/lib/static-config.test.ts
import { describe, it, expect } from 'bun:test';
import { createStaticConfig, getStaticHeaders } from '../../../scripts/cli/lib/static-config';

describe('static-config', () => {
  describe('createStaticConfig', () => {
    it('should create default config for dist directory', () => {
      const config = createStaticConfig();
      
      expect(config.assets).toBe('dist');
      expect(config.prefix).toBe('');
      expect(config.indexHTML).toBe(true);
    });

    it('should create config with custom dist path', () => {
      const config = createStaticConfig('custom-dist');
      
      expect(config.assets).toBe('custom-dist');
    });

    it('should include cache control headers', () => {
      const config = createStaticConfig();
      
      expect(config.headers).toBeDefined();
      expect(config.headers!['Cache-Control']).toBeDefined();
    });
  });

  describe('getStaticHeaders', () => {
    it('should return headers for static assets', () => {
      const headers = getStaticHeaders();
      
      expect(headers['Cache-Control']).toBe('public, max-age=31536000');
    });
  });
});
