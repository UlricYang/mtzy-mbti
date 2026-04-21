import { Elysia } from 'elysia';
import { spawn } from 'child_process';
import { resolve, basename } from 'path';
import { watch } from 'chokidar';
import { staticPlugin } from '@elysiajs/static';
import { ServerOptions, PreviewStore } from '../lib/types';
import { createLogger } from '../lib/logger';
import { ensureDir, fileExists, findAvailablePort, resolveInputPath } from '../lib/file-utils';
import { handleReportRequest } from '../lib/report-handler';
import { handlePreviewRequest } from '../lib/preview-handler';
import { handleExportRequest } from '../lib/export-handler';
import { validateBuild } from '../lib/build-validator';
import { createStaticConfig } from '../lib/static-config';

/**
 * Configuration for high-concurrency optimization
 */
const CONFIG = {
  // Preview data TTL in milliseconds (32 minutes)
  PREVIEW_TTL: 32 * 60 * 1000,
  // Cleanup interval in milliseconds (16 minutes)
  CLEANUP_INTERVAL: 16 * 60 * 1000,
  // Maximum concurrent export tasks
  MAX_CONCURRENT_EXPORTS: 16,
  // Maximum memory usage warning threshold (MB) - 2GB
  MEMORY_WARNING_THRESHOLD: 2048,
};

/**
 * Export task queue for concurrency control
 */
interface ExportTask {
  id: string;
  promise: Promise<unknown>;
}

/**
 * Cleanup expired preview data
 */
function cleanupExpiredPreviews(previewStore: PreviewStore, logger: ReturnType<typeof createLogger>): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, data] of previewStore.entries()) {
    if (now - data.createdAt > CONFIG.PREVIEW_TTL) {
      previewStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.verbose(`Cleaned up ${cleaned} expired preview entries`);
  }
  
  // Log memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  logger.verbose(`Memory usage: ${heapUsedMB}MB heap`);
  
  if (heapUsedMB > CONFIG.MEMORY_WARNING_THRESHOLD) {
    logger.warn(`High memory usage detected: ${heapUsedMB}MB. Consider restarting the service.`);
  }
}

