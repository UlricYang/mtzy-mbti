import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { chromium, type Browser } from 'playwright';
import { ReportRequest, ReportResponse, ReportResults, PreviewStore } from './types';
import { normalizeMbtiData } from './data-normalizer';
import { reportLogger } from './logger';
import { ensureDir, formatTimestampForFilename, reserveAvailablePort, resolveContainerPath, fileExistsAsync } from './file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';

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

/**
 * Validates that the JSON file has required structure
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
 * Validates request parameters
 */
function validateRequest(request: unknown): { valid: boolean; error?: string } {
  if (!request || typeof request !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const req = request as Record<string, unknown>;
  
  if (!req.userid || typeof req.userid !== 'string') {
    return { valid: false, error: 'Missing required field: userid' };
  }
  
  if (!req.filepath || typeof req.filepath !== 'string') {
    return { valid: false, error: 'Missing required field: filepath' };
  }
  
  return { valid: true };
}

/**
 * Generates timestamp for file naming (Unix milliseconds)
 */
function generateTimestamp(): number {
  return Date.now();
}

/**
 * Core report generation handler
 * Generates PNG/PDF files and stores data for preview
 * @param request - The report request containing userid and filepath
 * @param outputDir - Directory to write output files
 * @param previewStore - In-memory store for preview data
 * @param serverPort - Port for the preview server (unified server architecture)
 * @param verbose - Enable verbose logging
 */
export async function handleReportRequest(
  request: unknown,
  outputDir: string,
  previewStore: PreviewStore,
  serverPort: number,  // Changed from vitePort for unified server
  verbose: boolean = false,
  devMode: boolean = false,
  host?: string
): Promise<ReportResponse> {
  const logger = reportLogger;

  // Step 1: Validate request parameters
  const validation = validateRequest(request);
  if (!validation.valid) {
    logger.error('Validation failed: {error}', { error: validation.error });
    return {
      status: 'error',
      message: validation.error || 'Invalid request',
      data: null,
    };
  }

  const req = request as ReportRequest;
  const { userid, filepath } = req;

  logger.info('Processing report for student: {userid}', { userid });
  logger.debug('File path: {filepath}', { filepath });
  logger.debug('Output directory: {dir}', { dir: outputDir });

  // Step 2: Validate filepath exists
  const absoluteFilePath = resolveContainerPath(filepath);
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
    logger.error('JSON parsing failed: {error}', { error: errorMsg });
    return {
      status: 'error',
      message: `Invalid JSON: ${errorMsg}`,
      data: null,
    };
  }

  // Ensure output directory exists
  ensureDir(outputDir);

  // Step 4: Copy data file to public directory for export
  const publicDir = 'public';
  ensureDir(publicDir);
  
  const dataFileName = basename(absoluteFilePath);
  const targetPath = resolve(publicDir, dataFileName);

  try {
    await Bun.write(targetPath, Bun.file(absoluteFilePath));
    logger.debug('Copied data to: {path}', { path: targetPath });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to copy data file: {error}', { error: errorMsg });
    return {
      status: 'error',
      message: `Failed to prepare data: ${errorMsg}`,
      data: null,
    };
  }

  // Use Bun.serve static server for export (same approach as export-handler.ts)
  // This is more reliable than spawning Vite dev server
  logger.info('Reserving available port...');
  const portHolder = await reserveAvailablePort(4000);
  const devServerPort = portHolder.port;
  logger.info('Port {port} reserved, preparing static server...', { port: devServerPort });

  // CRITICAL: Release port BEFORE creating real server
  portHolder.releasePort();
  logger.debug('Port reservation released');

  // Small delay to ensure OS has fully released the port
  await new Promise(resolve => setTimeout(resolve, 100));

  // Use dist directory (works for both Docker and local)
  const distDir = (await fileExistsAsync('/app/dist')) ? resolve('/app', 'dist') : resolve('dist');
  // Generate timestamp early for export server
  const timestamp = generateTimestamp();

  // Start the static server with reserved port
  const exportServer = createExportServer(devServerPort, distDir, jsonData, userid, timestamp);
  logger.info('Static server started on port {port}', { port: devServerPort });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 200));

  const formattedTimestamp = formatTimestampForFilename(timestamp);
  const results: ReportResults = {
    url: '',
    png: '',
    pdf: '',
  };

let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });

    // Run PNG export
    logger.info('Generating PNG...');
    const exportContext = {
      input: absoluteFilePath,
      output: outputDir,
      tag: userid,
      timestamp,
      quality: 'standard' as const,
      verbose,
      browser,
      server: null as any,  // Not used with Bun.serve
      dataFileName,
      serverPort: devServerPort,
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

    logger.info('Report generation completed');
    
    // Store data for preview - use formatted timestamp for URL and store key
    // In dev mode, preview URL should use Vite port (serverPort + 1)
    // In production mode, preview URL uses the same server port
    const previewPort = devMode ? serverPort + 1 : serverPort;
    
    // Determine hostname from Host header or fallback to localhost
    const hostname = host ? host.split(':')[0] : 'localhost';
    const previewUrl = `http://${hostname}:${previewPort}/report/${userid}/${formattedTimestamp}`;
    const storeKey = `${userid}-${formattedTimestamp}`;
    
    previewStore.set(storeKey, {
      userid,
      timestamp,
      data: jsonData,
      createdAt: Date.now(),
    });
    logger.debug('Stored preview data with key: {storeKey}', { storeKey });
    logger.info('Preview URL: {url}', { url: previewUrl });
    
    // Update results with preview URL
    results.url = previewUrl;
    
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
    
    // Cleanup copied data file
    try {
      const targetFile = Bun.file(targetPath);
      if (await targetFile.exists()) {
        await targetFile.unlink();
        logger.debug('Cleaned up: {path}', { path: targetPath });
      }
    } catch {
      logger.debug('Failed to cleanup {path}', { path: targetPath });
    }
  }
}
