import { spawn, execSync } from 'child_process';
import { resolve, basename } from 'path';
import { chromium, type Browser } from 'playwright';
import { ExportOptions, ExportContext, OutputFormat } from '../lib/types';
import { createLogger } from '../lib/logger';
import { ensureDir, resolveInputPath, parseFormats } from '../lib/file-utils';
import { exportPngPlugin } from '../plugins/export-png';
import { exportPdfPlugin } from '../plugins/export-pdf';
import { exportHtmlPlugin } from '../plugins/export-html';

const plugins = [exportPngPlugin, exportPdfPlugin, exportHtmlPlugin];

export async function exportCommand(options: ExportOptions): Promise<void> {
  const logger = createLogger(options.verbose, 'export');
  const { input, output, tag, format, verbose, quality } = options;
  const imageQuality = quality || 'standard';

  logger.info('📦 Exporting report...');
  logger.verbose(`Input: ${input}`);
  logger.verbose(`Output: ${output}`);
  logger.verbose(`Tag: ${tag}`);
  logger.verbose(`Format: ${format}`);

  const { paths } = resolveInputPath(input);
  const inputPath = paths[0];

  ensureDir(output);

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

  logger.info('🔨 Building project...');
  try {
    execSync('bun run build', {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_DATA_PATH: dataFileName,
      },
    });
    logger.info('✅ Build completed');
  } catch (error) {
    logger.error('❌ Build failed');
    process.exit(1);
  }

  const formats = parseFormats(format);
  logger.verbose(`Formats to generate: ${formats.join(', ')}`);

  logger.info('🌐 Starting preview server...');
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
      quality: imageQuality,
      verbose,
      browser,
      server,
      dataFileName,
    };

    for (const fmt of formats) {
      const plugin = plugins.find(p => p.name === fmt);
      if (plugin) {
        logger.info(`\n▶ Running ${fmt.toUpperCase()} plugin...`);
        results[fmt] = await plugin.execute(context);
      } else {
        logger.warn(`⚠️  No plugin found for format: ${fmt}`);
        results[fmt] = { success: false, error: `No plugin for ${fmt}` };
      }
    }
  } catch (error) {
    logger.error('❌ Export failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  logger.verbose('Cleaning up...');
  server.kill();

  // 清理复制的数据文件
  const targetFile = Bun.file(targetPath);
  if (await targetFile.exists()) {
    try {
      await targetFile.unlink();
      logger.verbose(`🧹 Cleaned up: ${targetPath}`);
    } catch (error) {
      logger.verbose(`Failed to cleanup ${targetPath}:`, error);
    }
  }

  logger.info('\n✨ Export completed!');
  logger.info(`📁 Output directory: ${resolve(output)}`);

  for (const [fmt, result] of Object.entries(results)) {
    if (result.success && result.path) {
      logger.info(`✅ ${fmt.toUpperCase()}: ${result.path}`);
    } else if (result.error) {
      logger.warn(`⚠️  ${fmt.toUpperCase()}: ${result.error}`);
    }
  }
}
