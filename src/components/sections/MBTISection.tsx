import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BlurFade } from '@/components/ui/blur-fade'
import { BorderBeam } from '@/components/ui/border-beam'
import { MagicCard } from '@/components/ui/magic-card'
import { CheckCircle2, AlertTriangle, Heart, MessageCircle, Users, TrendingUp, Zap, Eye, Compass } from 'lucide-react'
import type { TestData } from '@/types'
import { getMBTITypeName, getMBTITypeData } from '@/lib/data-loader'

interface MBTISectionProps {
  data: TestData
}

export function MBTISection({ data }: MBTISectionProps) {
  const typeName = getMBTITypeName(data)
  const typeData = getMBTITypeData(data)

  if (!typeData) return null

  const { personality_insights, relationship_advice, career_match } = typeData

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <BlurFade>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#667eea]/10 px-4 py-1.5 text-sm font-medium text-[#667eea] mb-3">
              <Eye className="w-4 h-4" />
              人格洞察
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 gradient-text">
              深入了解您的 {typeName} 人格特质
            </h2>
          </div>
        </BlurFade>

        <BlurFade delay={0.1}>
          <Card className="mb-8 relative overflow-hidden border-0 glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
                  <Compass className="w-4 h-4 text-white" />
                </div>
                职业匹配
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">{career_match}</p>
            </CardContent>
            <BorderBeam size={250} duration={12} delay={9} colorFrom="#667eea" colorTo="#f093fb" />
          </Card>
        </BlurFade>

        <BlurFade delay={0.2}>
          <MagicCard className="mb-8 p-6 border-0 bg-gradient-to-br from-white/80 to-purple-50/50 dark:from-white/5 dark:to-purple-900/10">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#667eea]" />
              核心特质
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              {personality_insights.core_traits}
            </p>
          </MagicCard>
        </BlurFade>

        <BlurFade delay={0.3}>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-0 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/10 dark:to-card shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  优势
                </CardTitle>
                <CardDescription>您的核心优势和能力</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {personality_insights.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/10 dark:to-card shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  挑战与成长
                </CardTitle>
                <CardDescription>可以改进的领域</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {personality_insights.challenges.map((challenge, index) => (
                    <li key={index} className="flex items-start gap-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{challenge}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </BlurFade>

        <BlurFade delay={0.4}>
          <Card className="mb-8 border-0 bg-gradient-to-r from-[#667eea]/10 via-[#764ba2]/10 to-[#f093fb]/10 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                行为模式
              </CardTitle>
              <CardDescription>您的认知功能与行为特征</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {personality_insights.behavior_patterns}
              </p>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.5}>
          <div className="text-center mb-8 mt-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f5576c]/10 px-4 py-1.5 text-sm font-medium text-[#f5576c] mb-3">
              <Heart className="w-4 h-4" />
              关系建议
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              如何在人际关系中更好地发挥您的优势
            </h2>
          </div>
        </BlurFade>

        <BlurFade delay={0.6}>
          <Card className="mb-6 border-0 bg-gradient-to-br from-[#4facfe]/5 to-[#00f2fe]/5 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                沟通风格
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {relationship_advice.communication_style}
              </p>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.7}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-0 bg-gradient-to-br from-[#667eea]/5 to-[#764ba2]/5 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">关系优势</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {relationship_advice.strengths_in_relationships.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3 bg-[#667eea]/5 rounded-lg p-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#667eea] mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-[#f093fb]/5 to-[#f5576c]/5 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#f093fb] to-[#f5576c] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-[#f093fb] to-[#f5576c] bg-clip-text text-transparent">改进领域</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {relationship_advice.improvement_areas.map((area, index) => (
                    <li key={index} className="flex items-start gap-3 bg-[#f093fb]/5 rounded-lg p-2.5">
                      <TrendingUp className="w-4 h-4 text-[#f093fb] mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
