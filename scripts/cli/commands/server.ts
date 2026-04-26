import { Elysia } from 'elysia';
import { spawn } from 'child_process';
import { resolve } from 'path';
import { staticPlugin } from '@elysiajs/static';
import { ServerOptions, PreviewStore } from '../lib/types';
import { serverLogger, httpLogger } from '../lib/logger';
import { generateRequestId, requestContext, setRequestContext } from '../lib/logger-context';
import { ensureDir, findAvailablePort } from '../lib/file-utils';
import { handleReportRequest } from '../lib/report-handler';
import { handlePreviewRequest } from '../lib/preview-handler';
import { handleExportRequest } from '../lib/export-handler';
import { validateBuild } from '../lib/build-validator';
import { createStaticConfig } from '../lib/static-config';
import { browserManager } from '../lib/browser-manager';

const CONFIG = {
  PREVIEW_TTL: 32 * 60 * 1000,
  CLEANUP_INTERVAL: 16 * 60 * 1000,
  MAX_CONCURRENT_EXPORTS: 16,
  MEMORY_WARNING_THRESHOLD: 2048,
};

interface ExportTask {
  id: string;
  promise: Promise<unknown>;
}

function cleanupExpiredPreviews(previewStore: PreviewStore): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, data] of previewStore.entries()) {
    if (now - data.createdAt > CONFIG.PREVIEW_TTL) {
      previewStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    serverLogger.debug('Cleaned up {count} expired preview entries', { count: cleaned });
  }
  
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  serverLogger.debug('Memory usage: {heapMB}MB heap', { heapMB: heapUsedMB });
  
  if (heapUsedMB > CONFIG.MEMORY_WARNING_THRESHOLD) {
    serverLogger.warn('High memory usage detected: {heapMB}MB. Consider restarting the service.', { heapMB: heapUsedMB });
  }
}

