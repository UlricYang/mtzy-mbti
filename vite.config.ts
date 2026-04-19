import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
