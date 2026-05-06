// @ts-nocheck
import { createDefineConfig } from 'c12';
import type { FilepathConfig } from './scripts/cli/lib/filepath/types';

/**
 * MTZY-MBTI Filepath Resolution Configuration
 *
 * 这个配置文件定义了如何获取测评数据文件的路径:
 * 1. DirectAdapter (优先级100): 如果请求中提供了filepath，直接使用
 * 2. ExternalAPIAdapter (优先级10): 如果没有filepath，调用外部API获取
 *
 * 使用方式:
 * - 本地开发: 直接修改此文件中的API地址
 * - Docker部署: 通过环境变量覆盖 (FILEPATH_API_URL, API_TOKEN)
 */

// Create typed defineConfig function for FilepathConfig
const defineConfig = createDefineConfig<FilepathConfig>();

export default defineConfig({
  // 启用的适配器列表（按优先级顺序）
  adapters: ['direct', 'external_api'],

  // 默认使用的API名称（当请求中没有指定api_name时）
  defaultApi: 'mtzy-data-service',

  // API配置
  apis: {
    // 主数据服务 - 用于获取测评数据文件路径
    'mtzy-data-service': {
      // API端点地址（可通过环境变量覆盖）
      url: process.env.FILEPATH_API_URL || 'http://localhost:8080/api/v1/data/filepath',

      // HTTP方法
      method: 'POST',

      // 请求头
      headers: {
        'Content-Type': 'application/json',
        // 认证token（通过环境变量配置，不要硬编码）
        'Authorization': process.env.API_TOKEN ? `Bearer ${process.env.API_TOKEN}` : '',
      },

      // 超时时间（毫秒）
      timeout: 5000,

      // 请求体格式
      bodyFormat: 'json',
    },

    // 备用API（可选）
    'backup-service': {
      url: process.env.BACKUP_API_URL || 'http://localhost:8081/api/v1/data/filepath',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 3000,
    },
  },

  // 缓存配置
  cache: {
    enabled: true,
    // 缓存有效期：24小时（避免频繁调用API）
    ttlSeconds: 86400,
    // 最大缓存条目数
    maxSize: 1000,
  },

  // 健康检查配置
  healthCheck: {
    enabled: true,
    // 每60秒检查一次API健康状态
    intervalMs: 60000,
  },

  // ========== 环境特定配置 ==========

  // 生产环境覆盖
  '$production': {
    apis: {
      'mtzy-data-service': {
        // 生产环境API地址（必须通过环境变量配置）
        url: process.env.PROD_FILEPATH_API_URL || process.env.FILEPATH_API_URL!,
        // 生产环境超时更长
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PROD_API_TOKEN || process.env.API_TOKEN}`,
        },
      },
    },
    cache: {
      // 启用缓存
      enabled: true,
      // 生产环境缓存时间更长（12小时）
      ttlSeconds: 43200,
      maxSize: 2000,
    },
  },
  // 开发环境覆盖
  '$development': {
    apis: {
      'mtzy-data-service': {
        // 开发环境可以用mock服务
        url: process.env.DEV_FILEPATH_API_URL || 'http://localhost:8080/api/v1/data/filepath',
        timeout: 3000,
      },
    },
    cache: {
      // 开发环境缓存时间短，方便测试
      ttlSeconds: 300, // 5分钟
      maxSize: 100,
    },
    healthCheck: {
      // 开发环境不启用健康检查
      enabled: false,
    },
  },

  // 测试环境覆盖
  '$test': {
    apis: {
      'mtzy-data-service': {
        url: 'http://localhost:9999/mock-api/filepath',
        timeout: 1000,
      },
    },
    cache: {
      enabled: false, // 测试环境不缓存
    },
  },
});