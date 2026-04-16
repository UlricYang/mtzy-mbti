import { RadarChart } from '@/components/charts/RadarChart';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { SectionTitle } from '@/components/ui/section-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prepareRadarChartData } from '@/lib/data-loader';
import type { TestData } from '@/types';
import { Activity, Grid, GraduationCap } from 'lucide-react';

interface IntelligencesSectionProps {
  data: TestData
}

const COLORS = ["#e63946", "#f77f00", "#fcbf49", "#2a9d8f", "#00b4d8", "#4361ee", "#7209b7", "#f72585"]

export function IntelligencesSection({ data }: IntelligencesSectionProps) {
  const radarData = prepareRadarChartData(data)
  const {
    multiple_intelligences_result,
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
        <SectionTitle
          title="多元智能分析"
          subtitle="您的智能优势图谱"
          icon={<Activity className="w-5 h-5" />}
          gradient="from-cyan-500 to-blue-500"
        />

        <BlurFade delay={0.1}>
          <Card className="border-2 border-[#4facfe]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#4facfe]/5 to-[#00f2fe]/5 pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
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
                  <Grid className="w-5 h-5 text-white" />
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
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-semibold text-xl">{name}</span>
                      <Badge 
                        variant="secondary" 
                        className="ml-auto text-lg"
                        style={{ 
                          backgroundColor: `${COLORS[index % COLORS.length]}20`,
                          color: COLORS[index % COLORS.length]
                        }}
                      >
                        {score}分
                      </Badge>
                    </div>
                    <div className="pl-9">
                      <div className="mb-3">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${score}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {multiple_intelligences_description[name]}
                      </p>
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
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">专业推荐</CardTitle>
                  <p className="text-sm text-muted-foreground">基于多元智能分析的专业选择</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-green-500">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h4 className="font-semibold text-xl text-green-600 dark:text-green-400">
                      主要推荐
                    </h4>
                    <Badge variant="outline" className="ml-auto text-sm text-green-600 dark:text-green-400 border-green-500/30">
                      {primary_recommand_major_list.length}个
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {primary_recommand_major_list.map((major) => (
                      <li 
                        key={major}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-900/30"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-base font-medium">{major}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-amber-500">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <h4 className="font-semibold text-xl text-amber-600 dark:text-amber-400">
                      次要推荐
                    </h4>
                    <Badge variant="outline" className="ml-auto text-sm text-amber-600 dark:text-amber-400 border-amber-500/30">
                      {secondary_recommand_major_list.length}个
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {secondary_recommand_major_list.map((major) => (
                      <li 
                        key={major}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="text-base">{major}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-red-500">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <h4 className="font-semibold text-xl text-red-600 dark:text-red-400">
                      不推荐
                    </h4>
                    <Badge variant="outline" className="ml-auto text-sm text-red-600 dark:text-red-400 border-red-500/30">
                      {not_recommand_major_list.length}个
                    </Badge>
                  </div>
                  <ul className="space-y-2">
                    {not_recommand_major_list.map((major) => (
                      <li 
                        key={major}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50/50 dark:bg-red-900/5 border border-red-200/30 dark:border-red-900/20"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span className="text-base text-muted-foreground">{major}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </section>
  )
}
