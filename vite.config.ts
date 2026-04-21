import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// API server port (used for proxy when running with bun run server)
const apiPort = process.env.VITE_API_PORT || '3000'

/**
 * Custom plugin to handle preview routing:
 * - /report/:student_id/:timestamp/data -> proxy to API server
 * - /report/:student_id/:timestamp -> serve index.html (SPA)
 */
function previewRoutingPlugin(): Plugin {
  return {
    name: 'preview-routing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        
        // Check if this is a preview data endpoint
        const dataMatch = url.match(/^\/report\/([^\/]+)\/([^\/]+)\/data(?:\?.*)?$/)
        
        if (dataMatch) {
          // Proxy to API server for data endpoint
          const proxyReq = http.request(
            {
              hostname: 'localhost',
              port: parseInt(apiPort),
              path: url,
              method: req.method,
              headers: {
                ...req.headers,
                host: `localhost:${apiPort}`,
              },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
              proxyRes.pipe(res)
            }
          )
          
          proxyReq.on('error', (err) => {
            console.error('Proxy error:', err)
            res.writeHead(502)
            res.end('Bad Gateway')
          })
          
          req.pipe(proxyReq)
          return
        }
        
        // Check if this is a preview page route (without /data suffix)
        const pageMatch = url.match(/^\/report\/([^\/]+)\/([^\/]+)(?:\/[^\/]*)?(?:\?.*)?$/)
        
        if (pageMatch && !url.includes('/data')) {
          // Serve index.html for SPA routing
          req.url = '/index.html'
        }
        
        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), previewRoutingPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Proxy API requests to the Elysia server when running with bun run server
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 使用 IIFE 格式，支持本地 file:// 协议直接打开
        format: 'iife',
        // 内联动态导入，避免额外的 chunk 文件
        inlineDynamicImports: true,
      },
    },
  },
})