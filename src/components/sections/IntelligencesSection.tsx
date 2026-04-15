import { RadarChart } from '@/components/charts/RadarChart';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prepareRadarChartData } from '@/lib/data-loader';
import type { TestData } from '@/types';
import { Brain, Target, TrendingUp } from 'lucide-react';

interface IntelligencesSectionProps {
  data: TestData
}

const COLORS = ["#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#a0c4ff", "#bdb2ff", "#ffc6ff"]

export function IntelligencesSection({ data }: IntelligencesSectionProps) {
  const radarData = prepareRadarChartData(data)
  const {
    multiple_intelligences_result,
    multiple_intelligences_strengths,
    multiple_intelligences_description,
    primary_recommand_major_list,
    secondary_recommand_major_list,
    not_recommand_major_list,
  } = data.multiple_intelligences

  const sortedIntelligences = Object.entries(multiple_intelligences_result)
    .sort(([, a], [, b]) => b - a)

  return (
    <section className="py-16 px-4 bg-muted/10">
      <div className="max-w-6xl mx-auto space-y-8">
        <BlurFade>
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
              多元智能分析
            </h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4facfe]/10 px-4 py-1.5 text-sm font-medium text-[#4facfe]">
              <Brain className="w-4 h-4" />
              您的智能优势图谱
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.1}>
          <Card className="border-2 border-[#4facfe]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#4facfe]/5 to-[#00f2fe]/5 pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                智能分布
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RadarChart data={radarData} className="w-full h-[600px]" />
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.2}>
          <Card className="border-2 border-[#764ba2]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#764ba2]/5 to-[#f093fb]/5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#764ba2] to-[#f093fb] flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">智能详情</CardTitle>
                  <p className="text-sm text-muted-foreground">各智能类型详细分析</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {sortedIntelligences.map(([name, score], index) => (
                <Card key={name} className="border border-border/50 bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-semibold text-xl">{name}</span>
                      <Badge variant="secondary" className="ml-auto text-lg">
                        {score}分
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 pl-9">
                      <div>
                        <p className="text-base font-medium text-muted-foreground mb-1">描述</p>
                        <p className="text-base leading-relaxed">{multiple_intelligences_description[name]}</p>
                      </div>
                      <div>
                        <p className="text-base font-medium text-muted-foreground mb-1">优势</p>
                        <p className="text-base leading-relaxed">{multiple_intelligences_strengths[name]}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.3}>
          <Card className="border-2 border-[#f5576c]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#f5576c]/5 to-[#f093fb]/5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f5576c] to-[#f093fb] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">专业推荐</CardTitle>
                  <p className="text-sm text-muted-foreground">基于多元智能分析的专业选择</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  主要推荐
                </h4>
                <div className="flex flex-wrap gap-2">
                  {primary_recommand_major_list.map((major) => (
                    <Badge
                      key={major}
                      variant="default"
                      className="text-base px-4 py-1.5 bg-gradient-to-r from-[#667eea] to-[#764ba2]"
                    >
                      {major}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  次要推荐
                </h4>
                <div className="flex flex-wrap gap-2">
                  {secondary_recommand_major_list.map((major) => (
                    <Badge
                      key={major}
                      variant="secondary"
                      className="text-base px-4 py-1.5"
                    >
                      {major}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  不推荐
                </h4>
                <div className="flex flex-wrap gap-2">
                  {not_recommand_major_list.map((major) => (
                    <Badge
                      key={major}
                      variant="outline"
                      className="text-base px-4 py-1.5 text-muted-foreground"
                    >
                      {major}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </section>
  )
}