export async function serverCommand(options: ServerOptions): Promise<void> {
  const { output, port, verbose, devMode } = options;

  const outputDir = resolve(output);
  ensureDir(outputDir);

  if (!devMode) {
    const validation = validateBuild('dist');
    if (!validation.valid) {
      serverLogger.error(validation.error);
      if (validation.suggestion) {
        serverLogger.info(validation.suggestion);
      }
      process.exit(1);
    }
    serverLogger.debug('Build validation passed');
  }

  const actualPort = await findAvailablePort(port);
  if (actualPort !== port) {
    serverLogger.warn('Port {port} is in use, using port {actualPort} instead', { port, actualPort });
  }

  serverLogger.info('Starting web service on port {port}', { port: actualPort });
  serverLogger.debug('Output directory: {outputDir}, Mode: {mode}', { outputDir, mode: devMode ? 'development' : 'production' });

  // Initialize shared browser instance for export requests
  serverLogger.info('Initializing shared browser for exports...');
  await browserManager.init();
  serverLogger.debug('Shared browser initialized successfully');

  const previewStore: PreviewStore = new Map();
  const exportQueue: ExportTask[] = [];

  const cleanupInterval = setInterval(() => {
    cleanupExpiredPreviews(previewStore);
  }, CONFIG.CLEANUP_INTERVAL);

  const app = new Elysia()
    .get('/api/assessment/health', () => {
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
    .post('/api/assessment/mbti/preview', async ({ body, headers }) => {
      const requestId = generateRequestId();
      const ctx = setRequestContext(requestId, (body as Record<string, unknown>)?.userid as string);
      
      httpLogger.info('Received preview request', { requestId });
      httpLogger.debug('Request body: {body}', { body, requestId });
      
      return requestContext.run(ctx, async () => {
        const host = (headers as Record<string, string>)?.host;
        const response = await handlePreviewRequest(
          body,
          previewStore,
          actualPort,
          verbose,
          devMode,
          host
        );
        
        if (response.status === 'error') {
          return new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        const previewUrl = response.data?.results?.url;
        if (previewUrl) {
          return new Response(null, {
            status: 303,
            headers: { 'Location': previewUrl },
          });
        }
        
        return new Response(JSON.stringify({ error: 'No preview URL generated' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      });
    })

    .post('/api/assessment/mbti/link', async ({ body, headers }) => {
      const requestId = generateRequestId();
      const ctx = setRequestContext(requestId, (body as Record<string, unknown>)?.userid as string);
      
      httpLogger.info('Received link request', { requestId });
      httpLogger.debug('Request body: {body}', { body, requestId });
      
      return requestContext.run(ctx, async () => {
        const host = (headers as Record<string, string>)?.host;
        const response = await handlePreviewRequest(
          body,
          previewStore,
          actualPort,
          verbose,
          devMode,
          host
        );
        
        if (response.status === 'error') {
          return new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
    })
    .post('/api/assessment/mbti/export', async ({ body }) => {
      const requestId = generateRequestId();
      const ctx = setRequestContext(requestId, (body as Record<string, unknown>)?.userid as string);
      
      httpLogger.debug('Request body: {body}', { body, requestId });

      if (exportQueue.length >= CONFIG.MAX_CONCURRENT_EXPORTS) {
        serverLogger.warn('Export queue full ({active}/{max}), request rejected', { active: exportQueue.length, max: CONFIG.MAX_CONCURRENT_EXPORTS, requestId });
        return new Response(JSON.stringify({
          status: 'error',
          message: 'Server is busy, please try again later',
          data: null,
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const taskId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return requestContext.run(ctx, async () => {
        const browser = await browserManager.getBrowser();
        const exportPromise = handleExportRequest(
          body,
          outputDir,
          verbose,
          browser
        );

        const task: ExportTask = { id: taskId, promise: exportPromise };
        exportQueue.push(task);
        serverLogger.debug('Export task {taskId} added to queue (queue size: {size})', { taskId, size: exportQueue.length, requestId });

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
          const index = exportQueue.findIndex(t => t.id === taskId);
          if (index > -1) {
            exportQueue.splice(index, 1);
            serverLogger.debug('Export task {taskId} completed (queue size: {size})', { taskId, size: exportQueue.length, requestId });
          }
        }
      });
    })
    
    .post('/api/assessment/mbti/report', async ({ body, headers }) => {
      const requestId = generateRequestId();
      const ctx = setRequestContext(requestId, (body as Record<string, unknown>)?.userid as string);
      
      httpLogger.info('Received report request', { requestId });
      httpLogger.debug('Request body: {body}', { body, requestId });
      
      return requestContext.run(ctx, async () => {
        const host = (headers as Record<string, string>)?.host;
        const response = await handleReportRequest(
          body,
          outputDir,
          previewStore,
          actualPort,
          verbose,
          devMode,
          host
        );
        
        if (response.status === 'error') {
          return new Response(JSON.stringify(response), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        return response;
      });
    })
    
    .get('/report/:userid/:timestamp', async ({ params, set }) => {
      if (devMode) {
        return;
      }

      const pathname = `/report/${params.userid}/${params.timestamp}`;

      if (pathname.endsWith('/data')) {
        return;
      }

      if (pathname.match(/\.[^/]+$/)) {
        return;
      }
      const indexHtmlPath = resolve('dist', 'index.html');
      const indexHtmlFile = Bun.file(indexHtmlPath);

      serverLogger.debug('SPA route matched: {pathname}, serving {path}', { pathname, path: indexHtmlPath });

      if (await indexHtmlFile.exists()) {
        set.headers['Content-Type'] = 'text/html';
        serverLogger.debug('Serving index.html for {pathname}', { pathname });
        return await indexHtmlFile.text();
      }

      serverLogger.error('index.html not found at {path}', { path: indexHtmlPath });
      set.status = 404;
      return 'index.html not found';
    })
    

    .get('/report/:userid/:timestamp/data', ({ params }) => {
      const { userid, timestamp } = params;
      const storeKey = `${userid}-${timestamp}`;
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

  if (!devMode) {
    app.use(staticPlugin(createStaticConfig('dist')));
  }

  app.onError(({ error, set }) => {
    serverLogger.error('Server error: {error}', { error: error instanceof Error ? error.message : String(error) });
    set.status = 500;
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error',
      data: null,
    };
  });

  app.listen(actualPort, () => {
    serverLogger.info('Server running at http://localhost:{port}', { port: actualPort });
    serverLogger.info('Health check: GET http://localhost:{port}/api/assessment/health', { port: actualPort });
    serverLogger.info('Preview endpoint: POST http://localhost:{port}/api/assessment/mbti/preview', { port: actualPort });
    serverLogger.info('Link endpoint: POST http://localhost:{port}/api/assessment/mbti/link', { port: actualPort });
    serverLogger.info('Export endpoint: POST http://localhost:{port}/api/assessment/mbti/export', { port: actualPort });
    serverLogger.info('Report endpoint: POST http://localhost:{port}/api/assessment/mbti/report', { port: actualPort });
    
    if (devMode) {
      startVite();
    }
  });

  function startVite() {
    const vitePort = actualPort + 1;
    serverLogger.info('Starting Vite dev server for development mode...');
    
    const viteProcess = spawn('bunx', ['vite', '--port', String(vitePort), '--strictPort'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        VITE_API_PORT: String(actualPort),
      },
    });

    viteProcess.on('error', (err) => {
      serverLogger.error('Failed to start Vite dev server: {error}', { error: err.message });
      process.exit(1);
    });

    serverLogger.info('Vite dev server running at http://localhost:{port}', { port: vitePort });
  }
  
  const shutdown = async () => {
    serverLogger.info('Shutting down server...');
    clearInterval(cleanupInterval);
    await browserManager.close();
    await app.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
