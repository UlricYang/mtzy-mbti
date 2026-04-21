// tests/cli/lib/build-validator.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateBuild, checkDistExists, getDistIndexHtml } from '../../../scripts/cli/lib/build-validator';

const TEST_DIST_DIR = 'test-dist-temp';

describe('build-validator', () => {
  beforeEach(() => {
    // Clean up any existing test directory
    if (existsSync(TEST_DIST_DIR)) {
      rmSync(TEST_DIST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory after each test
    if (existsSync(TEST_DIST_DIR)) {
      rmSync(TEST_DIST_DIR, { recursive: true });
    }
  });

  describe('checkDistExists', () => {
    it('should return false when dist directory does not exist', () => {
      expect(checkDistExists('nonexistent-dist')).toBe(false);
    });

    it('should return true when dist directory exists', () => {
      mkdirSync(TEST_DIST_DIR, { recursive: true });
      expect(checkDistExists(TEST_DIST_DIR)).toBe(true);
    });
  });

  describe('getDistIndexHtml', () => {
    it('should return null when index.html does not exist', () => {
      mkdirSync(TEST_DIST_DIR, { recursive: true });
      expect(getDistIndexHtml(TEST_DIST_DIR)).toBeNull();
    });

    it('should return path when index.html exists', () => {
      mkdirSync(TEST_DIST_DIR, { recursive: true });
      writeFileSync(join(TEST_DIST_DIR, 'index.html'), '<html></html>');
      const result = getDistIndexHtml(TEST_DIST_DIR);
      expect(result).toBe(join(TEST_DIST_DIR, 'index.html'));
    });
  });

  describe('validateBuild', () => {
    it('should return invalid when dist directory does not exist', () => {
      const result = validateBuild('nonexistent-dist');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dist directory not found');
      expect(result.suggestion).toContain('bun run build');
    });

    it('should return invalid when index.html is missing', () => {
      mkdirSync(TEST_DIST_DIR, { recursive: true });
      const result = validateBuild(TEST_DIST_DIR);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('index.html not found');
    });

    it('should return valid when dist and index.html exist', () => {
      mkdirSync(TEST_DIST_DIR, { recursive: true });
      writeFileSync(join(TEST_DIST_DIR, 'index.html'), '<html></html>');
      const result = validateBuild(TEST_DIST_DIR);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
