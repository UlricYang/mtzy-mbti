import { Elysia } from 'elysia';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { ServerOptions, PreviewStore } from '../lib/types';
import { createLogger } from '../lib/logger';
import { ensureDir, fileExists, findAvailablePort } from '../lib/file-utils';
import { handleReportRequest } from '../lib/report-handler';
import { handlePreviewRequest } from '../lib/preview-handler';
import { handleExportRequest } from '../lib/export-handler';

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
* Start the web service with Vite dev server for dynamic preview
*/
export async function serverCommand(options: ServerOptions): Promise<void> {
  const logger = createLogger(options.verbose, 'server');
  const { port, vitePort: userVitePort, output, verbose } = options;

  // Ensure output directory exists
  const outputDir = resolve(output);
  if (!fileExists(outputDir)) {
    ensureDir(outputDir);
    logger.warn(`Created output directory: ${outputDir}`);
  }

  // Find available API port
  const actualPort = await findAvailablePort(port);
  if (actualPort !== port) {
    logger.warn(`Port ${port} is in use, using port ${actualPort} instead`);
  }

  // Calculate or find available Vite port
  const defaultVitePort = userVitePort || (actualPort + 1);
  const actualVitePort = await findAvailablePort(defaultVitePort);
  if (actualVitePort !== defaultVitePort) {
    logger.warn(`Vite port ${defaultVitePort} is in use, using port ${actualVitePort} instead`);
  }

  logger.info(`Starting web service on port ${actualPort}`);
  logger.verbose(`Output directory: ${outputDir}`);

  // Create preview store for temporary data
  const previewStore: PreviewStore = new Map();

  // Export task queue for concurrency control
  const exportQueue: ExportTask[] = [];

  // Start cleanup interval for expired preview data
  const cleanupInterval = setInterval(() => {
    cleanupExpiredPreviews(previewStore, logger);
  }, CONFIG.CLEANUP_INTERVAL);

  // Create Elysia API server FIRST
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
        ports: {
          api: actualPort,
          vite: actualVitePort,
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
        actualVitePort,
        verbose
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
        actualVitePort,
        verbose
      );
      
      if (response.status === 'error') {
        return new Response(JSON.stringify(response), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return response;
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
    })
    
    // Error handling
    .onError(({ error, set }) => {
      logger.error('Server error:', error);
      set.status = 500;
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error',
        data: null,
      };
    })
    // Start API server and wait for it to be ready
    .listen(actualPort, () => {
      logger.info(`🚀 API server running at http://localhost:${actualPort}`);
      
      // Start Vite AFTER API server is ready
      startVite();
    });

  // Start Vite dev server after API is ready
  function startVite() {
    logger.info('Starting Vite dev server for dynamic preview...');
    
    const viteProcess = spawn('bunx', ['vite', '--port', String(actualVitePort), '--strictPort'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        // Configure Vite to proxy API requests to our Elysia server
        VITE_API_PORT: String(actualPort),
      },
    });

    viteProcess.on('error', (err) => {
      logger.error('Failed to start Vite dev server:', err);
      process.exit(1);
    });

    logger.info(`🎨 Vite dev server running at http://localhost:${actualVitePort}`);
    logger.info(`📋 Preview endpoint: POST http://localhost:${actualPort}/api/preview`);
    logger.info(`📋 Export endpoint: POST http://localhost:${actualPort}/api/export`);
  }

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down servers...');
    clearInterval(cleanupInterval);
await app.stop();
process.exit(0);
};

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
