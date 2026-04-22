import { spawn } from 'child_process';
import { resolve, basename } from 'path';
import { watch } from 'chokidar';
import { DevOptions } from '../lib/types';
import { cliLogger } from '../lib/logger';
import { ensureDir, resolveInputPath } from '../lib/file-utils';

export async function devCommand(options: DevOptions): Promise<void> {
  const { input, output, port, tag, watch: shouldWatch } = options;

  cliLogger.info('Starting development server...');
  cliLogger.debug('Input: {input}, Output: {output}, Port: {port}, Tag: {tag}', { input, output, port, tag });

  const { type, paths } = resolveInputPath(input);
  const inputPath = paths[0];
  
  const publicDir = 'public';
  ensureDir(publicDir);

  const dataFileName = basename(inputPath);
  const targetPath = resolve(publicDir, dataFileName);
  
  try {
    await Bun.write(targetPath, Bun.file(inputPath));
    cliLogger.info('Copied data to: {targetPath}', { targetPath });
  } catch (error) {
    cliLogger.error('Failed to copy data file: {error}', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }

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
    cliLogger.error('Failed to start dev server: {error}', { error: err.message });
    process.exit(1);
  });

  vite.on('close', (code) => {
    if (code !== 0 && code !== null) {
      cliLogger.error('Dev server exited with code {code}', { code });
      process.exit(code ?? 1);
    }
  });

  if (shouldWatch) {
    cliLogger.info('Watching for file changes...');
    
    const watcher = watch(inputPath, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', async (path) => {
      cliLogger.info('File changed: {path}', { path });
      try {
        await Bun.write(targetPath, Bun.file(path));
        cliLogger.info('Data reloaded');
      } catch (error) {
        cliLogger.error('Failed to reload data: {error}', { error: error instanceof Error ? error.message : String(error) });
      }
    });

    watcher.on('error', (error) => {
      cliLogger.error('Watcher error: {error}', { error: error.message });
    });
  }

  const cleanup = async () => {
    cliLogger.info('Shutting down...');
    vite.kill('SIGINT');
    
    const targetFile = Bun.file(targetPath);
    if (await targetFile.exists()) {
      try {
        await targetFile.unlink();
        cliLogger.debug('Cleaned up: {targetPath}', { targetPath });
      } catch (error) {
        cliLogger.debug('Failed to cleanup {targetPath}: {error}', { targetPath, error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
