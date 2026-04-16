export interface PersonalityInsights {
  core_traits: string
  strengths: string[]
  challenges: string[]
  behavior_patterns: string
}

export interface RelationshipAdvice {
  communication_style: string
  strengths_in_relationships: string[]
  improvement_areas: string[]
}

export interface MBTIType {
  career_match: string
  personality_insights: PersonalityInsights
  relationship_advice: RelationshipAdvice
}

export type MBTIResult = Record<string, MBTIType>

export interface MultipleIntelligencesResult {
  multiple_intelligences_result: Record<string, number>
  multiple_intelligences_strengths: Record<string, string>
  multiple_intelligences_description: Record<string, string>
  primary_recommand_major_list: string[]
  secondary_recommand_major_list: string[]
  not_recommand_major_list: string[]
}

export interface StudentValueItem {
  score: number
  majors: string[]
}

export type StudentValue = Record<string, StudentValueItem>

export interface TestData {
  mbti: MBTIResult
  multiple_intelligences: MultipleIntelligencesResult
  student_value: StudentValue
}

export interface RadarChartData {
  name: string
  value: number
  fullMark: number
}

export interface BarChartData {
  name: string
  value: number
  fill?: string
}

export interface CognitiveFunction {
  name_en: string
  name_zh: string
  description_en: string
  description_zh: string
}

export interface FunctionRole {
  name_en: string
  name_zh: string
  description_zh: string
}

export interface FunctionStackItem {
  function: string
  name_zh: string
}

export interface FunctionStack {
  dominant: FunctionStackItem
  auxiliary: FunctionStackItem
  tertiary: FunctionStackItem
  inferior: FunctionStackItem
}

export interface FunctionStacksData {
  cognitive_functions: Record<string, CognitiveFunction>
  function_stacks: Record<string, FunctionStack>
  function_roles: Record<string, FunctionRole>
}

export interface MBTITrait {
  letter?: string
  suffix?: string
  name: string
  name_zh: string
  description: string
  description_zh: string
}

export interface MBTITypeDetail {
  mbti_type: string
  type_name: {
    en: string
    zh: string
  }
  role: {
    name: string
    name_zh: string
    description: string
    description_zh: string
  }
  strategy: {
    name: string
    name_zh: string
    description: string
    description_zh: string
  }
  traits: {
    introverted: MBTITrait
    intuitive: MBTITrait
    thinking?: MBTITrait
    feeling?: MBTITrait
    judging: MBTITrait
    perceiving?: MBTITrait
    assertive?: MBTITrait
    turbulent?: MBTITrait
  }
  strengths: Array<{
    name: string
    name_zh: string
    description: string
    description_zh: string
  }>
  weaknesses: Array<{
    name: string
    name_zh: string
    description: string
    description_zh: string
  }>
  research_insight: {
    title: string
    title_zh: string
    content: string
    content_zh: string
  }
  source: {
    name: string
    url: string
  }
}

export interface MBTIPersonalityData {
  类型: string
  介绍: string
  优点和缺点: string
  浪漫关系: string
  友谊: string
  为人父母: string
  职业道路: string
  职场习惯: string
  结论: string
  名人: string[] | string
  描述: string
  昵称: string
  定义: string
  E: number
  I: number
  N: number
  S: number
  T: number
  F: number
  J: number
  P: number
}

export interface MBTIDistributionData {
  [key: string]: number
}
