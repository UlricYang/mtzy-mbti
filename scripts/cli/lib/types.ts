/**
 * CLI 类型定义
 */

export interface DevOptions {
  input: string;
  port: number;
  tag: string;
  watch: boolean;
  verbose: boolean;
}

export type ImageQuality = 'standard' | 'high' | 'print';

export interface ExportOptions {
  input: string;
  output: string;
  tag: string;
  format?: string;
  quality?: ImageQuality;
  verbose: boolean;
}

export type OutputFormat = 'pdf' | 'png' | 'webp' | 'html';

export interface ExportContext {
  input: string;
  output: string;
  tag: string;
  timestamp: number;  // Unified timestamp for consistent file naming
  quality: ImageQuality;
  verbose: boolean;
  browser: import('playwright').Browser;
  server: import('child_process').ChildProcess;
  serverPort: number;  // Dynamic port for this export session
  dataFileName: string;
}

export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface ExportPlugin {
  name: OutputFormat;
  execute(context: ExportContext): Promise<ExportResult>;
}


/**
 * Server command CLI options
 */
export interface ServerOptions {
  port: number;
  vitePort?: number;   // Optional: Vite port for dev mode
  output: string;
  verbose: boolean;
  devMode?: boolean;   // New: Run in development mode with Vite
}

// ==================== Preview API ====================

/**
 * API request body for POST /api/preview
 * Stores data for browser preview (fast response)
 */
export interface PreviewRequest {
  student_id: string;
  file_path: string;
}

/**
 * API response for preview endpoint
 */
export interface PreviewResponse {
  status: 'success' | 'error';
  message: string | null;
  data: PreviewResponseData | null;
}

/**
 * Results structure - shared between preview and export
 */
export interface Results {
  url: string;  // preview_url for preview endpoint, '' for export
  png: string;  // PNG file path for export endpoint, '' for preview
  pdf: string;  // PDF file path for export endpoint, '' for preview
}

/**
 * Success response data for preview
 */
export interface PreviewResponseData {
  id: string;
  timestamp: number;
  results: Results;  // url has value, png/pdf are empty strings
}
// ==================== Export API ====================

/**
 * API request body for POST /api/export
 * Exports report to PNG/PDF files
 */
export interface ExportRequest {
  student_id: string;
  file_path: string;
}

/**
 * API response for export endpoint
 */
export interface ExportResponse {
  status: 'success' | 'error';
  message: string | null;
  data: ExportData | null;
}

/**
 * Success response data for export
 */
export interface ExportData {
  id: string;
  timestamp: number;
  results: ExportResults;
}

/**
 * Generated file paths
 */
export interface ExportResults {
  url: string;  // '' for export endpoint
  png: string;
  pdf: string;
}

// ==================== Legacy Report API (deprecated) ====================

/**
 * API request body for POST /api/report (deprecated)
 * Use /api/preview and /api/export instead
 */
export interface ReportRequest {
  student_id: string;
  file_path: string;
}

/**
 * API response body wrapper (legacy)
 */
export interface ReportResponse {
  status: 'success' | 'error';
  message: string | null;
  data: ReportData | null;
}

/**
 * Success response data (legacy)
 */
export interface ReportData {
  id: string;
  timestamp: number;
  results: ReportResults;
}

/**
 * Generated file paths (legacy)
 */
export interface ReportResults {
  url: string;
  png: string;
  pdf: string;
}

// ==================== Preview Store ====================

/**
 * Preview data stored in memory
 */
export interface PreviewStoreData {
  student_id: string;
  timestamp: number;
  data: Record<string, unknown>;
  createdAt: number;
}

/**
 * Memory store type for preview data
 */
export type PreviewStore = Map<string, PreviewStoreData>;

// ==================== Static Serving ====================

/**
 * Configuration for static file serving
 */
export interface StaticConfig {
  assets: string;      // Directory to serve static files from
  prefix: string;      // URL prefix for static files
  indexHTML: boolean;  // Enable SPA fallback routing
  headers?: Record<string, string>;  // Custom headers for static files
}
