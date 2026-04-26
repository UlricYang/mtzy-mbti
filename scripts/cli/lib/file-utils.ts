import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { copyFileSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 检查文件是否存在
 */
/**
 * 检查文件是否存在 (同步, 兼容旧代码)
 * @deprecated Use fileExistsAsync() for better Bun compatibility
 */
export function fileExists(path: string): boolean {
  return existsSync(path);
}

/**
 * 检查文件是否存在 (异步, Bun原生实现)
 * 在Docker容器中更可靠
 */
export async function fileExistsAsync(path: string): Promise<boolean> {
  return await Bun.file(path).exists();
}

/**
 * 复制文件到目标目录
 */
export function copyFile(src: string, destDir: string): string {
  const filename = basename(src);
  const dest = join(destDir, filename);
  copyFileSync(src, dest);
  return dest;
}

/**
 * 复制目录下的所有文件到目标目录
 */
export function copyFiles(srcDir: string, destDir: string, extensions?: string[]): string[] {
  ensureDir(destDir);
  const copied: string[] = [];
  
  const files = readdirSync(srcDir);
  for (const file of files) {
    const srcPath = join(srcDir, file);
    const stat = statSync(srcPath);
    
    if (stat.isFile()) {
      // 如果指定了扩展名，则只复制匹配的文件
      if (extensions) {
        const ext = file.split('.').pop()?.toLowerCase();
        if (!ext || !extensions.includes(ext)) {
          continue;
        }
      }
      const dest = copyFile(srcPath, destDir);
      copied.push(dest);
    }
  }
  
  return copied;
}

/**
 * 获取输入文件的目录路径
 */
export function getInputDir(inputPath: string): string {
  const stat = statSync(inputPath);
  return stat.isDirectory() ? inputPath : dirname(inputPath);
}

/**
 * 解析输入路径（文件或目录）
 * 如果是目录，返回目录下所有JSON文件
 * 如果是文件，返回该文件
 */
export function resolveInputPath(inputPath: string): { type: 'file' | 'dir'; paths: string[] } {
  const absolutePath = resolve(inputPath);
  
  if (!existsSync(absolutePath)) {
    throw new Error(`输入路径不存在: ${absolutePath}`);
  }
  
  const stat = statSync(absolutePath);
  
  if (stat.isFile()) {
    return { type: 'file', paths: [absolutePath] };
  }
  
  if (stat.isDirectory()) {
    const files = readdirSync(absolutePath)
      .filter(f => f.endsWith('.json'))
      .map(f => join(absolutePath, f));
    
    if (files.length === 0) {
      throw new Error(`目录中没有找到JSON文件: ${absolutePath}`);
    }
    
    return { type: 'dir', paths: files };
  }
  
  throw new Error(`无效的输入路径: ${absolutePath}`);
}

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * 生成输出文件名
 * @param tag - 标识符
 * @param format - 输出格式
 */
export function generateOutputFilename(tag: string, format: 'pdf' | 'png' | 'webp' | 'html'): string {
  const timestamp = generateTimestamp();
  return `report-${tag}-${timestamp}.${format}`;
}

/**
 * 解析输出格式参数
 */
export function parseFormats(formatStr?: string): ('pdf' | 'png' | 'webp' | 'html')[] {
  if (!formatStr) {
    return ['pdf', 'png', 'webp', 'html'];
  }
  
  const formats = formatStr.split(',').map(f => f.trim().toLowerCase()) as ('pdf' | 'png' | 'webp' | 'html')[];
  const validFormats = ['pdf', 'png', 'webp', 'html'];
  
  const invalid = formats.filter(f => !validFormats.includes(f));
  if (invalid.length > 0) {
    throw new Error(`无效的输出格式: ${invalid.join(', ')}。有效格式: ${validFormats.join(', ')}`);
  }
  
  return formats;
}

/**
 * Format timestamp for filename (YYYYMMDDHHmmss)
 */
export function formatTimestampForFilename(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Generate output filename with explicit timestamp
 */
export function generateOutputFilenameWithTimestamp(tag: string, timestamp: number, format: 'pdf' | 'png' | 'webp' | 'html'): string {
  return `report-${tag}-${formatTimestampForFilename(timestamp)}.${format}`;
}
/**
 * Port holder that keeps a temporary server alive to reserve the port atomically.
 * Call releasePort() when the real server is ready to take over.
 */
export interface PortHolder {
  port: number;
  releasePort: () => void;
}

/**
 * Find an available port and reserve it atomically.
 * Keeps a temporary server alive to prevent race conditions in concurrent environments.
 * 
 * Usage:
 * ```ts
 * const holder = await reserveAvailablePort(4000);
 * // Port is now reserved - no other request can grab it
 * const realServer = createServer(holder.port);
 * holder.releasePort(); // Release after real server is running
 * ```
 * 
 * @param startPort - Port to start searching from (default: 4000)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 * @returns PortHolder with port number and releasePort function
 */
export async function reserveAvailablePort(startPort: number = 4000, maxAttempts: number = 100): Promise<PortHolder> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      // Create temp server to reserve port - keep it alive!
      const server = Bun.serve({
        port,
        fetch: () => new Response('OK'),
      });
      
      // Return port holder with release function
      return {
        port,
        releasePort: () => server.stop(),
      };
    } catch (err) {
      // Port in use, try next
      if (port === startPort + maxAttempts - 1) {
        throw new Error(`Could not find available port after ${maxAttempts} attempts`);
      }
    }
  }
  
  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

