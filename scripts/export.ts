#!/usr/bin/env bun

import { spawn, execSync } from 'child_process'
import { resolve, basename } from 'path'
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { chromium, type Browser } from 'playwright'
import sharp from 'sharp'

const dataPath = process.env.DATA_PATH || 'inputs/inputs.json'
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
const pngFileName = `${dataFileBaseName}-report.png`
const htmlFileName = `${dataFileBaseName}-report.html`

let browser: Browser | undefined
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
  
  console.log('🖼️  Generating images...')
  const tempPngPath = resolve(outputDir, 'temp-screenshot.png')
  const imagePath = resolve(outputDir, imageFileName)
  const pngPath = resolve(outputDir, pngFileName)
  
  await page.screenshot({
    path: tempPngPath,
    fullPage: true,
    type: 'png',
  })
  
  const image = sharp(tempPngPath)
  const metadata = await image.metadata()
  
  let finalImage = image
  if (metadata.width && metadata.height) {
    const maxDimension = 16383
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      console.log(`⚠️  Image too large (${metadata.width}x${metadata.height}), resizing...`)
      finalImage = image.resize({
        width: Math.min(metadata.width, maxDimension),
        height: Math.min(metadata.height, maxDimension),
        fit: 'inside',
        withoutEnlargement: true
      })
    }
  }
  
  await finalImage.clone().png({ compressionLevel: 9 }).toFile(pngPath)
  console.log(`✅ PNG generated: ${pngPath}`)
  
  await finalImage.clone().webp({ quality: 85 }).toFile(imagePath)
  console.log(`✅ WebP generated: ${imagePath}\n`)
  
  unlinkSync(tempPngPath)
  
  await context.close()
} catch (error) {
  console.error('❌ Generation failed:', error)
} finally {
  if (browser) {
    await browser.close()
  }
}

console.log('📝 Generating self-contained HTML...')

const htmlOutputPath = resolve(outputDir, htmlFileName)
const indexHtmlPath = resolve(outputDir, 'index.html')

const assetsDir = resolve(outputDir, 'assets')
const assetFiles = existsSync(assetsDir) ? readdirSync(assetsDir) : []
const jsFiles = assetFiles.filter(f => f.endsWith('.js'))

const distInputsPath = resolve(outputDir, dataFileName)
const hasInputsFile = existsSync(distInputsPath)
let inputsData = ''
if (hasInputsFile) {
  inputsData = readFileSync(distInputsPath, 'utf-8')
}

const jsContents: Record<string, string> = {}

const functionStacksPath = resolve(outputDir, 'assets/data/mbti-function-stacks.json')
const distributionPath = resolve(outputDir, 'assets/data/mbti-distribution-China.json')

let functionStacksData = ''
let distributionData = ''

if (existsSync(functionStacksPath)) {
  functionStacksData = readFileSync(functionStacksPath, 'utf-8')
}
if (existsSync(distributionPath)) {
  distributionData = readFileSync(distributionPath, 'utf-8')
}

