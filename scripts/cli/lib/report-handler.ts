import { spawn } from 'child_process';
import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { chromium, type Browser } from 'playwright';
import { ReportRequest, ReportResponse, ReportResults, PreviewStore } from './types';
import { reportLogger } from './logger';
import { ensureDir, formatTimestampForFilename, findAvailablePort, resolveContainerPath } from './file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';

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
  devMode: boolean = false
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

  // Start a temporary Vite DEV server for export (not preview!)
  // Dev server respects VITE_DATA_PATH env var for dynamic data loading
  // Each report session uses its own port to support concurrent users
  logger.info('Finding available port...');
  const devServerPort = await findAvailablePort(4000);
  logger.info('Starting Vite dev server on port {port}...', { port: devServerPort });
  const previewServer = spawn('bunx', ['vite', '--port', String(devServerPort), '--strictPort'], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      VITE_DATA_PATH: dataFileName,
    },
  });

  // Wait for dev server to start (dev server takes longer than preview)
  await new Promise(resolve => setTimeout(resolve, 5000));

  const timestamp = generateTimestamp();
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
      server: previewServer,
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
    const previewUrl = `http://localhost:${previewPort}/report/${userid}/${formattedTimestamp}`;
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
    
    // Wait for server to exit before releasing port
    await new Promise<void>((resolve) => {
      previewServer.on('exit', () => resolve());
      previewServer.kill();
      // Timeout after 3 seconds if exit event doesn't fire
      setTimeout(() => resolve(), 3000);
    });
    logger.debug('Vite server stopped');
    
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
