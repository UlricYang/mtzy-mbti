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
export function fileExists(path: string): boolean {
  return existsSync(path);
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
 * Find an available port starting from the specified port (Bun native implementation)
 * @param startPort - Port to start searching from (default: 4000)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 * @returns Promise that resolves to an available port number
 */
export async function findAvailablePort(startPort: number = 4000, maxAttempts: number = 100): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      const server = Bun.serve({
        port,
        fetch: () => new Response('OK'),
      });
      server.stop();
      return port;
    } catch (err) {
      // Port in use, try next
      if (port === startPort + maxAttempts - 1) {
        throw new Error(`Could not find available port after ${maxAttempts} attempts`);
      }
    }
  }
  
  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}
