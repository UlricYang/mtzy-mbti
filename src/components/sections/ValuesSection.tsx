import { BarChart } from '@/components/charts/BarChart';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { SectionTitle } from '@/components/ui/section-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prepareBarChartData } from '@/lib/data-loader';
import type { TestData } from '@/types';
import { BarChart3, Scale } from 'lucide-react';

interface ValuesSectionProps {
  data: TestData
}


const SCORE_COLORS = ['#CD5C5C', '#FF7F50', '#FFBF00', '#3CB371', '#48D1CC', '#7B68EE']

export function ValuesSection({ data }: ValuesSectionProps) {
  const barData = prepareBarChartData(data)
  const studentValue = data.student_value

  const sortedValues = Object.entries(studentValue)
    .sort(([, a], [, b]) => b.score - a.score)

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-muted/20 to-muted/30">
      <div className="max-w-6xl mx-auto space-y-8">
        <SectionTitle
          title="价值观分析"
          subtitle="您的价值观图谱"
          icon={<Scale className="w-5 h-5" />}
          gradient="from-violet-500 to-purple-500"
        />

        <BlurFade delay={0.1}>
          <Card className="border-2 border-[#667eea]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                得分对比
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <BarChart data={barData} />
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.2}>
          <Card className="border-2 border-[#764ba2]/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#764ba2]/5 to-[#f093fb]/5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#764ba2] to-[#f093fb] flex items-center justify-center">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">价值观详情</CardTitle>
                  <p className="text-sm text-muted-foreground">各价值观类型对应的专业建议</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {sortedValues.map(([name, item], index) => (
                <Card key={name} className="border border-border/50 bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div 
                        className="w-5 h-5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: SCORE_COLORS[index] }}
                      />
                      <span className="font-semibold text-xl">{name}</span>
                      <Badge 
                        variant="secondary" 
                        className="ml-auto text-lg"
                        style={{ 
                          backgroundColor: `${SCORE_COLORS[index]}20`,
                          color: SCORE_COLORS[index],
                        }}
                      >
                        {item.score}分
                      </Badge>
                    </div>
                    <div>
                      <p className="text-base font-medium text-muted-foreground mb-3">推荐专业类别</p>
                      <div className="flex flex-wrap gap-2">
                        {item.majors.map((major) => (
                          <Badge 
                            key={major} 
                            variant="outline"
                            className="text-base px-3 py-1"
                            style={{ 
                              borderColor: SCORE_COLORS[index],
                              color: SCORE_COLORS[index],
                            }}
                          >
                            {major}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </section>
  )
}
