import { chromium, type Browser, type BrowserContext } from 'playwright';
import { serverLogger } from './logger';

/**
 * Browser Manager - maintains a shared browser instance for all export requests
 * 
 * This solves the concurrent Chromium launch issue where multiple requests
 * trying to launch Chromium simultaneously cause port conflicts.
 * 
 * Usage:
 * - Call initBrowser() on server startup
 * - Call getBrowser() to get the shared instance
 * - Call closeBrowser() on server shutdown
 */
class BrowserManager {
  private browser: Browser | null = null;
  private initializing: Promise<Browser> | null = null;
  private contextCount: number = 0;

  /**
   * Initialize the shared browser instance
   * Should be called once on server startup
   */
  async init(): Promise<Browser> {
    // If already initializing, wait for it
    if (this.initializing) {
      return this.initializing;
    }

    // If already initialized, return existing
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // Start initialization
    this.initializing = this.doInit();
    
    try {
      this.browser = await this.initializing;
      serverLogger.info('Shared browser initialized successfully');
      return this.browser;
    } finally {
      this.initializing = null;
    }
  }

  private async doInit(): Promise<Browser> {
    const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
    serverLogger.info('Initializing shared browser (Docker: {isDocker})...', { isDocker });
    
    // Use headless mode - "new" headless mode in Playwright works well for rendering
    // and avoids Xvfb/crashpad issues in Docker containers
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        ...(isDocker ? [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
        ] : []),
      ],
    });

    // Handle unexpected browser close
    browser.on('disconnected', () => {
      serverLogger.warn('Shared browser disconnected unexpectedly');
      if (this.browser === browser) {
        this.browser = null;
      }
    });

    return browser;
  }

  /**
   * Get the shared browser instance
   * Automatically re-initializes if browser crashed
   */
  async getBrowser(): Promise<Browser> {
    // If browser exists and is connected, return it
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // Browser not available, initialize it
    serverLogger.info('Browser not available, initializing...');
    return this.init();
  }

  /**
   * Create a new browser context from the shared browser
   * Each export request should use its own context for isolation
   */
  async createContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    
    this.contextCount++;
    serverLogger.debug('Created browser context (total contexts: {count})', { count: this.contextCount });

    // Track context closure
    context.on('close', () => {
      this.contextCount--;
      serverLogger.debug('Browser context closed (remaining contexts: {count})', { count: this.contextCount });
    });

    return context;
  }

  /**
   * Close the shared browser instance
   * Should be called on server shutdown
   */
  async close(): Promise<void> {
    if (this.browser) {
      serverLogger.info('Closing shared browser...');
      await this.browser.close();
      this.browser = null;
      serverLogger.info('Shared browser closed');
    }
  }

  /**
   * Get current status for health check
   */
  getStatus(): { connected: boolean; contextCount: number } {
    return {
      connected: this.browser?.isConnected() ?? false,
      contextCount: this.contextCount,
    };
  }
}

// Singleton instance
export const browserManager = new BrowserManager();
