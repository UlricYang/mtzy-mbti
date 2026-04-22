import { spawn, execSync } from 'child_process';
import { resolve, basename } from 'path';
import { chromium, type Browser } from 'playwright';
import { ExportOptions, ExportContext, OutputFormat } from '../lib/types';
import { exportLogger } from '../lib/logger';
import { ensureDir, resolveInputPath, parseFormats } from '../lib/file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';
import { exportHtmlPlugin } from '../plugins/export-html';

const plugins = [exportPngPlugin, exportPdfPlugin, exportHtmlPlugin];

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

  const formats = parseFormats(format);
  exportLogger.debug('Formats to generate: {formats}', { formats: formats.join(', ') });

  exportLogger.info('Starting preview server...');
  const server = spawn('bunx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  let browser: Browser | undefined;
  const results: Record<OutputFormat, { success: boolean; path?: string; error?: string }> = {} as any;

  try {
    browser = await chromium.launch({ headless: true });

    const context: ExportContext = {
      input: inputPath,
      output,
      tag,
      timestamp: Date.now(),
      quality: imageQuality,
      verbose,
      browser,
      server,
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
  server.kill();

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