/**
* Start the web service
* Production mode: Elysia serves static files from dist/
* Development mode (--dev): Spawns Vite dev server
*/
export async function serverCommand(options: ServerOptions): Promise<void> {
  const logger = createLogger(options.verbose, 'server');
  const { input, output, port, tag, watch: shouldWatch, verbose, devMode } = options;

  logger.info('🚀 Starting web service...');
  logger.verbose(`Input: ${input}`);
  logger.verbose(`Output: ${output}`);
  logger.verbose(`Port: ${port}`);
  logger.verbose(`Tag: ${tag}`);
  logger.verbose(`Watch: ${shouldWatch}`);

  // Resolve input path
  const { type, paths } = resolveInputPath(input);
  const inputPath = paths[0];

  // Ensure public directory exists and copy input data file
  const publicDir = 'public';
  ensureDir(publicDir);
  const dataFileName = basename(inputPath);
  const targetPath = resolve(publicDir, dataFileName);
  try {
    await Bun.write(targetPath, Bun.file(inputPath));
    logger.info(`📋 Copied data to: ${targetPath}`);
  } catch (error) {
    logger.error('Failed to copy data file:', error);
    process.exit(1);
  }

  const outputDir = resolve(output);
  if (!fileExists(outputDir)) {
    ensureDir(outputDir);
    logger.warn(`Created output directory: ${outputDir}`);
  }

  // Validate build for production mode
  if (!devMode) {
    const validation = validateBuild('dist');
    if (!validation.valid) {
      logger.error(validation.error);
      if (validation.suggestion) {
        logger.info(validation.suggestion);
      }
      process.exit(1);
    }
    logger.verbose('Build validation passed');
  }

  // Find available port
  const actualPort = await findAvailablePort(port);
  if (actualPort !== port) {
    logger.warn(`Port ${port} is in use, using port ${actualPort} instead`);
  }

  logger.info(`Starting web service on port ${actualPort}`);
  logger.verbose(`Output directory: ${outputDir}`);
  logger.verbose(`Mode: ${devMode ? 'development' : 'production'}`);

  // Create preview store for temporary data
  const previewStore: PreviewStore = new Map();

  // Export task queue for concurrency control
  const exportQueue: ExportTask[] = [];

  // Start cleanup interval for expired preview data
  const cleanupInterval = setInterval(() => {
    cleanupExpiredPreviews(previewStore, logger);
  }, CONFIG.CLEANUP_INTERVAL);

  // Create Elysia server
  const app = new Elysia()
    // Health check endpoint with detailed status
    .get('/health', () => {
      const memUsage = process.memoryUsage();
      return {
        status: 'ok',
        timestamp: Date.now(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        },
        previewStore: {
          entries: previewStore.size,
        },
        exportQueue: {
          active: exportQueue.length,
          max: CONFIG.MAX_CONCURRENT_EXPORTS,
        },
        server: {
          port: actualPort,
          mode: devMode ? 'development' : 'production',
        },
      };
    })
    // Preview endpoint - fast, stores data for browser preview
    .post('/api/preview', async ({ body }) => {
      logger.info('Received preview request');
      logger.verbose('Request body:', body);
      
      const response = await handlePreviewRequest(
        body,
        previewStore,
        actualPort,
        verbose,
        devMode
      );
      
      if (response.status === 'error') {
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return response;
    })
    
    // Export endpoint - generates PNG/PDF files with concurrency control
    .post('/api/export', async ({ body }) => {
      logger.info('Received export request');
      logger.verbose('Request body:', body);

      // Check if we've reached the max concurrent exports
      if (exportQueue.length >= CONFIG.MAX_CONCURRENT_EXPORTS) {
        logger.warn(`Export queue full (${exportQueue.length}/${CONFIG.MAX_CONCURRENT_EXPORTS}), request rejected`);
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Server is busy, please try again later',
          data: null,
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create a task ID
      const taskId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Execute export with queue tracking
      const exportPromise = handleExportRequest(
        body,
        outputDir,
        verbose
      );

      // Add to queue
      const task: ExportTask = { id: taskId, promise: exportPromise };
      exportQueue.push(task);
      logger.verbose(`Export task ${taskId} added to queue (queue size: ${exportQueue.length})`);

      try {
        const response = await exportPromise;

        if (response.status === 'error') {
          return new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return response;
      } finally {
        // Remove from queue
        const index = exportQueue.findIndex(t => t.id === taskId);
        if (index > -1) {
          exportQueue.splice(index, 1);
          logger.verbose(`Export task ${taskId} completed (queue size: ${exportQueue.length})`);
        }
      }
    })
    
    // Legacy report endpoint - combines preview + export in one call
    .post('/api/report', async ({ body }) => {
      logger.info('Received report request');
      logger.verbose('Request body:', body);
      
      const response = await handleReportRequest(
        body,
        outputDir,
        previewStore,
        actualPort,
        verbose,
        devMode
      );
      
      if (response.status === 'error') {
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return response;
    })
    
    .get('/report/:student_id/:timestamp', async ({ params, set }) => {
      if (devMode) {
        // In dev mode, let Vite handle it
        return;
      }

      // Match /report/:student_id/:timestamp pattern (but not /report/*/data)
      const pathname = `/report/${params.student_id}/${params.timestamp}`;

      // Skip if this is the data endpoint
      if (pathname.endsWith('/data')) {
        return;
      }

      // Skip if this looks like a static file (has extension)
      if (pathname.match(/\.[^/]+$/)) {
        return;
      }
      // Serve index.html for SPA routing
      const indexHtmlPath = resolve('dist', 'index.html');
      const indexHtmlFile = Bun.file(indexHtmlPath);

      logger.verbose(`SPA route matched: ${pathname}, serving ${indexHtmlPath}`);

      if (await indexHtmlFile.exists()) {
        set.headers['Content-Type'] = 'text/html';
        logger.verbose(`Serving index.html for ${pathname}`);
        return await indexHtmlFile.text();
      }

      logger.error(`index.html not found at ${indexHtmlPath}`);
      set.status = 404;
      return 'index.html not found';
    })
    

    // Preview data endpoint - returns JSON data for preview page
    .get('/report/:student_id/:timestamp/data', ({ params }) => {
      const { student_id, timestamp } = params;
      const storeKey = `${student_id}-${timestamp}`;
      const previewData = previewStore.get(storeKey);
      
      if (!previewData) {
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Preview data not found or expired',
          data: null,
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return previewData.data;
    });

  // Add static plugin for production mode (serves dist/ with SPA fallback)
  if (!devMode) {
    app.use(staticPlugin(createStaticConfig('dist')));
  }

  // Add error handling
  app.onError(({ error, set }) => {
    logger.error('Server error:', error);
    set.status = 500;
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
      data: null,
    };
  });

  // Start server
  app.listen(actualPort, () => {
    logger.info(`\ud83d\ude80 Server running at http://localhost:${actualPort}`);
    logger.info(`\ud83d\udccb Health check: GET http://localhost:${actualPort}/health`);
    logger.info(`\ud83d\udccb Preview endpoint: POST http://localhost:${actualPort}/api/preview`);
    logger.info(`\ud83d\udccb Export endpoint: POST http://localhost:${actualPort}/api/export`);
    
    if (devMode) {
      // Start Vite dev server for development mode
      startVite();
    }

    // Start file watcher if watch mode is enabled
    if (shouldWatch) {
      logger.info('👀 Watching for file changes...');
      const watcher = watch(inputPath, {
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('change', async (path) => {
        logger.info(`📝 File changed: ${path}`);
        try {
          await Bun.write(targetPath, Bun.file(path));
          logger.info('✅ Data reloaded');
        } catch (error) {
          logger.error('Failed to reload data:', error);
        }
      });

      watcher.on('error', (error) => {
        logger.error('Watcher error:', error);
      });
    }
  });

  // Start Vite dev server (for development mode only)
  function startVite() {
    const vitePort = actualPort + 1;
    logger.info('Starting Vite dev server for development mode...');
    
    const viteProcess = spawn('bunx', ['vite', '--port', String(vitePort), '--strictPort'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        VITE_API_PORT: String(actualPort),
      },
    });

    viteProcess.on('error', (err) => {
      logger.error('Failed to start Vite dev server:', err);
      process.exit(1);
    });

    logger.info(`\ud83c\udfa8 Vite dev server running at http://localhost:${vitePort}`);
  }

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down server...');
    clearInterval(cleanupInterval);
    
    // Clean up copied data file
    const targetFile = Bun.file(targetPath);
    if (await targetFile.exists()) {
      try {
        await targetFile.unlink();
        logger.verbose(`🧹 Cleaned up: ${targetPath}`);
      } catch (error) {
        logger.verbose(`Failed to cleanup ${targetPath}:`, error);
      }
    }
    
    await app.stop();
    process.exit(0);
};

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
