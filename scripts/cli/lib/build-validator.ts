// scripts/cli/lib/build-validator.ts
import { existsSync } from 'fs';
import { join } from 'path';

export interface BuildValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Check if the dist directory exists
 */
export function checkDistExists(distPath: string): boolean {
  return existsSync(distPath);
}

/**
 * Get the path to index.html in dist directory
 * Returns null if not found
 */
export function getDistIndexHtml(distPath: string): string | null {
  const indexPath = join(distPath, 'index.html');
  return existsSync(indexPath) ? indexPath : null;
}

/**
 * Validate that the build output exists and is ready for serving
 * Returns validation result with error message and suggestion if invalid
 */
export function validateBuild(distPath: string = 'dist'): BuildValidationResult {
  // Check if dist directory exists
  if (!checkDistExists(distPath)) {
    return {
      valid: false,
      error: `dist directory not found at "${distPath}"`,
      suggestion: 'Please run "bun run build" first to generate the production build.',
    };
  }

  // Check if index.html exists (required for SPA)
  const indexPath = getDistIndexHtml(distPath);
  if (!indexPath) {
    return {
      valid: false,
      error: `index.html not found in "${distPath}"`,
      suggestion: 'The build may be incomplete. Please run "bun run build" again.',
    };
  }

  return { valid: true };
}
