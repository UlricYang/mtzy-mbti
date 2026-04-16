import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Heart, 
  Users, 
  Baby, 
  Briefcase, 
  Building2, 
  Sparkles,
  Star,
  Trophy
} from 'lucide-react'
import type { MBTIPersonalityData } from '@/types'
import type { CelebritiesOccupation } from '@/lib/data-loader'

interface MBTIPersonalityDetailProps {
  data: MBTIPersonalityData
  celebritiesOccupation: CelebritiesOccupation | null
}

export function MBTIPersonalityDetail({ data, celebritiesOccupation }: MBTIPersonalityDetailProps) {
  const sections = [
    {
      key: 'introduction',
      title: '简介',
      icon: BookOpen,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-500/10 to-cyan-500/10',
      borderColor: 'border-blue-500/30',
      content: data.介绍
    },
    {
      key: 'strengths-weaknesses',
      title: '优点和缺点',
      icon: Trophy,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'from-emerald-500/10 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
      content: data.优点和缺点
    },
    {
      key: 'romantic',
      title: '浪漫关系',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'from-pink-500/10 to-rose-500/10',
      borderColor: 'border-pink-500/30',
      content: data.浪漫关系
    },
    {
      key: 'friendship',
      title: '友谊',
      icon: Users,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'from-purple-500/10 to-violet-500/10',
      borderColor: 'border-purple-500/30',
      content: data.友谊
    },
    {
      key: 'parenting',
      title: '为人父母',
      icon: Baby,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-500/10 to-orange-500/10',
      borderColor: 'border-amber-500/30',
      content: data.为人父母
    },
    {
      key: 'career',
      title: '职业道路',
      icon: Briefcase,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'from-indigo-500/10 to-blue-500/10',
      borderColor: 'border-indigo-500/30',
      content: data.职业道路
    },
    {
      key: 'workplace',
      title: '职场习惯',
      icon: Building2,
      color: 'from-slate-500 to-gray-500',
      bgColor: 'from-slate-500/10 to-gray-500/10',
      borderColor: 'border-slate-500/30',
      content: data.职场习惯
    },
    {
      key: 'celebrities',
      title: '知名人物',
      icon: Star,
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'from-yellow-500/10 to-amber-500/10',
      borderColor: 'border-yellow-500/30',
      content: data.名人,
      isList: true
    }
  ]

  const parseCelebrities = (content: unknown): string[] => {
    if (Array.isArray(content)) {
      return content.filter((item): item is string => typeof item === 'string')
    }
    
    if (typeof content !== 'string') {
      return []
    }
    
    try {
      const normalized = content
        .replace(/[""]/g, '"')
        .replace(/、/g, ',')
      const parsed = JSON.parse(normalized)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      const match = content.match(/"([^"]+)"/g)
      if (match) {
        return match.map(m => m.replace(/[""]/g, ''))
      }
      return []
    }
  }

  const getCelebritiesGroupedByOccupation = (): Map<string, string[]> => {
    if (!celebritiesOccupation) return new Map()
    
    const allCelebrities = parseCelebrities(data.名人)
    const groupedByOccupation = new Map<string, string[]>()
    
    allCelebrities.forEach(name => {
      const fullOccupation = celebritiesOccupation[name]
      if (!fullOccupation) return
      
      const primaryOccupation = fullOccupation.split('/')[0].trim()
      
      const existing = groupedByOccupation.get(primaryOccupation) || []
      groupedByOccupation.set(primaryOccupation, [...existing, name])
    })
    
    return groupedByOccupation
  }

  const celebritiesByOccupation = getCelebritiesGroupedByOccupation()
  const occupationCategories = Array.from(celebritiesByOccupation.entries())

  return (
    <Card className="border-2 border-indigo-500/20 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {data.昵称} - {data.类型}
            </CardTitle>
            <CardDescription>{data.描述}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {sections.map(({ key, title, icon: Icon, color, bgColor, borderColor, content, isList }) => (
          <Card key={key} className={`border ${borderColor} bg-gradient-to-r ${bgColor}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isList && key === 'celebrities' ? (
                <div className="flex flex-wrap gap-3">
                  {parseCelebrities(data.名人)
                    .filter(name => celebritiesOccupation && celebritiesOccupation[name])
                    .map((name) => (
                      <div key={name} className="flex flex-col items-center px-3 py-2 bg-secondary/50 rounded-lg min-w-[80px]">
                        <span className="text-base font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{celebritiesOccupation?.[name]}</span>
                      </div>
                    ))}
                </div>
              ) : isList ? (
                <div className="flex flex-wrap gap-2">
                  {parseCelebrities(content).map((name) => (
                    <Badge key={name} variant="secondary" className="text-sm">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
