import { resolve } from 'path';
import { FilepathResolver } from './filepath/resolver';
import { ExportRequest, ExportResponse, ExportResults, ExportContext } from './types';
import { exportLogger } from './logger';
import { ensureDir, reserveAvailablePort, resolveContainerPath, fileExistsAsync } from './file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { normalizeMbtiData } from './data-normalizer';

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
        console.log(`[STATIC SERVER] Data request: ${pathname}`);
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
        console.log(`[STATIC SERVER] SPA route, serving index.html: ${pathname}`);
        filePath = '/index.html';
      }

      // Strip leading slash for correct path resolution
      // resolve('/app/dist', '/assets/index.js') returns '/assets/index.js' (absolute path wins)
      const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const fullPath = resolve(distDir, relativePath);
      console.log(`[STATIC SERVER] Request: ${pathname} -> ${fullPath}`);
      
      const file = Bun.file(fullPath);

      if (await file.exists()) {
        console.log(`[STATIC SERVER] File exists: ${fullPath}`);
        return new Response(file, {
          headers: { 'Content-Type': getContentType(filePath) }
        });
      }
      
      console.log(`[STATIC SERVER] File NOT found: ${fullPath}`);
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
  verbose: boolean = false,
  sharedBrowser?: Browser,
  resolver?: FilepathResolver
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

  const userid = req.userid as string;

  let filepath: string;
  if (req.filepath && typeof req.filepath === 'string') {
    filepath = req.filepath as string;
  } else if (resolver) {
    const resolution = await resolver.resolve({ userid });
    if (!resolution.success) {
      return {
        status: 'error',
        message: `Failed to resolve filepath: ${resolution.error.error}`,
        data: null,
      };
    }
    filepath = resolution.data.filepath;
    console.log(`[DEBUG] Resolved filepath via ${resolution.data.adapter}: ${filepath}`);
  } else {
    return {
      status: 'error',
      message: 'Missing required field: filepath (and no resolver configured)',
      data: null,
    };
  }
  const absoluteFilePath = resolveContainerPath(filepath);
  
  console.log(`[DEBUG] handleExportRequest called: userid=${userid}, filepath=${filepath}, absoluteFilePath=${absoluteFilePath}`);

  logger.info('Exporting report for student: {userid}', { userid });
  logger.debug('File path: {path}', { path: absoluteFilePath });
  logger.debug('Output directory: {dir}', { dir: outputDir });

  // Step 2: Read and validate JSON directly (skip existence check due to Bun quirk)
  let jsonData: Record<string, unknown>;
  try {
    const file = Bun.file(absoluteFilePath);
    const fileContent = await file.text();
    jsonData = JSON.parse(fileContent);
    logger.info('File read successfully: {path}', { path: absoluteFilePath });

    // Normalize mbti data format for React app
    jsonData = normalizeMbtiData(jsonData);

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
    logger.error('File read/parse failed: {error}', { error: errorMsg });
    return {
      status: 'error',
      message: `File not found or invalid JSON: ${errorMsg}`,
      data: null,
    };
  }

  // Ensure output directory exists
  ensureDir(outputDir);

  // Step 4: Reserve available port atomically and start static file server for export
  // Uses Bun.serve to serve dist/ files and handle dynamic data endpoint
  // Atomic reservation prevents race conditions when multiple requests arrive simultaneously
  logger.info('Reserving available port...');
  const portHolder = await reserveAvailablePort(4000);
  const serverPort = portHolder.port;
  logger.info('Port {port} reserved, preparing static server...', { port: serverPort });

  // CRITICAL: Release port BEFORE creating real server
  // The temp server is holding the port; release it first, then bind immediately
  portHolder.releasePort();
  logger.debug('Port reservation released');

  // Small delay to ensure OS has fully released the port
  await new Promise(resolve => setTimeout(resolve, 100));

  // Use dist directory (works for both Docker and local)
  const distDir = (await fileExistsAsync('/app/dist')) ? resolve('/app', 'dist') : resolve('dist');
  const exportServer = createExportServer(serverPort, distDir, jsonData, userid, timestamp);
  logger.info('Static server started on port {port}', { port: serverPort });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 200));

  // Initialize results - actual paths will be set by plugins
  const results: ExportResults = {
    url: '',  // Export endpoint returns empty string for url
    png: '',  // Will be set by PNG plugin
    pdf: '',  // Will be set by PDF plugin
  };

  let browser: Browser | undefined;
  let ownsBrowser = false;

  try {
    if (sharedBrowser && sharedBrowser.isConnected()) {
      // Use shared browser instance
      browser = sharedBrowser;
      logger.debug('Using shared browser instance');
    } else {
      // Fallback: launch our own browser
      browser = await chromium.launch({ headless: true });
      ownsBrowser = true;
      logger.debug('Launched dedicated browser instance');
    }

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
    if (browser && ownsBrowser) {
      await browser.close();
      logger.debug('Closed dedicated browser instance');
    }

    // Stop Bun.serve server
    exportServer.stop();
    logger.debug('Static server stopped');
  }
}