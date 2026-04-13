// MBTI 人格类型相关类型
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

// 多元智能相关类型
export interface MultipleIntelligencesResult {
  multiple_intelligences_result: Record<string, number>
  multiple_intelligences_strengths: Record<string, string>
  multiple_intelligences_description: Record<string, string>
  primary_recommand_major_list: string[]
  secondary_recommand_major_list: string[]
  not_recommand_major_list: string[]
}

// 学生价值观相关类型
export interface StudentValueItem {
  score: number
  majors: string[]
}

export type StudentValue = Record<string, StudentValueItem>

// 完整数据类型
export interface TestData {
  mbti: MBTIResult
  multiple_intelligences: MultipleIntelligencesResult
  student_value: StudentValue
}

// 图表数据类型
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
