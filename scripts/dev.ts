#!/usr/bin/env bun

import { spawn } from 'child_process'
import { resolve, basename } from 'path'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

const dataPath = process.env.DATA_PATH || 'inputs/inputs.json'
const port = process.env.PORT || '5173'

console.log('\n🚀 Starting development server...')
console.log(`📊 Data file: ${resolve(dataPath)}`)
console.log(`🌐 Server port: ${port}`)
console.log('')

const publicDir = 'public'
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

const dataFileName = basename(dataPath)
const targetPath = resolve(publicDir, dataFileName)
try {
  copyFileSync(resolve(dataPath), targetPath)
  console.log(`📋 Copied data to: ${targetPath}\n`)
} catch (error) {
  console.error('Failed to copy data file:', error)
  process.exit(1)
}

const env = {
  ...process.env,
  VITE_DATA_PATH: dataFileName,
  PORT: port,
}

const vite = spawn('bunx', ['vite', '--port', port], {
  env,
  stdio: 'inherit',
  shell: true,
})

vite.on('error', (err) => {
  console.error('Failed to start dev server:', err)
  process.exit(1)
})

vite.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Dev server exited with code ${code}`)
    process.exit(code ?? 1)
  }
})

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...')
  vite.kill('SIGINT')
})

process.on('SIGTERM', () => {
  vite.kill('SIGTERM')
})
