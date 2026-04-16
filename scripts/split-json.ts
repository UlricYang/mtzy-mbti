#!/usr/bin/env bun

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface MBTITypeData {
  类型: string
  [key: string]: unknown
}

const inputFilePath = path.join(__dirname, '../assets/data/csvjson-zh.json')
const outputDir = path.join(__dirname, '../assets/data/types')

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

try {
  // 读取并解析JSON
  const rawData = fs.readFileSync(inputFilePath, 'utf8')
  const data: MBTITypeData[] = JSON.parse(rawData)

  if (!Array.isArray(data)) {
    throw new Error('Input is not an array')
  }

  console.log(`Found ${data.length} personality types`)

  // 拆分并写入每个文件
  data.forEach((item, index) => {
    if (!item['类型']) {
      console.warn(`Item at index ${index} has no "类型" field, skipping`)
      return
    }
    const typeCode = item['类型']
    const outputPath = path.join(outputDir, `${typeCode.toLowerCase()}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(item, null, 2), 'utf8')
    console.log(`Written: ${outputPath}`)
  })

  console.log('\nSplit completed successfully!')
  console.log(`Total files created: ${data.length}`)
} catch (error) {
  console.error('Error splitting JSON:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}
