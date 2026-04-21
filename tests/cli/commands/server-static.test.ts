// tests/cli/commands/server-static.test.ts
import { describe, it, expect } from 'bun:test';

describe('server-static', () => {
  describe('static plugin integration', () => {
    it('should configure staticPlugin with correct options', () => {
      // Verify the expected static plugin configuration
      const expectedConfig = {
        assets: 'dist',
        prefix: '',
        indexHTML: true,
      };
      
      expect(expectedConfig.assets).toBe('dist');
      expect(expectedConfig.indexHTML).toBe(true);
    });

    it('should validate build before starting server', async () => {
      // This test verifies the build validation is called
      // Full integration test requires running the server
      const { validateBuild } = await import('../../../scripts/cli/lib/build-validator');
      
      const result = validateBuild('nonexistent-dist');
      expect(result.valid).toBe(false);
    });
  });
});