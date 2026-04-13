import type { TestData } from '@/types'

export function getDataPath(): string {
  return import.meta.env.VITE_DATA_PATH || 'data/inputs.json'
}

export async function loadData(): Promise<TestData> {
  const dataPath = getDataPath()
  
  try {
    const response = await fetch(`/${dataPath}`)
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`)
    }
    const data = await response.json() as TestData
    
    if (!data.mbti || !data.multiple_intelligences || !data.student_value) {
      throw new Error('Invalid data structure: missing required fields')
    }
    
    return data
  } catch (error) {
    throw new Error(`Failed to load data from ${dataPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function getMBTITypeName(data: TestData): string {
  const types = Object.keys(data.mbti)
  return types[0] || 'Unknown'
}

export function getMBTITypeData(data: TestData) {
  const typeName = getMBTITypeName(data)
  return data.mbti[typeName]
}

export function prepareRadarChartData(data: TestData) {
  const result = data.multiple_intelligences.multiple_intelligences_result
  
  return Object.entries(result).map(([name, value]) => ({
    name,
    value,
    fullMark: 100,
  }))
}

export function prepareBarChartData(data: TestData) {
  const colors = [
    '#667eea',
    '#f093fb',
    '#4facfe',
    '#f5576c',
    '#00f2fe',
    '#764ba2',
  ]
  
  return Object.entries(data.student_value).map(([name, item], index) => ({
    name,
    value: item.score,
    fill: colors[index % colors.length],
  }))
}