for (const jsFile of jsFiles) {
  const jsPath = resolve(assetsDir, jsFile)
  let js = readFileSync(jsPath, 'utf-8')
  
  js = js.replace(/"(\/[^"]+\.svg)"/g, (_, p1) => `".${p1}"`)
  js = js.replace(/'([^']+\.svg)'/g, (_, p1) => `'.${p1}'`)
  
  if (hasInputsFile && inputsData) {
    const inlineData = inputsData
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
    
    const dataFetchPattern = /const\s+(\w+)\s*=\s*await\s+fetch\s*\(\s*[`"']\.?\/[^`'"]*\${[^}]+}[^`'"]*[`"']\s*\)/g
    const replacement = `const $1={ok:true,json:async()=>JSON.parse(\`${inlineData}\`)}`
    js = js.replace(dataFetchPattern, replacement)
    
    if (!js.includes('ok:true,json:async()=>JSON.parse')) {
      const altPattern = /const\s+(\w+)\s*=\s*await\s+fetch\s*\(\s*[`"'][^`'"]*inputs\.json[`"']\s*\)/g
      js = js.replace(altPattern, replacement)
    }
  }
  
  if (functionStacksData) {
    const inlineStacks = functionStacksData
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
    const stacksPattern = /fetch\s*\(\s*[`"']\.?\/[^`'"]*mbti-function-stacks\.json[`"']\s*\)/g
    const stacksReplacement = `{ok:true,json:async()=>JSON.parse(\`${inlineStacks}\`)}`
    js = js.replace(stacksPattern, stacksReplacement)
  }
  
  if (distributionData) {
    const inlineDist = distributionData
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
    const distPattern = /fetch\s*\(\s*[`"']\.?\/[^`'"]*mbti-distribution-China\.json[`"']\s*\)/g
    const distReplacement = `{ok:true,json:async()=>JSON.parse(\`${inlineDist}\`)}`
    js = js.replace(distPattern, distReplacement)
  }
  
  js = js.replace(/fetch\s*\(\s*["']\/assets\/([^"']*)["']\s*\)/g, 'fetch("./assets/$1")')
  js = js.replace(/fetch\s*\(\s*["']\/data\/([^"']*)["']\s*\)/g, 'fetch("./data/$1")')
  js = js.replace(/fetch\s*\(\s*["']\/([^"'\/][^"']*)["']\s*\)/g, 'fetch("./$1")')
  js = js.replace(/fetch\s*\(\s*`\/assets\/([^`]*)`\s*\)/g, 'fetch(`./assets/$1`)')
  js = js.replace(/fetch\s*\(\s*`\/data\/([^`]*)`\s*\)/g, 'fetch(`./data/$1`)')
  js = js.replace(/fetch\s*\(\s*`\/([^`\/][^`]*)`\s*\)/g, 'fetch(`./$1`)')
  
  jsContents[jsFile] = js
  writeFileSync(jsPath, js)
}
console.log(`✅ Fixed paths in ${jsFiles.length} JS files`)

try {
  let html = readFileSync(indexHtmlPath, 'utf-8')
  html = html.replace(/href="\/vite\.svg"/g, 'href="./vite.svg"')
  html = html.replace(/type="module"\s*/g, '')
  html = html.replace(/<script\s+crossorigin/g, '<script')
  
  for (const jsFile of jsFiles) {
    const scriptPattern = new RegExp(`<script src="\\.?/?assets/${jsFile}"></script>`, 'g')
    const escapedJs = jsContents[jsFile].replace(/<\/script>/g, '<\\/script>')
    const inlineScript = `<script>\n${escapedJs}\n</script>`
    html = html.replace(scriptPattern, () => inlineScript)
  }
  
  const cssFiles = assetFiles.filter(f => f.endsWith('.css'))
  for (const cssFile of cssFiles) {
    const cssPath = resolve(assetsDir, cssFile)
    const cssContent = readFileSync(cssPath, 'utf-8')
    const linkPattern = new RegExp(`<link rel="stylesheet" href="\\.?/?assets/${cssFile}">`, 'g')
    const inlineStyle = `<style>\n${cssContent}\n</style>`
    html = html.replace(linkPattern, inlineStyle)
  }
  
  writeFileSync(htmlOutputPath, html)
  console.log(`✅ Self-contained HTML generated: ${htmlOutputPath}\n`)
} catch (error) {
  console.error('❌ HTML generation failed:', error)
}

console.log('🧹 Cleaning up...')
server.kill()

console.log('\n✨ Export completed!')
console.log(`📁 Static files: ${resolve(outputDir)}`)
console.log(`📄 PDF report: ${resolve(outputDir, pdfFileName)}`)
console.log(`🖼️  PNG image: ${resolve(outputDir, pngFileName)}`)
console.log(`🖼️  WebP image: ${resolve(outputDir, imageFileName)}`)
console.log(`📝 HTML: ${resolve(outputDir, htmlFileName)}\n`)
