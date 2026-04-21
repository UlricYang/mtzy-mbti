---
date: 2026-04-21
topic: "Elysia Static File Serving"
status: validated
---

## Problem Statement

当前架构使用 Vite preview server 托管生产静态文件，这不是生产级解决方案。Vite 官方明确说明 `vite preview` 仅用于本地预览，不适合生产环境。

**目标：** 将静态文件托管迁移到 Elysia，统一为单服务器架构，实现生产级部署能力。

## Constraints

- 保持现有 API 功能不变
- 支持 SPA routing（`/report/:id/:timestamp` 等前端路由）
- 保持数据端点 `/report/:id/:timestamp/data` 正常工作
- 最小化代码改动
- 开发模式（HMR）可以继续使用 Vite

## Approach

使用 `@elysiajs/static` plugin 托管 `dist/` 目录静态文件，配置 `indexHTML: true` 实现 SPA fallback routing。

**为什么选择这个方案：**
1. `@elysiajs/static` 已安装（v1.4.9）
2. Elysia 原生支持，架构一致
3. `indexHTML` 选项专门为 SPA 设计
4. 路由优先级正确：动态路由 > 静态文件 > SPA fallback

**替代方案（未选择）：**
- Nginx：需要额外进程，增加部署复杂度
- Caddy：同样需要额外进程
- 手动实现 static serving：重复造轮子

## Architecture

### Before（当前双服务器架构）

```
┌─────────────────┐         ┌──────────────────┐
│ Elysia API      │ port    │ Vite Preview     │
│ Server          │ 3000    │ Server           │
│                 │◄────────┤                  │
│ /api/*          │ proxy   │ 静态文件 + SPA   │
│ /health         │         │ port 3001        │
└─────────────────┘         └──────────────────┘
```

**问题：**
- 两个进程管理
- Vite preview 不是生产级服务器
- API proxy 增加复杂度

### After（单服务器架构）

```
┌───────────────────────────────────────────┐
│ Elysia Unified Server                     │
│ port 3000                                 │
│                                           │
│ Layer 1: Explicit Dynamic Routes          │
│   - GET  /health                          │
│   - POST /api/preview                     │
│   - POST /api/export                      │
│   - POST /api/report                      │
│   - GET  /report/:id/:timestamp/data      │
│                                           │
│ Layer 2: Static Files (staticPlugin)      │
│   - GET /index.html                       │
│   - GET /assets/*                         │
│   - GET /vite.svg                         │
│                                           │
│ Layer 3: SPA Fallback (indexHTML: true)   │
│   - GET /report/:id/:timestamp → index.html│
│   - GET /any/spa/route → index.html       │
└───────────────────────────────────────────┘
```

## Components

### 1. staticPlugin Integration

**职责：** 托管 `dist/` 目录静态文件，处理 SPA fallback

**配置：**
```typescript
staticPlugin({
  assets: 'dist',       // 静态文件目录
  prefix: '',           // 根路径无前缀
  indexHTML: true,      // SPA fallback
  headers: {
    'Cache-Control': 'public, max-age=31536000', // 静态资源缓存
  }
})
```

**注意：** `indexHTML: true` 只对"既不匹配路由也不匹配静态文件"的请求生效。已定义的动态路由优先级更高。

### 2. Dynamic Routes（保持不变）

现有的动态路由继续工作：
- `/health` - 健康检查
- `/api/preview` - 预览请求
- `/api/export` - 导出请求
- `/api/report` - 复合请求
- `/report/:id/:timestamp/data` - 获取预览数据

### 3. Build Validation

**新增功能：** 启动前检查 `dist/` 目录

**逻辑：**
1. 检查 `dist/index.html` 是否存在
2. 不存在则提示运行 `bun run build`
3. 可选：自动运行 build（需要用户确认）

### 4. Dev Mode vs Prod Mode

**两种运行模式：**

| 模式 | 命令 | 服务器 | 用途 |
|------|------|--------|------|
| 开发 | `bun run dev` | Vite + Elysia | HMR，快速开发 |
| 生产 | `bun run server` | 仅 Elysia | 生产部署 |

## Data Flow

### SPA Route Request Flow

```
用户请求 /report/20240001/1713600000000

1. Elysia 检查动态路由
   → /report/:id/:timestamp/data? 否（路径没有 /data）
   → 不匹配任何动态路由

2. Elysia 检查静态文件
   → dist/report/20240001/... 不存在
   → 不是静态文件

3. Elysia 应用 indexHTML fallback
   → 返回 dist/index.html
   → React Router 在浏览器端处理路由
```

### Data Endpoint Request Flow

```
用户请求 /report/20240001/1713600000000/data

1. Elysia 检查动态路由
   → 匹配 GET /report/:id/:timestamp/data
   → 返回 previewStore 中的数据
   → 不会触发静态文件或 SPA fallback
```

### Static Asset Request Flow

```
用户请求 /assets/index-D4j8k2.js

1. Elysia 检查动态路由
   → 不匹配

2. Elysia 检查静态文件
   → dist/assets/index-D4j8k2.js 存在
   → 返回文件内容
   → 应用 Cache-Control header
```

## Error Handling

### 1. Missing dist/ Directory

**场景：** 用户运行 `bun run server` 但没有先 build

**处理：**
```typescript
if (!fileExists('dist/index.html')) {
  logger.error('dist/ directory not found. Please run "bun run build" first.');
  process.exit(1);
}
```

### 2. Static File Not Found

**场景：** 请求的静态文件不存在（如旧的 asset hash）

**处理：** 
- 返回 404
- 如果是 SPA route，indexHTML 会返回 index.html

### 3. Preview Data Expired

**场景：** `/report/:id/:timestamp/data` 请求的数据已过期

**处理：** 
- 已有逻辑：返回 404 "Preview data not found or expired"
- 保持不变

## Testing Strategy

### 1. Static File Serving Test

```bash
# 启动服务
bun run build
bun run server

# 测试静态文件
curl -I http://localhost:3000/index.html
# 期望: 200 OK, Content-Type: text/html

curl -I http://localhost:3000/assets/index-xxx.js
# 期望: 200 OK, Content-Type: application/javascript
```

### 2. SPA Routing Test

```bash
# 测试 SPA fallback
curl http://localhost:3000/report/20240001/1713600000000
# 期望: 返回 index.html 内容

curl http://localhost:3000/any/random/path
# 期望: 返回 index.html 内容
```

### 3. Dynamic Route Priority Test

```bash
# 测试动态路由优先级
curl http://localhost:3000/report/20240001/1713600000000/data
# 期望: 返回 JSON 数据或 404（如果不存在），而不是 index.html

curl http://localhost:3000/health
# 期望: 返回健康检查 JSON
```

### 4. API Endpoint Test

```bash
# 测试 API 端点
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"student_id":"20240001","file_path":"/path/to/inputs.json"}'
# 期望: 返回预览 URL（http://localhost:3000/report/...）
```

## Open Questions

1. **缓存策略：** 静态资源的 `Cache-Control` header 值是否需要更精细的配置？
   - 建议：hash 文件使用 `max-age=31536000`（1年），index.html 使用 `no-cache`

2. **压缩：** 是否需要启用 gzip/brotli 压缩？
   - 建议：暂不启用，用户量少，保持简单。Nginx 层可处理。

3. **HTTPS：** 生产环境如何处理 HTTPS？
   - 建议：不在应用层处理，由反向代理或云服务处理
