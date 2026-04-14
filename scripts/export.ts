#!/usr/bin/env bun

import { spawn, execSync } from 'child_process'
import { resolve, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import puppeteer from 'puppeteer'

const dataPath = process.env.DATA_PATH || 'data/inputs.json'
const outputDir = process.env.OUTPUT_DIR || 'dist'

console.log('\n📦 Exporting report...')
console.log(`📊 Data file: ${resolve(dataPath)}`)
console.log(`📁 Output directory: ${resolve(outputDir)}`)
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

console.log('🔨 Building project...')
try {
  execSync('bun run build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DATA_PATH: dataFileName,
    },
  })
  console.log('✅ Build completed\n')
} catch (error) {
  console.error('❌ Build failed')
  process.exit(1)
}

console.log('🌐 Starting local server...')
const server = spawn('bunx', ['vite', 'preview', '--port', '4173'], {
  stdio: 'pipe',
  shell: true,
})

await new Promise(resolve => setTimeout(resolve, 2000))

console.log('📄 Generating PDF...')

let browser
try {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  
  const page = await browser.newPage()
  
  await page.goto('http://localhost:4173', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  })
  
  await page.waitForSelector('main', { timeout: 10000 })
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const dataFileBaseName = basename(dataPath, '.json')
  const pdfFileName = `${dataFileBaseName}-report.pdf`
  const pdfPath = resolve(outputDir, pdfFileName)
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px',
    },
  })
  
  console.log(`✅ PDF generated: ${pdfPath}\n`)
} catch (error) {
  console.error('❌ PDF generation failed:', error)
} finally {
  if (browser) {
    await browser.close()
  }
}

console.log('🧹 Cleaning up...')
server.kill()

console.log('\n✨ Export completed!')
console.log(`📁 Static files: ${resolve(outputDir)}`)
console.log(`📄 PDF report: ${resolve(outputDir, `${basename(dataPath, '.json')}-report.pdf`)}\n`)
