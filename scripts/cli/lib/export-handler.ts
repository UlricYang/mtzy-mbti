import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { ExportRequest, ExportResponse, ExportResults } from './types';
import { exportLogger } from './logger';
import { ensureDir, findAvailablePort } from './file-utils';
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
  const absoluteFilePath = resolve(filepath);
  
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

  // Step 4: Write data to temporary file for export
  const publicDir = 'public';
  ensureDir(publicDir);
  
  const dataFileName = `temp-${userid}-${timestamp}.json`;
  const targetPath = resolve(publicDir, dataFileName);

  try {
    await Bun.write(targetPath, JSON.stringify(jsonData));
    logger.debug('Wrote temp data to: {path}', { path: targetPath });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to write temp data: {error}', { error: errorMsg });
    return {
      status: 'error',
      message: `Failed to prepare data: ${errorMsg}`,
      data: null,
    };
  }

  // Step 5: Find available port and start temporary Vite DEV server for export (not preview!)
  // Dev server respects VITE_DATA_PATH env var for dynamic data loading
  // Each export session uses its own port to support concurrent users
  logger.info('Finding available port...');
  const serverPort = await findAvailablePort(4000);
  logger.info('Starting Vite dev server on port {port}...', { port: serverPort });
  const previewServer = spawn('bunx', ['vite', '--port', String(serverPort), '--strictPort'], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      VITE_DATA_PATH: dataFileName,
    },
  });

  // Wait for dev server to start (dev server takes longer than preview)
  await new Promise(resolve => setTimeout(resolve, 5000));

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
    const exportContext = {
      input: targetPath,
      output: outputDir,
      tag: userid,
      timestamp,
      quality: 'standard' as const,
      verbose,
      browser,
      server: previewServer,
      dataFileName,
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
    
    // Wait for server to exit before releasing port
    await new Promise<void>((resolve) => {
      previewServer.on('exit', () => resolve());
      previewServer.kill();
      // Timeout after 3 seconds if exit event doesn't fire
      setTimeout(() => resolve(), 3000);
    });
    logger.debug('Vite server stopped');
    
    // Cleanup temp data file
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
