import { spawn } from 'child_process';
import { resolve, basename } from 'path';
import { watch } from 'chokidar';
import { DevOptions } from '../lib/types';
import { createLogger } from '../lib/logger';
import { ensureDir, resolveInputPath } from '../lib/file-utils';

export async function devCommand(options: DevOptions): Promise<void> {
  const logger = createLogger(options.verbose, 'dev');
  const { input, port, tag, watch: shouldWatch } = options;

  logger.info('🚀 Starting development server...');
  logger.verbose(`Input: ${input}`);
  logger.verbose(`Port: ${port}`);
  logger.verbose(`Tag: ${tag}`);
  logger.verbose(`Watch: ${shouldWatch}`);

  // 解析输入路径
  const { type, paths } = resolveInputPath(input);
  const inputPath = paths[0];
  
  // 确保public目录存在
  const publicDir = 'public';
  ensureDir(publicDir);

  // 复制数据文件到public目录
  const dataFileName = basename(inputPath);
  const targetPath = resolve(publicDir, dataFileName);
  
  try {
    await Bun.write(targetPath, Bun.file(inputPath));
    logger.info(`📋 Copied data to: ${targetPath}`);
  } catch (error) {
    logger.error('Failed to copy data file:', error);
    process.exit(1);
  }

  // 启动Vite开发服务器
  const env = {
    ...process.env,
    VITE_DATA_PATH: dataFileName,
    PORT: String(port),
  };

  const vite = spawn('bunx', ['vite', '--port', String(port)], {
    env,
    stdio: 'inherit',
    shell: true,
  });

  vite.on('error', (err) => {
    logger.error('Failed to start dev server:', err);
    process.exit(1);
  });

  vite.on('close', (code) => {
    if (code !== 0 && code !== null) {
      logger.error(`Dev server exited with code ${code}`);
      process.exit(code ?? 1);
    }
  });

  // 监听文件变化
  if (shouldWatch) {
    logger.info('👀 Watching for file changes...');
    
    const watcher = watch(inputPath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', async (path) => {
      logger.info(`📝 File changed: ${path}`);
      try {
        await Bun.write(targetPath, Bun.file(path));
        logger.info('✅ Data reloaded');
      } catch (error) {
        logger.error('Failed to reload data:', error);
      }
    });

    watcher.on('error', (error) => {
      logger.error('Watcher error:', error);
    });
  }

  // 清理复制的文件
  const cleanup = async () => {
    logger.info('\n👋 Shutting down...');
    vite.kill('SIGINT');
    
    const targetFile = Bun.file(targetPath);
    if (await targetFile.exists()) {
      try {
        await targetFile.unlink();
        logger.verbose(`🧹 Cleaned up: ${targetPath}`);
      } catch (error) {
        logger.verbose(`Failed to cleanup ${targetPath}:`, error);
      }
    }
    
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}