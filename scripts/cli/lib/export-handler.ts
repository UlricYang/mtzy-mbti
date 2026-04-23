import { resolve } from 'path';
import { existsSync } from 'fs';
import { ExportRequest, ExportResponse, ExportResults, ExportContext } from './types';
import { exportLogger } from './logger';
import { ensureDir, findAvailablePort, resolveContainerPath } from './file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';
import { chromium, type Browser } from 'playwright';

/**
 * Validates JSON data structure
 */
function validateJsonStructure(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    'mbti' in obj &&
    'multiple_intelligences' in obj &&
    'student_value' in obj
  );
}

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
      // resolve('/app/dist', '/assets/index.js') returns '/assets/index.js' (absolute path wins)
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

/**
 * Export handler - generates PNG/PDF files directly from file
 * Independent of preview - accepts filepath directly
 */
export async function handleExportRequest(
  request: unknown,
  outputDir: string,
  verbose: boolean = false
): Promise<ExportResponse> {
  const logger = exportLogger;
  const timestamp = Date.now();

  // Step 1: Validate request
  if (!request || typeof request !== 'object') {
    return {
      status: 'error',
      message: 'Invalid request body',
      data: null,
    };
  }

  const req = request as Record<string, unknown>;

  if (!req.userid || typeof req.userid !== 'string') {
    return {
      status: 'error',
      message: 'Missing required field: userid',
      data: null,
    };
  }

  if (!req.filepath || typeof req.filepath !== 'string') {
    return {
      status: 'error',
      message: 'Missing required field: filepath',
      data: null,
    };
  }

  const userid = req.userid as string;
  const filepath = req.filepath as string;
  const absoluteFilePath = resolveContainerPath(filepath);

  logger.info('Exporting report for student: {userid}', { userid });
  logger.debug('File path: {path}', { path: absoluteFilePath });
  logger.debug('Output directory: {dir}', { dir: outputDir });

  // Step 2: Validate file exists
  if (!existsSync(absoluteFilePath)) {
    logger.error('File not found: {path}', { path: absoluteFilePath });
    return {
      status: 'error',
      message: `File not found: ${absoluteFilePath}`,
      data: null,
    };
  }

  // Step 3: Read and validate JSON structure
  let jsonData: Record<string, unknown>;
  try {
    const fileContent = await Bun.file(absoluteFilePath).text();
    jsonData = JSON.parse(fileContent);

    if (!validateJsonStructure(jsonData)) {
      logger.error('Invalid data: missing required fields');
      return {
        status: 'error',
        message: 'Invalid data: missing required fields (mbti, multiple_intelligences, student_value)',
        data: null,
      };
    }
    logger.debug('JSON structure validated');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('JSON parsing failed: {error}', { error: errorMsg });
    return {
      status: 'error',
      message: `Invalid JSON: ${errorMsg}`,
      data: null,
    };
  }

  // Ensure output directory exists
  ensureDir(outputDir);

  // Step 4: Find available port and start static file server for export
  // Uses Bun.serve to serve dist/ files and handle dynamic data endpoint
  logger.info('Finding available port...');
  const serverPort = await findAvailablePort(4000);
  logger.info('Starting static server on port {port}...', { port: serverPort });

  // Use dist directory (works for both Docker and local)
  const distDir = existsSync('/app/dist') ? resolve('/app', 'dist') : resolve('dist');
  const exportServer = createExportServer(serverPort, distDir, jsonData, userid, timestamp);

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 500));

  // Initialize results - actual paths will be set by plugins
  const results: ExportResults = {
    url: '',  // Export endpoint returns empty string for url
    png: '',  // Will be set by PNG plugin
    pdf: '',  // Will be set by PDF plugin
  };

  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });

    // Run PNG export
    logger.info('Generating PNG...');
    const exportContext: ExportContext = {
      input: absoluteFilePath,
      output: outputDir,
      tag: userid,
      timestamp,
      quality: 'standard' as const,
      verbose,
      browser,
      server: null as any,  // Not used with Bun.serve
      dataFileName: '',
      serverPort,
    };

    const pngResult = await exportPngPlugin.execute(exportContext);
    if (!pngResult.success) {
      logger.error('PNG generation failed: {error}', { error: pngResult.error });
      throw new Error(pngResult.error || 'PNG generation failed');
    }
    if (pngResult.path) {
      results.png = pngResult.path;
    }

    // Run PDF export
    logger.info('Generating PDF...');
    const pdfResult = await exportPdfPlugin.execute(exportContext);
    if (!pdfResult.success) {
      logger.error('PDF generation failed: {error}', { error: pdfResult.error });
      throw new Error(pdfResult.error || 'PDF generation failed');
    }
    if (pdfResult.path) {
      results.pdf = pdfResult.path;
    }

    logger.info('Export completed');

    return {
      status: 'success',
      message: null,
      data: {
        id: userid,
        timestamp,
        results,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Export failed: {error}', { error: errorMsg });

    return {
      status: 'error',
      message: `Export failed: ${errorMsg}`,
      data: null,
    };
  } finally {
    if (browser) {
      await browser.close();
    }

    // Stop Bun.serve server
    exportServer.stop();
    logger.debug('Static server stopped');
  }
}