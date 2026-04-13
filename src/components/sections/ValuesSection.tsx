import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { BarChart } from '@/components/charts/BarChart'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import type { TestData } from '@/types'
import { prepareBarChartData } from '@/lib/data-loader'

interface ValuesSectionProps {
  data: TestData
}

const VALUE_COLORS: Record<string, string> = {
  '科学型': '#667eea',
  '经济型': '#f093fb',
  '社会型': '#4facfe',
  '政治型': '#f5576c',
  '审美型': '#00f2fe',
  '精神型': '#764ba2',
}

export function ValuesSection({ data }: ValuesSectionProps) {
  const barData = prepareBarChartData(data)
  const studentValue = data.student_value

  // Sort by score descending
  const sortedValues = Object.entries(studentValue)
    .sort(([, a], [, b]) => b.score - a.score)

  return (
    <section className="py-12 px-4 bg-muted/10">
      <div className="max-w-4xl mx-auto">
        <BlurFade>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              学生价值观分析
            </h2>
            <p className="text-muted-foreground">
              探索您的核心价值观取向
            </p>
          </div>
        </BlurFade>

        {/* Score Summary Cards */}
        <BlurFade delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {sortedValues.slice(0, 6).map(([name, item]) => (
              <Card 
                key={name} 
                className="border-0 shadow-md hover:shadow-lg transition-shadow"
                style={{ 
                  background: `linear-gradient(135deg, ${VALUE_COLORS[name]}10 0%, ${VALUE_COLORS[name]}05 100%)` 
                }}
              >
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground mb-1">{name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold" style={{ color: VALUE_COLORS[name] }}>
                      <NumberTicker value={item.score} />
                    </span>
                    <span className="text-sm text-muted-foreground">分</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </BlurFade>

        {/* Bar Chart */}
        <BlurFade delay={0.2}>
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">价值观得分对比</CardTitle>
              <CardDescription className="text-center">
                六大价值观维度得分可视化
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart data={barData} />
            </CardContent>
          </Card>
        </BlurFade>

        {/* Value Details */}
        <BlurFade delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle>价值观详情</CardTitle>
              <CardDescription>点击查看各价值观类型对应的专业建议</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {sortedValues.map(([name, item]) => (
                  <AccordionItem key={name} value={name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: VALUE_COLORS[name] }}
                        />
                        <span className="font-medium">{name}</span>
                        <Badge 
                          variant="secondary" 
                          className="ml-auto mr-2"
                          style={{ 
                            backgroundColor: `${VALUE_COLORS[name]}20`,
                            color: VALUE_COLORS[name],
                          }}
                        >
                          {item.score}分
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">推荐专业类别</p>
                        <div className="flex flex-wrap gap-2">
                          {item.majors.map((major) => (
                            <Badge 
                              key={major} 
                              variant="outline"
                              style={{ 
                                borderColor: VALUE_COLORS[name],
                                color: VALUE_COLORS[name],
                              }}
                            >
                              {major}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </section>
  )
}
