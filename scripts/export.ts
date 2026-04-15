#!/usr/bin/env bun

import { spawn, execSync } from 'child_process'
import { resolve, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { chromium } from 'playwright'
import sharp from 'sharp'

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

const dataFileBaseName = basename(dataPath, '.json')
const pdfFileName = `${dataFileBaseName}-report.pdf`
const imageFileName = `${dataFileBaseName}-report.webp`
const htmlFileName = `${dataFileBaseName}-report.html`

let browser
try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 794, height: 1123 },
    deviceScaleFactor: 2,
  })
  
  const page = await context.newPage()
  
  await page.goto('http://localhost:4173', {
    waitUntil: 'networkidle',
    timeout: 60000
  })
  
  await page.waitForSelector('main', { timeout: 10000 })
  await page.waitForTimeout(3000)
  
  const pdfFixStyles = `
    .text-gradient-screen,
    .text-gradient-screen-alt,
    .gradient-text,
    [class*="bg-clip-text"],
    [class*="text-transparent"] {
      background: none !important;
      background-image: none !important;
      -webkit-background-clip: unset !important;
      background-clip: unset !important;
      -webkit-text-fill-color: #667eea !important;
      color: #667eea !important;
    }
    * {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      filter: none !important;
      mix-blend-mode: normal !important;
      -webkit-font-smoothing: antialiased !important;
    }
  `
  
  await page.addStyleTag({ content: pdfFixStyles })
  await page.waitForTimeout(500)
  
  console.log('📄 Generating PDF...')
  const pdfPath = resolve(outputDir, pdfFileName)
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    tagged: true,
    outline: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px',
    },
  })
  console.log(`✅ PDF generated: ${pdfPath}\n`)
  
  console.log('🖼️  Generating WebP image...')
  const tempPngPath = resolve(outputDir, 'temp-screenshot.png')
  const imagePath = resolve(outputDir, imageFileName)
  await page.screenshot({
    path: tempPngPath,
    fullPage: true,
    type: 'png',
  })
  await sharp(tempPngPath)
    .webp({ quality: 90 })
    .toFile(imagePath)
  unlinkSync(tempPngPath)
  console.log(`✅ WebP generated: ${imagePath}\n`)
  
  await context.close()
} catch (error) {
  console.error('❌ Generation failed:', error)
} finally {
  if (browser) {
    await browser.close()
  }
}

console.log('📝 Copying HTML with external assets...')

const htmlOutputPath = resolve(outputDir, htmlFileName)
const indexHtmlPath = resolve(outputDir, 'index.html')

try {
  let html = readFileSync(indexHtmlPath, 'utf-8')
  html = html.replace(/\/assets\//g, './assets/')
  html = html.replace(/href="\/vite\.svg"/g, 'href="./vite.svg"')
  html = html.replace(/type="module"\s*/g, '')
  html = html.replace(/<script crossorigin/g, '<script defer crossorigin')
  writeFileSync(htmlOutputPath, html)
  console.log(`✅ HTML generated: ${htmlOutputPath}\n`)
} catch (error) {
  console.error('❌ HTML generation failed:', error)
}

console.log('🔧 Fixing absolute paths and inlining data...')
const assetsDir = resolve(outputDir, 'assets')
const assetFiles = existsSync(assetsDir) ? readdirSync(assetsDir) : []
const jsFiles = assetFiles.filter(f => f.endsWith('.js'))

const distInputsPath = resolve(outputDir, dataFileName)
const hasInputsFile = existsSync(distInputsPath)
let inputsData = ''
if (hasInputsFile) {
  inputsData = readFileSync(distInputsPath, 'utf-8')
}

for (const jsFile of jsFiles) {
  const jsPath = resolve(assetsDir, jsFile)
  let js = readFileSync(jsPath, 'utf-8')
  
  js = js.replace(/"(\/[^"]+\.svg)"/g, '".$1"')
  js = js.replace(/'(\/[^']+\.svg)'/g, "'.'$1'")
  
  if (hasInputsFile && inputsData) {
    const inlineData = inputsData
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
    js = js.replace(
      /async function kB\(\)\{const e=KO\(\);try\{const t=await fetch\(`\/\$\{e\}`\)/,
      `async function kB(){const e=KO();try{const t={ok:true,json:async()=>JSON.parse(\`${inlineData}\`)}`
    )
  }
  
  writeFileSync(jsPath, js)
}
console.log(`✅ Fixed paths in ${jsFiles.length} JS files\n`)

console.log('🧹 Cleaning up...')
server.kill()

console.log('\n✨ Export completed!')
console.log(`📁 Static files: ${resolve(outputDir)}`)
console.log(`📄 PDF report: ${resolve(outputDir, pdfFileName)}`)
console.log(`🖼️  WebP image: ${resolve(outputDir, imageFileName)}`)
console.log(`📝 HTML: ${resolve(outputDir, htmlFileName)}\n`)
