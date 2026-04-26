import { execSync, spawn } from 'child_process';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { chromium, type Browser } from 'playwright';
import { ExportOptions, ExportContext, OutputFormat } from '../lib/types';
import { exportLogger } from '../lib/logger';
import { ensureDir, resolveInputPath, parseFormats, findAvailablePort } from '../lib/file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';
import { exportHtmlPlugin } from '../plugins/export-html';
import { normalizeMbtiData } from '../lib/data-normalizer';
const plugins = [exportPngPlugin, exportPdfPlugin, exportHtmlPlugin];

/**
 * Get Content-Type header based on file extension
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'css': 'text/css',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Creates a static file server for export that:
 * 1. Serves files from dist/ directory
 * 2. Handles /report/{userid}/{timestamp}/data endpoint for dynamic data
 */
function createExportServer(
  port: number,
  distDir: string,
  data: Record<string, unknown>,
  userid: string,
  timestamp: number
) {
  const timestampStr = String(timestamp);
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Handle data endpoint for preview mode
      const dataMatch = pathname.match(/^\/report\/([^\/]+)\/([^\/]+)\/data$/);
      if (dataMatch) {
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Serve static files from dist/
      let filePath = pathname;
      if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
      }

      // Handle SPA routing for /report/{userid}/{timestamp}
      const previewMatch = pathname.match(/^\/report\/([^\/]+)\/([^\/]+)(?:\/[^\/]*)?$/);
      if (previewMatch && !pathname.includes('/data')) {
        filePath = '/index.html';
      }

      // Strip leading slash for correct path resolution
      const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const fullPath = resolve(distDir, relativePath);
      const file = Bun.file(fullPath);

      if (await file.exists()) {
        return new Response(file, {
          headers: { 'Content-Type': getContentType(filePath) }
        });
      }

      // Fallback to index.html for SPA
      const indexFile = Bun.file(resolve(distDir, 'index.html'));
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  return server;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  const { input, output, tag, format, verbose, quality } = options;
  const imageQuality = quality || 'standard';

  exportLogger.info('Exporting report...');
  exportLogger.debug('Input: {input}, Output: {output}, Tag: {tag}, Format: {format}', { input, output, tag, format });

  const { paths } = resolveInputPath(input);
  const inputPath = paths[0];

  ensureDir(output);

  const publicDir = 'public';
  ensureDir(publicDir);

  const dataFileName = basename(inputPath);
  const targetPath = resolve(publicDir, dataFileName);

  try {
    await Bun.write(targetPath, Bun.file(inputPath));
    exportLogger.info('Copied data to: {targetPath}', { targetPath });
  } catch (error) {
    exportLogger.error('Failed to copy data file: {error}', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }

  // Skip build in container environment where /app/dist exists (pre-built)
  // This ensures CLI uses the same pre-built dist as Web service
  const isContainer = existsSync('/app/dist');
  if (!isContainer) {
    exportLogger.info('Building project...');
    try {
      execSync('bun run build', {
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_DATA_PATH: dataFileName,
        },
      });
      exportLogger.info('Build completed');
    } catch (error) {
      exportLogger.error('Build failed');
      process.exit(1);
    }
  } else {
    exportLogger.info('Using pre-built dist from container...');
  }

  const formats = parseFormats(format);
  exportLogger.debug('Formats to generate: {formats}', { formats: formats.join(', ') });

  // Find available port and start export server
  exportLogger.info('Finding available port...');
  const serverPort = await findAvailablePort(4000);
  exportLogger.info('Starting export server on port {port}...', { port: serverPort });

  // Use dist directory
  const distDir = existsSync('/app/dist') ? resolve('/app', 'dist') : resolve('dist');

  // Read and parse data for dynamic serving
  const jsonData = normalizeMbtiData(JSON.parse(await Bun.file(inputPath).text()));
  const timestamp = Date.now();

  // Create and start the export server
  const exportServer = createExportServer(serverPort, distDir, jsonData, 'export', timestamp);
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 500));

  let browser: Browser | undefined;
  const results: Record<OutputFormat, { success: boolean; path?: string; error?: string }> = {} as any;
  try {
    // Use Playwright's bundled Chromium in headless mode
    // Simple config works best - complex args cause issues in container
    exportLogger.info('Launching Chromium...');
    browser = await chromium.launch({
      headless: true,
    });
    const context: ExportContext = {
      input: inputPath,
      output,
      tag,
      timestamp,
      quality: imageQuality,
      verbose,
      browser,
      server: null as any,  // Not used with Bun.serve
      serverPort,
      dataFileName,
    };

    for (const fmt of formats) {
      const plugin = plugins.find(p => p.name === fmt);
      if (plugin) {
        exportLogger.info('Running {format} plugin...', { format: fmt.toUpperCase() });
        results[fmt] = await plugin.execute(context);
      } else {
        exportLogger.warn('No plugin found for format: {format}', { format: fmt });
        results[fmt] = { success: false, error: `No plugin for ${fmt}` };
      }
    }
  } catch (error) {
    exportLogger.error('Export failed: {error}', { error: error instanceof Error ? error.message : String(error) });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  exportLogger.debug('Cleaning up...');

  if (exportServer) {
    exportServer.stop();
    exportLogger.debug('Export server stopped');
  }

  const targetFile = Bun.file(targetPath);
  if (await targetFile.exists()) {
    try {
      await targetFile.unlink();
      exportLogger.debug('Cleaned up: {targetPath}', { targetPath });
    } catch (error) {
      exportLogger.debug('Failed to cleanup {targetPath}: {error}', { targetPath, error: error instanceof Error ? error.message : String(error) });
    }
  }

  exportLogger.info('Export completed!');
  exportLogger.info('Output directory: {output}', { output: resolve(output) });

  for (const [fmt, result] of Object.entries(results)) {
    if (result.success && result.path) {
      exportLogger.info('{format}: {path}', { format: fmt.toUpperCase(), path: result.path });
    } else if (result.error) {
      exportLogger.warn('{format}: {error}', { format: fmt.toUpperCase(), error: result.error });
    }
  }
}
