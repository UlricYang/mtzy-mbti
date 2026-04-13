import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { RadarChart } from '@/components/charts/RadarChart'
import { BlurFade } from '@/components/ui/blur-fade'
import type { TestData } from '@/types'
import { prepareRadarChartData } from '@/lib/data-loader'

interface IntelligencesSectionProps {
  data: TestData
}

const COLORS = [
  '#667eea',
  '#f093fb',
  '#4facfe',
  '#f5576c',
  '#00f2fe',
  '#764ba2',
  '#fbbf24',
  '#34d399',
]

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

  // Sort by score descending
  const sortedIntelligences = Object.entries(multiple_intelligences_result)
    .sort(([, a], [, b]) => b - a)

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <BlurFade>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              多元智能分析
            </h2>
            <p className="text-muted-foreground">
              基于霍华德·加德纳的多元智能理论
            </p>
          </div>
        </BlurFade>

        {/* Radar Chart */}
        <BlurFade delay={0.1}>
          <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-card to-muted/30">
            <CardHeader>
              <CardTitle className="text-center">智能雷达图</CardTitle>
              <CardDescription className="text-center">
                八大智能维度得分可视化
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadarChart data={radarData} />
            </CardContent>
          </Card>
        </BlurFade>

        {/* Intelligence Details */}
        <BlurFade delay={0.2}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>智能详情</CardTitle>
              <CardDescription>点击查看各智能类型详细说明</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {sortedIntelligences.map(([name, score], index) => (
                  <AccordionItem key={name} value={name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{name}</span>
                        <Badge variant="secondary" className="ml-auto mr-2">
                          {score}分
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">描述</p>
                          <p className="text-sm">{multiple_intelligences_description[name]}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">优势说明</p>
                          <p className="text-sm">{multiple_intelligences_strengths[name]}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Major Recommendations */}
        <BlurFade delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle>专业推荐</CardTitle>
              <CardDescription>基于多元智能分析的专业选择建议</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  主要推荐
                </h4>
                <div className="flex flex-wrap gap-2">
                  {primary_recommand_major_list.map((major) => (
                    <Badge 
                      key={major} 
                      variant="default"
                      className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90"
                    >
                      {major}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  次要推荐
                </h4>
                <div className="flex flex-wrap gap-2">
                  {secondary_recommand_major_list.map((major) => (
                    <Badge 
                      key={major} 
                      variant="secondary"
                      className="hover:bg-secondary/80"
                    >
                      {major}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  不推荐
                </h4>
                <div className="flex flex-wrap gap-2">
                  {not_recommand_major_list.map((major) => (
                    <Badge 
                      key={major} 
                      variant="outline"
                      className="text-muted-foreground"
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
