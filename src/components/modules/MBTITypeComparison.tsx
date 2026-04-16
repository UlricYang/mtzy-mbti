import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swords, CheckCircle2, AlertCircle, Lightbulb, User, Target, TrendingUp } from 'lucide-react'
import type { MBTITypeDetail } from '@/types'

interface MBTITypeComparisonProps {
  typeA: MBTITypeDetail
  typeT: MBTITypeDetail
  distributionA?: number
  distributionT?: number
}

export function MBTITypeComparison({ typeA, typeT, distributionA, distributionT }: MBTITypeComparisonProps) {
  return (
    <Card className="border-2 border-indigo-500/20 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Swords className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">类型变体对比</CardTitle>
            <CardDescription>果断型 vs 动荡型特征差异</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TypeVariantCard 
            data={typeA} 
            variant="A"
            icon={CheckCircle2}
            color="from-blue-500 to-cyan-500"
            bgColor="from-blue-500/10 to-cyan-500/10"
            borderColor="border-blue-500/30"
            distribution={distributionA}
          />
          <TypeVariantCard 
            data={typeT} 
            variant="T"
            icon={AlertCircle}
            color="from-purple-500 to-pink-500"
            bgColor="from-purple-500/10 to-pink-500/10"
            borderColor="border-purple-500/30"
            distribution={distributionT}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface TypeVariantCardProps {
  data: MBTITypeDetail
  variant: 'A' | 'T'
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  distribution?: number
}

function TypeVariantCard({ data, variant, icon: Icon, color, bgColor, borderColor, distribution }: TypeVariantCardProps) {
  const traits = Object.entries(data.traits).filter(([key]) => 
    key !== 'assertive' && key !== 'turbulent'
  )
  const variantTrait = variant === 'A' ? data.traits.assertive : data.traits.turbulent

  return (
    <Card className={`border ${borderColor} bg-gradient-to-br ${bgColor} h-full`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl">{data.type_name.zh}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-base font-mono font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent border-0`}>
                {variant === 'A' ? 'Assertive' : 'Turbulent'}
              </Badge>
              {distribution !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  {(distribution * 100).toFixed(2)}%
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
            <User className="w-5 h-5" />
            角色定位
          </h4>
          <p className="text-base font-medium mb-2">{data.role.name_zh}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.role.description_zh}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
            <Target className="w-5 h-5" />
            策略风格
          </h4>
          <p className="text-base font-medium mb-2">{data.strategy.name_zh}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.strategy.description_zh}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${color}`} />
            人格特质
          </h4>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {traits.map(([key, trait]) => (
              <div key={key} className="flex items-center gap-2 p-3 rounded-lg bg-white/50 dark:bg-white/5">
                <div className={`w-8 h-8 rounded bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-bold`}>
                  {trait.letter}
                </div>
                <span className="text-sm font-medium">{trait.name_zh}</span>
              </div>
            ))}
          </div>
          {variantTrait && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-white/80 to-white/50 dark:from-white/10 dark:to-white/5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-sm bg-gradient-to-r ${color} text-white border-0`}>
                  {variantTrait.suffix}
                </Badge>
                <span className="text-base font-medium">{variantTrait.name_zh}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {variantTrait.description_zh}
              </p>
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            核心优势
          </h4>
          <ul className="space-y-3">
            {data.strengths.map((strength) => (
              <li key={strength.name} className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-base font-medium">{strength.name_zh}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed ml-6">
                  {strength.description_zh}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            潜在挑战
          </h4>
          <ul className="space-y-3">
            {data.weaknesses.map((weakness) => (
              <li key={weakness.name} className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-base font-medium">{weakness.name_zh}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed ml-6">
                  {weakness.description_zh}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h5 className="text-sm font-semibold mb-1">{data.research_insight.title_zh}</h5>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.research_insight.content_zh}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
