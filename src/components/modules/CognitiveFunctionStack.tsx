import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Network, Crown, Star, CircleDot, AlertOctagon } from 'lucide-react'
import type { FunctionStack, FunctionStacksData } from '@/types'

interface CognitiveFunctionStackProps {
  functionStack: FunctionStack
  functionStacksData: FunctionStacksData
}

export function CognitiveFunctionStack({ functionStack, functionStacksData }: CognitiveFunctionStackProps) {
  const { cognitive_functions, function_roles } = functionStacksData

  const roles = [
    { 
      key: 'dominant', 
      data: functionStack.dominant, 
      icon: Crown, 
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-500/10 to-pink-500/10',
      borderColor: 'border-purple-500/30'
    },
    { 
      key: 'auxiliary', 
      data: functionStack.auxiliary, 
      icon: Star, 
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-500/10 to-cyan-500/10',
      borderColor: 'border-blue-500/30'
    },
    { 
      key: 'tertiary', 
      data: functionStack.tertiary, 
      icon: CircleDot, 
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-500/10 to-emerald-500/10',
      borderColor: 'border-green-500/30'
    },
    { 
      key: 'inferior', 
      data: functionStack.inferior, 
      icon: AlertOctagon, 
      color: 'from-orange-500 to-yellow-500',
      bgColor: 'from-orange-500/10 to-yellow-500/10',
      borderColor: 'border-orange-500/30'
    }
  ]

  return (
    <Card className="border-2 border-indigo-500/20 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">认知功能堆栈</CardTitle>
            <CardDescription>基于荣格心理类型理论</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map(({ key, data, icon: Icon, color, bgColor, borderColor }) => {
            const role = function_roles[key]
            const func = cognitive_functions[data.function]
            
            return (
              <Card key={key} className={`border ${borderColor} bg-gradient-to-br ${bgColor}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name_zh}</CardTitle>
                        <CardDescription className="text-xs">{role.description_zh}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">{data.name_zh}</span>
                      <div className={`text-5xl font-bold font-mono bg-gradient-to-br ${color} bg-clip-text text-transparent`}>
                        {data.function}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {func.description_zh}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
