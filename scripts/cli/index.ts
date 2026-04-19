#!/usr/bin/env bun

import { Command } from 'commander';
import { devCommand } from './commands/dev';
import { exportCommand } from './commands/export';

const program = new Command();

program
  .name('mtzy-mbti')
  .description('MBTI报告生成器CLI工具')
  .version('1.0.0');

program
  .command('dev')
  .description('启动开发服务器')
  .requiredOption('-i, --input <path>', '输入数据文件路径（JSON文件或目录）')
  .option('-p, --port <number>', '开发服务器端口', '5173')
  .requiredOption('-t, --tag <string>', '报告标识符')
  .option('-w, --watch', '监听输入文件变化，自动重新加载', false)
  .option('-v, --verbose', '显示详细日志', false)
  .action(devCommand);

program
  .command('export')
  .description('导出报告为PDF/图片/HTML')
  .requiredOption('-i, --input <path>', '输入数据文件路径（JSON文件或目录）')
  .requiredOption('-o, --output <path>', '输出目录路径')
  .requiredOption('-t, --tag <string>', '报告标识符')
  .option('-f, --format <formats>', '输出格式，逗号分隔（pdf,png,webp,html）', 'pdf,png,webp,html')
  .option('-q, --quality <level>', '图片质量（standard: 144dpi, high: 216dpi, print: 288dpi）', 'standard')
  .option('-v, --verbose', '显示详细日志', false)
  .action(exportCommand);

program.parse();
