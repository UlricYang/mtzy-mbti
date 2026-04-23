#!/usr/bin/env bun

import { Command } from 'commander';
import { initLogger } from './lib/logger';
import { devCommand } from './commands/dev';
import { exportCommand } from './commands/export';
import { serverCommand } from './commands/server';

const program = new Command();

program
  .name('mtzy-mbti')
  .description('MBTI报告生成器CLI工具')
  .version('1.0.0');

program
  .command('dev')
  .description('启动开发服务器')
  .requiredOption('-i, --input <path>', '输入数据文件路径（JSON文件或目录）')
  .option('-o, --output <path>', '输出目录路径', './output')
  .option('-p, --port <number>', '开发服务器端口', '5173')
  .requiredOption('-t, --tag <string>', '报告标识符')
  .option('-w, --watch', '监听输入文件变化，自动重新加载', false)
  .option('-v, --verbose', '显示详细日志', false)
  .option('-l, --log-dir <path>', '日志目录路径', 'logs')
  .action(async (options) => {
    await initLogger({ verbose: options.verbose, logDir: options.logDir });
    await devCommand(options);
  });

program
  .command('export')
  .description('导出报告为PDF/图片/HTML')
  .requiredOption('-i, --input <path>', '输入数据文件路径（JSON文件或目录）')
  .requiredOption('-o, --output <path>', '输出目录路径')
  .requiredOption('-t, --tag <string>', '报告标识符')
  .option('-f, --format <formats>', '输出格式，逗号分隔（pdf,png,webp,html）', 'pdf,png,webp,html')
  .option('-q, --quality <level>', '图片质量（standard: 144dpi, high: 216dpi, print: 288dpi）', 'standard')
  .option('-v, --verbose', '显示详细日志', false)
  .option('-l, --log-dir <path>', '日志目录路径', 'logs')
  .action(async (options) => {
    await initLogger({ verbose: options.verbose, logDir: options.logDir });
    await exportCommand(options);
  });

program
  .command('server')
  .description('启动Web服务，提供HTTP API报告生成')
  .option('-o, --output <path>', '输出目录路径', './output')
  .option('-p, --port <number>', '服务器端口', '3000')
  .option('--vite-port <number>', 'Vite 预览服务器端口（默认为 API端口+1）')
  .option('-l, --log-dir <path>', '日志目录路径', 'logs')
  .option('-v, --verbose', '显示详细日志', false)
  .option('--dev', '以开发模式运行（启动Vite开发服务器）', false)
  .action(async (options) => {
    await initLogger({ verbose: options.verbose, logDir: options.logDir });
    const serverOptions = {
      output: options.output,
      port: parseInt(options.port, 10),
      vitePort: options.vitePort ? parseInt(options.vitePort, 10) : undefined,
      verbose: options.verbose,
      devMode: options.dev,
    };
    await serverCommand(serverOptions);
  });

program.parse();
