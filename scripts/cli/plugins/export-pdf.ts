import { resolve } from 'path';
import { ExportPlugin, ExportContext, ExportResult } from '../lib/types';
import { createLogger } from '../lib/logger';
import { generateOutputFilenameWithTimestamp } from '../lib/file-utils';

function getPdfWaitTime(): number {
  return 3000;
}

export const exportPdfPlugin: ExportPlugin = {
  name: 'pdf',

  async execute(context: ExportContext): Promise<ExportResult> {
    const logger = createLogger(context.verbose, 'pdf');
    const { output, tag, timestamp, browser } = context;

    try {
      const browserContext = await browser.newContext({
        viewport: { width: 794, height: 1123 },
      });

      const page = await browserContext.newPage();

      // Navigate to preview URL which triggers dynamic data loading
      const previewUrl = `http://localhost:${context.serverPort}/report/${context.tag}/${context.timestamp}`;
      logger.debug(`Navigating to: ${previewUrl}`);
      await page.goto(previewUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await page.waitForSelector('main', { timeout: 30000 });
      await page.waitForTimeout(getPdfWaitTime());

      const pdfFixStyles = `
        /* Only fix text gradients for PDF - they don't render well in print */
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
      `;

      await page.addStyleTag({ content: pdfFixStyles });
      await page.waitForTimeout(500);

      logger.info('📄 Generating PDF document...');

      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      logger.debug(`Page height: ${pageHeight}px`);

      const pdfFileName = generateOutputFilenameWithTimestamp(tag, timestamp, 'pdf');
      const pdfPath = resolve(output, pdfFileName);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        scale: 1,
      });

      await browserContext.close();

      logger.info(`✅ PDF generated: ${pdfPath}`);

      return { success: true, path: pdfPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ PDF generation failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },
};
