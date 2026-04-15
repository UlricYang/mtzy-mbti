import { BlurFade } from '@/components/ui/blur-fade';
import { BorderBeam } from '@/components/ui/border-beam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';
import { HeroSection } from './HeroSection';
import { getMBTITypeData, getMBTITypeName } from '@/lib/data-loader';
import type { TestData } from '@/types';
import { AlertTriangle, CheckCircle2, Compass, Eye, Heart, MessageCircle, Sparkles, TrendingUp, Users } from 'lucide-react';

interface MBTISectionProps {
  data: TestData
}

export function MBTISection({ data }: MBTISectionProps) {
  const typeName = getMBTITypeName(data)
  const typeData = getMBTITypeData(data)

  if (!typeData) return null

  const { personality_insights, relationship_advice, career_match } = typeData

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto space-y-8">
        <BlurFade>
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-gradient-screen">
              MBTI 人格分析
            </h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4facfe]/10 px-4 py-1.5 text-sm font-medium text-[#4facfe]">
              <Eye className="w-4 h-4" />
              深入了解您的 {typeName} 人格特质
            </div>
          </div>
        </BlurFade>

        <HeroSection data={data} />

        <BlurFade delay={0.1}>
          <Card className="border-2 border-[#667eea]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">职业匹配</CardTitle>
                  <CardDescription>适合您的职业方向</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 relative">
              <p className="text-xl leading-relaxed">{career_match}</p>
              <BorderBeam size={250} duration={12} delay={9} colorFrom="#667eea" colorTo="#f093fb" />
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.2}>
          <Card className="border-2 border-[#764ba2]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#764ba2]/5 to-[#f093fb]/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#764ba2] to-[#f093fb] flex items-center justify-center shadow-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">人格洞察</CardTitle>
                  <CardDescription>深入了解您的性格特征</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <MagicCard className="p-6 border-0 bg-gradient-to-br from-white/90 to-purple-50/50 dark:from-white/5 dark:to-purple-900/10 shadow-inner">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center flex-shrink-0">
                    <Compass className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">核心特质</h4>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {personality_insights.core_traits}
                    </p>
                  </div>
                </div>
              </MagicCard>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border border-emerald-200/50 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-card shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-lg">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      优势
                    </CardTitle>
                    <CardDescription className="text-xs">您的核心优势和能力</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {personality_insights.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/20 dark:to-card shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-lg">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      挑战与成长
                    </CardTitle>
                    <CardDescription className="text-xs">可以改进的领域</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {personality_insights.challenges.map((challenge, index) => (
                        <li key={index} className="flex items-start gap-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-[#667eea]/20 bg-gradient-to-r from-[#667eea]/5 via-[#764ba2]/5 to-[#f093fb]/5 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    行为模式
                  </CardTitle>
                  <CardDescription className="text-xs">您的认知功能与行为特征</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {personality_insights.behavior_patterns}
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.3}>
          <Card className="border-2 border-[#f5576c]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#f5576c]/5 to-[#f093fb]/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f5576c] to-[#f093fb] flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">关系建议</CardTitle>
                  <CardDescription>在人际关系中发挥优势</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <Card className="border border-[#4facfe]/20 bg-gradient-to-br from-[#4facfe]/5 to-[#00f2fe]/5 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] flex items-center justify-center">
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

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border border-[#667eea]/20 bg-gradient-to-br from-[#667eea]/5 to-[#764ba2]/5 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gradient-screen">关系优势</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {relationship_advice.strengths_in_relationships.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 bg-[#667eea]/5 rounded-lg p-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#667eea] mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-[#f093fb]/20 bg-gradient-to-br from-[#f093fb]/5 to-[#f5576c]/5 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#f093fb] to-[#f5576c] flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gradient-screen-alt">改进领域</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {relationship_advice.improvement_areas.map((area, index) => (
                        <li key={index} className="flex items-start gap-2 bg-[#f093fb]/5 rounded-lg p-2.5">
                          <TrendingUp className="w-4 h-4 text-[#f093fb] mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{area}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </section>
  )
}
