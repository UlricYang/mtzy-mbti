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
  quality: ImageQuality;
  verbose: boolean;
  browser: import('playwright').Browser;
  server: import('child_process').ChildProcess;
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
