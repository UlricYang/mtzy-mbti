// tests/cli/lib/preview-handler-static.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { handlePreviewRequest } from '../../../scripts/cli/lib/preview-handler';
import type { PreviewStore } from '../../../scripts/cli/lib/types';

const TEST_DIR = 'test-preview-static';
const TEST_INPUTS_DIR = join(TEST_DIR, 'inputs');

describe('preview-handler-static', () => {
  let previewStore: PreviewStore;
  const validTestData = {
    mbti: { INTJ: { career_match: 'Engineer' } },
    multiple_intelligences: { test: 1 },
    student_value: { test: 1 },
  };

  beforeEach(() => {
    previewStore = new Map();
    mkdirSync(TEST_INPUTS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('handlePreviewRequest', () => {
    it('should generate URL with provided port (3000 for production)', async () => {
      const inputFile = join(TEST_INPUTS_DIR, 'test.json');
      writeFileSync(inputFile, JSON.stringify(validTestData));

      const response = await handlePreviewRequest(
        { userid: '20240001', filepath: inputFile },
        previewStore,
        3000,  // Production port
        false
      );

      expect(response.status).toBe('success');
      expect(response.data).not.toBeNull();
      expect(response.data!.results.url).toContain('localhost:3000');
      expect(response.data!.results.url).not.toContain('localhost:3001');
    });

    it('should store preview data with correct key format', async () => {
      const inputFile = join(TEST_INPUTS_DIR, 'test.json');
      writeFileSync(inputFile, JSON.stringify(validTestData));

      await handlePreviewRequest(
        { userid: '20240001', filepath: inputFile },
        previewStore,
        3000,
        false
      );

      // Should have exactly one entry
      expect(previewStore.size).toBe(1);
      
      // Key should match format: userid-timestamp
      const key = Array.from(previewStore.keys())[0];
      expect(key).toMatch(/^20240001-\d{14}$/);  // YYYYMMDDHHmmss format
    });

    it('should return error for missing filepath', async () => {
      const response = await handlePreviewRequest(
        { userid: '20240001' },
        previewStore,
        3000,
        false
      );

      expect(response.status).toBe('error');
      expect(response.message).toContain('filepath');
    });

    it('should return error for non-existent file', async () => {
      const response = await handlePreviewRequest(
        { userid: '20240001', filepath: '/nonexistent/path.json' },
        previewStore,
        3000,
        false
      );

      expect(response.status).toBe('error');
      expect(response.message).toContain('File not found');
    });
  });
});