/**
 * Find an available port starting from the specified port (Bun native implementation)
 * @deprecated Use reserveAvailablePort() instead for concurrent-safe port allocation
 * @param startPort - Port to start searching from (default: 4000)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 * @returns Promise that resolves to an available port number
 */
export async function findAvailablePort(startPort: number = 4000, maxAttempts: number = 100): Promise<number> {
  const holder = await reserveAvailablePort(startPort, maxAttempts);
  holder.releasePort(); // Immediately release for backwards compatibility
  return holder.port;
}


/**
 * Container input directory for Docker environments
 * Default: /app/data/input (standard Docker input mount point)
 */
const CONTAINER_INPUT_DIR = process.env.CONTAINER_INPUT_DIR || '/app/data/input';

/**
 * Container base path for Docker environments
 * Default: /app/data (standard Docker data mount point)
 */
const CONTAINER_BASE_PATH = process.env.CONTAINER_BASE_PATH || '/app/data';

/**
 * Detect if running inside a Docker container
 */
function isRunningInDocker(): boolean {
  // Check for Docker-specific indicators
  if (process.env.RUNNING_IN_DOCKER === 'true') return true;
  
  // Check for .dockerenv file (most reliable)
  try {
    if (require('fs').existsSync('/.dockerenv')) {
      return true;
    }
  } catch {
    // Ignore errors
  }
  // Check if /app/data/input exists (Docker mount point)
  try {
    const fs = require('fs');
    return fs.existsSync('/app/data/input');
  } catch {
    return false;
  }
}

/**
 * Resolve filepath for container environment
 * 
 * Behavior:
 * - Absolute path: return as-is (user knows what they're doing)
 * - Simple filename (no path separators): resolve to input directory
 *   e.g., 'inputs.json' -> '/app/data/input/inputs.json' (Docker) or './data/input/inputs.json' (local)
 * - Relative path (with separators): resolve to container base
 *   e.g., 'data/student.json' -> '/app/data/student.json' (Docker) or './data/student.json' (local)
 * 
 * This simplifies API usage - users can just pass 'inputs.json' instead of
 * the full container path '/app/data/input/inputs.json'
 * 
 * @param filepath - The filepath from API request (can be filename, relative path, or absolute path)
 * @returns Absolute path
 */
export function resolveContainerPath(filepath: string): string {
  // Absolute path: return as-is (user responsibility)
  if (filepath.startsWith('/')) {
    return filepath;
  }
  
  // Detect if running in Docker
  const inDocker = isRunningInDocker();
  const baseDir = inDocker ? CONTAINER_INPUT_DIR : resolve(process.cwd(), 'data', 'input');
  const baseBase = inDocker ? CONTAINER_BASE_PATH : resolve(process.cwd(), 'data');
  
  // Simple filename (no path separators): resolve to input directory
  // e.g., 'inputs.json' -> '/app/data/input/inputs.json' or './data/input/inputs.json'
  if (!filepath.includes('/') && !filepath.includes('\\')) {
    return resolve(baseDir, filepath);
  }
  
  // Relative path with separators: resolve to container base
  // e.g., 'data/student.json' -> '/app/data/student.json' or './data/student.json'
  return resolve(baseBase, filepath);
}
