import type { TestData, FunctionStacksData, FunctionStack, MBTITypeDetail, MBTIPersonalityData, MBTIDistributionData } from '@/types';


/**
 * Parse preview URL pattern: /report/{student_id}/{timestamp}
 * Returns { studentId, timestamp } or null if not a preview URL
 */
export function parsePreviewUrl(): { studentId: string; timestamp: string } | null {
  const path = window.location.pathname
  const match = path.match(/^\/report\/([^/]+)\/([^/]+)(?:\/.*)?$/)
  
  if (!match) {
    return null
  }
  
  return {
    studentId: match[1],
    timestamp: match[2]
  }
}

/**
 * Check if the app is running in preview mode
 */
export function isPreviewMode(): boolean {
  return parsePreviewUrl() !== null
}

export function getDataPath(): string {
  return import.meta.env.VITE_DATA_PATH || 'inputs/inputs.json'
}

export async function loadData(): Promise<TestData> {
  // Check if in preview mode first
  const preview = parsePreviewUrl()
  if (preview) {
    return loadPreviewData(preview.studentId, preview.timestamp)
  }
  
  // Otherwise load from static file path
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

/**
 * Load data from preview endpoint
 * Used when app is accessed via /report/{student_id}/{timestamp}
 */
export async function loadPreviewData(studentId: string, timestamp: string): Promise<TestData> {
  const response = await fetch(`/report/${studentId}/${timestamp}/data`)
  
  if (!response.ok) {
    throw new Error(`Failed to load preview data: ${response.status}`)
  }
  
  const data = await response.json() as TestData
  
  if (!data.mbti || !data.multiple_intelligences || !data.student_value) {
    throw new Error('Invalid data structure: missing required fields')
  }
  
  return data
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

const VALUE_COLORS_MAP: Record<string, string> = {
  '科学型': '#CD5C5C',
  '经济型': '#FF7F50',
  '社会型': '#FFBF00',
  '政治型': '#3CB371',
  '审美型': '#48D1CC',
  '精神型': '#7B68EE',
}

export function prepareBarChartData(data: TestData) {
  return Object.entries(data.student_value).map(([name, item]) => ({
    name,
    value: item.score,
    fill: VALUE_COLORS_MAP[name] || '#667eea',
  }))
}

let functionStacksCache: FunctionStacksData | null = null

export async function loadFunctionStacks(): Promise<FunctionStacksData> {
  if (functionStacksCache) {
    return functionStacksCache
  }
  
  const response = await fetch('/assets/data/mbti-function-stacks.json')
  if (!response.ok) {
    throw new Error(`Failed to load function stacks: ${response.status}`)
  }
  
  functionStacksCache = await response.json() as FunctionStacksData
  return functionStacksCache
}

export function getFunctionStack(
  functionStacks: FunctionStacksData,
  mbtiType: string
): FunctionStack | null {
  const baseType = mbtiType.replace(/-[AT]$/, '')
  return functionStacks.function_stacks[baseType] || null
}

export async function loadMBTITypeDetail(mbtiType: string): Promise<MBTITypeDetail | null> {
  try {
    const response = await fetch(`/assets/data/${mbtiType}.json`)
    if (!response.ok) {
      return null
    }
    return await response.json() as MBTITypeDetail
  } catch {
    return null
  }
}

export async function loadMBTITypeVariants(mbtiType: string): Promise<{
  typeA: MBTITypeDetail | null
  typeT: MBTITypeDetail | null
}> {
  const baseType = mbtiType.replace(/-[AT]$/, '')
  
  const [typeA, typeT] = await Promise.all([
    loadMBTITypeDetail(`${baseType}-A`),
    loadMBTITypeDetail(`${baseType}-T`)
  ])
  
  return { typeA, typeT }
}

export async function loadMBTIPersonalityData(mbtiType: string): Promise<MBTIPersonalityData | null> {
  try {
    const baseType = mbtiType.replace(/-[AT]$/, '')
    const response = await fetch(`/assets/data/${baseType}.json`)
    if (!response.ok) {
      return null
    }
    return await response.json() as MBTIPersonalityData
  } catch {
    return null
  }
}

let distributionCache: MBTIDistributionData | null = null

export async function loadMBTIDistribution(): Promise<MBTIDistributionData> {
  if (distributionCache) {
    return distributionCache
  }
  
  const response = await fetch('/assets/data/mbti-distribution-China.json')
  if (!response.ok) {
    throw new Error(`Failed to load distribution data: ${response.status}`)
  }
  
  distributionCache = await response.json() as MBTIDistributionData
  return distributionCache
}

export function getMBTIDistribution(
  distribution: MBTIDistributionData,
  mbtiType: string
): { typeA: number; typeT: number; total: number } | null {
  const baseType = mbtiType.replace(/-[AT]$/, '')
  const keyA = `${baseType}-A`
  const keyT = `${baseType}-T`
  
  const typeA = distribution[keyA]
  const typeT = distribution[keyT]
  
  if (typeA === undefined || typeT === undefined) {
    return null
  }
  
  return {
    typeA,
    typeT,
    total: typeA + typeT
  }
}

export type CelebritiesOccupation = Record<string, string>

let celebritiesOccupationCache: CelebritiesOccupation | null = null

export async function loadCelebritiesOccupation(): Promise<CelebritiesOccupation> {
  if (celebritiesOccupationCache) {
    return celebritiesOccupationCache
  }
  
  const response = await fetch('/assets/data/mbti-celebrities-occupation.json')
  if (!response.ok) {
    throw new Error(`Failed to load celebrities occupation data: ${response.status}`)
  }
  
  celebritiesOccupationCache = await response.json() as CelebritiesOccupation
  return celebritiesOccupationCache
}
