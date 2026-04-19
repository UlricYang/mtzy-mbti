import { resolve, join, relative } from 'path';
import { ExportPlugin, ExportContext, ExportResult } from '../lib/types';
import { createLogger } from '../lib/logger';
import { generateTimestamp } from '../lib/file-utils';

async function copyDir(src: string, dest: string, verbose: boolean): Promise<void> {
  const logger = createLogger(verbose, 'html');
  const glob = new Bun.Glob('**/*');
  const files = await Array.fromAsync(glob.scan({ cwd: src, absolute: true }));

  for (const filePath of files) {
    const relPath = relative(src, filePath);
    
    if (relPath.endsWith('inputs.json')) {
      logger.verbose(`Skipping: ${relPath}`);
      continue;
    }

    const stat = await Bun.file(filePath).stat();
    const destPath = join(dest, relPath);

    if (stat.isDirectory()) {
      await Bun.mkdir(destPath, { recursive: true });
    } else {
      const file = Bun.file(filePath);
      await Bun.write(destPath, file);
      logger.verbose(`Copied: ${relPath}`);
    }
  }
}

export const exportHtmlPlugin: ExportPlugin = {
  name: 'html',

  async execute(context: ExportContext): Promise<ExportResult> {
    const logger = createLogger(context.verbose, 'html');
    const { output, tag, verbose } = context;

    try {
      const timestamp = generateTimestamp();
      const folderName = `report-${tag}-${timestamp}`;
      const outputDir = resolve(output, folderName);

      logger.info('📦 Copying dist folder for HTML export...');
      logger.verbose(`Output directory: ${outputDir}`);

      const distDir = resolve(process.cwd(), 'dist');
      const distIndex = Bun.file(join(distDir, 'index.html'));

      if (!(await distIndex.exists())) {
        logger.error('❌ Dist folder not found or missing index.html. Please run build first.');
        return {
          success: false,
          error: 'Dist folder not found. Build required before HTML export.',
        };
      }

      await copyDir(distDir, outputDir, verbose);

      const indexHtmlPath = join(outputDir, 'index.html');
      let indexHtml = await Bun.file(indexHtmlPath).text();
      indexHtml = indexHtml
        .replace(/\s*type="module"/g, '')
        .replace(/\s*crossorigin/g, '');
      await Bun.write(indexHtmlPath, indexHtml);

      const assetsDir = join(outputDir, 'assets');
      const jsGlob = new Bun.Glob('*.js');
      const jsFiles = await Array.fromAsync(jsGlob.scan({ cwd: assetsDir, absolute: true }));

      for (const jsFile of jsFiles) {
        let content = await Bun.file(jsFile).text();
        content = content
          .replace(/fetch\s*\(\s*["'`]\/assets\//g, 'fetch("./assets/')
          .replace(/fetch\s*\(\s*["'`]\/public\//g, 'fetch("./')
          .replace(/fetch\s*\(\s*["'`]\/([^"'`]+)["'`]/g, 'fetch("./$1"');
        await Bun.write(jsFile, content);
        logger.verbose(`Fixed paths in: ${relative(outputDir, jsFile)}`);
      }

      logger.info(`✅ HTML export completed: ${outputDir}`);

      return {
        success: true,
        path: outputDir,
      };
    } catch (error) {
      logger.error('❌ HTML export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
