#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface CelebrityItem {
  类型: string
  名人: string | string[]
}

interface CelebrityMapping {
  type: string
  name: string
}

const inputFilePath = path.join(__dirname, '../assets/data/mbti-types.json')

try {
  const rawData = fs.readFileSync(inputFilePath, 'utf8')
  const data: CelebrityItem[] = JSON.parse(rawData)

  if (!Array.isArray(data)) {
    throw new Error('Input is not an array')
  }

  const allCelebrities: CelebrityMapping[] = []

  data.forEach((item) => {
    const type = item['类型']
    const celebrities = item['名人']

    console.log(`\n=== ${type} ===`)

    let celebrityList: string[] = []
    try {
      if (Array.isArray(celebrities)) {
        celebrityList = celebrities
      } else if (typeof celebrities === 'string') {
        // 解析包含中文引号和逗号的字符串格式
        let content = celebrities.trim()
          .replace(/^\[/, '').replace(/\]$/, '')
          .replace(/"/g, '"').replace(/"/g, '"')
          .replace(/、/g, ',')
        
        const matches = content.match(/"([^"]+)"/g)
        if (matches) {
          celebrityList = matches.map(match => match.replace(/^"|"$/g, ''))
        }
      }
    } catch (error) {
      console.error(`  Failed to parse: ${error instanceof Error ? error.message : String(error)}`)
      celebrityList = []
    }

    celebrityList.forEach(name => {
      const cleanName = name.trim().replace(/^"|"$/g, '').replace(/"/g, '')
      if (cleanName) {
        allCelebrities.push({ type, name: cleanName })
        console.log(`  - ${cleanName}`)
      }
    })

    console.log(`  Total: ${celebrityList.length} celebrities`)
  })

  console.log(`\n\n=== SUMMARY ===`)
  console.log(`Total celebrities across all 16 types: ${allCelebrities.length}`)

  const outputPath = path.join(__dirname, '../celebrities-mapping.json')
  fs.writeFileSync(outputPath, JSON.stringify(allCelebrities, null, 2), 'utf8')
  console.log(`\nSaved mapping to: ${outputPath}`)

} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}
