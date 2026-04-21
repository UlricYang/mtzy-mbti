import { resolve } from 'path';
import { ExportPlugin, ExportContext, ExportResult, ImageQuality } from '../lib/types';
import { createLogger } from '../lib/logger';
import { generateOutputFilenameWithTimestamp } from '../lib/file-utils';

function getDeviceScaleFactor(quality: ImageQuality): number {
  const scaleFactors: Record<ImageQuality, number> = {
    standard: 2,
    high: 3,
    print: 4,
  };
  return scaleFactors[quality];
}

function getScreenshotWaitTime(quality: ImageQuality): number {
  const waitTimes: Record<ImageQuality, number> = {
    standard: 2000,
    high: 4000,
    print: 6000,
  };
  return waitTimes[quality];
}

export const exportPngPlugin: ExportPlugin = {
  name: 'png',

  async execute(context: ExportContext): Promise<ExportResult> {
    const logger = createLogger(context.verbose, 'png');
    const { output, tag, timestamp, quality, browser } = context;

    try {
      const browserContext = await browser.newContext({
        viewport: { width: 794, height: 1123 },
        deviceScaleFactor: getDeviceScaleFactor(quality),
      });

      const page = await browserContext.newPage();

      const serverUrl = `http://localhost:${context.serverPort}`;
      logger.verbose(`Navigating to: ${serverUrl}`);
      await page.goto(serverUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await page.waitForSelector('main', { timeout: 30000 });
      await page.waitForTimeout(getScreenshotWaitTime(quality));

      const pdfFixStyles = `
        .text-gradient-screen,
        .text-gradient-screen-alt,
        .gradient-text,
        [class*="bg-clip-text"],
        [class*="text-transparent"] {
          background: none !important;
          background-image: none !important;
          -webkit-background-clip: unset !important;
          background-clip: unset !important;
          -webkit-text-fill-color: #667eea !important;
          color: #667eea !important;
        }
        * {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: none !important;
          mix-blend-mode: normal !important;
          -webkit-font-smoothing: antialiased !important;
        }
      `;

      await page.addStyleTag({ content: pdfFixStyles });
      await page.waitForTimeout(500);

      logger.info('🖼️  Generating PNG image...');
      logger.verbose(`Quality: ${quality}, Scale factor: ${getDeviceScaleFactor(quality)}`);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

      logger.verbose(`Page dimensions: ${pageWidth}x${pageHeight}px`);

      const pngFileName = generateOutputFilenameWithTimestamp(tag, timestamp, 'png');
      const pngPath = resolve(output, pngFileName);

      await page.screenshot({
        path: pngPath,
        fullPage: true,
        type: 'png',
        animations: 'disabled',
        timeout: 180000,
      });

      await browserContext.close();

      logger.info(`✅ PNG generated: ${pngPath} (${pageWidth}x${pageHeight}px)`);

      return { success: true, path: pngPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ PNG generation failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },
};
