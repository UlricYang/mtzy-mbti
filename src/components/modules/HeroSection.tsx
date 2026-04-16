import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import type { TestData } from '@/types'
import { getMBTITypeName } from '@/lib/data-loader'
import { Users, Sparkles, TrendingUp } from 'lucide-react'

const MBTI_SVG_PATHS: Record<string, string> = {
  'INTJ': '/assets/avatar/intj-architect-male.svg',
  'INTP': '/assets/avatar/intp-logician-male.svg',
  'ENTJ': '/assets/avatar/entj-commander-male.svg',
  'ENTP': '/assets/avatar/entp-debater-male.svg',
  'INFJ': '/assets/avatar/infj-advocate-male.svg',
  'INFP': '/assets/avatar/infp-mediator-male.svg',
  'ENFJ': '/assets/avatar/enfj-protagonist-male.svg',
  'ENFP': '/assets/avatar/enfp-campaigner-male.svg',
  'ISTJ': '/assets/avatar/istj-logistician-male.svg',
  'ISFJ': '/assets/avatar/isfj-defender-male.svg',
  'ESTJ': '/assets/avatar/estj-executive-male.svg',
  'ESFJ': '/assets/avatar/esfj-consul-male.svg',
  'ISTP': '/assets/avatar/istp-virtuoso-male.svg',
  'ISFP': '/assets/avatar/isfp-adventurer-male.svg',
  'ESTP': '/assets/avatar/estp-entrepreneur-male.svg',
  'ESFP': '/assets/avatar/esfp-entertainer-male.svg',
}

const MBTI_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  'INTJ': { primary: 'from-purple-600 to-indigo-600', secondary: 'from-purple-500/20 to-indigo-500/20', accent: 'text-purple-600' },
  'INTP': { primary: 'from-blue-600 to-cyan-600', secondary: 'from-blue-500/20 to-cyan-500/20', accent: 'text-blue-600' },
  'ENTJ': { primary: 'from-red-600 to-orange-600', secondary: 'from-red-500/20 to-orange-500/20', accent: 'text-red-600' },
  'ENTP': { primary: 'from-amber-600 to-yellow-600', secondary: 'from-amber-500/20 to-yellow-500/20', accent: 'text-amber-600' },
  'INFJ': { primary: 'from-teal-600 to-emerald-600', secondary: 'from-teal-500/20 to-emerald-500/20', accent: 'text-teal-600' },
  'INFP': { primary: 'from-pink-600 to-rose-600', secondary: 'from-pink-500/20 to-rose-500/20', accent: 'text-pink-600' },
  'ENFJ': { primary: 'from-violet-600 to-purple-600', secondary: 'from-violet-500/20 to-purple-500/20', accent: 'text-violet-600' },
  'ENFP': { primary: 'from-fuchsia-600 to-pink-600', secondary: 'from-fuchsia-500/20 to-pink-500/20', accent: 'text-fuchsia-600' },
  'ISTJ': { primary: 'from-slate-600 to-gray-600', secondary: 'from-slate-500/20 to-gray-500/20', accent: 'text-slate-600' },
  'ISFJ': { primary: 'from-rose-600 to-pink-600', secondary: 'from-rose-500/20 to-pink-500/20', accent: 'text-rose-600' },
  'ESTJ': { primary: 'from-blue-700 to-indigo-700', secondary: 'from-blue-600/20 to-indigo-600/20', accent: 'text-blue-700' },
  'ESFJ': { primary: 'from-orange-600 to-red-600', secondary: 'from-orange-500/20 to-red-500/20', accent: 'text-orange-600' },
  'ISTP': { primary: 'from-gray-700 to-slate-700', secondary: 'from-gray-600/20 to-slate-600/20', accent: 'text-gray-700' },
  'ISFP': { primary: 'from-lime-600 to-green-600', secondary: 'from-lime-500/20 to-green-500/20', accent: 'text-lime-600' },
  'ESTP': { primary: 'from-cyan-600 to-blue-600', secondary: 'from-cyan-500/20 to-blue-500/20', accent: 'text-cyan-600' },
  'ESFP': { primary: 'from-yellow-600 to-orange-600', secondary: 'from-yellow-500/20 to-orange-500/20', accent: 'text-yellow-600' },
}

interface HeroSectionProps {
  data: TestData
  distributionPercentage?: number
}

export function HeroSection({ data, distributionPercentage }: HeroSectionProps) {
  const typeName = getMBTITypeName(data)
  const svgPath = MBTI_SVG_PATHS[typeName]
  const colors = MBTI_COLORS[typeName] || MBTI_COLORS['INTJ']

  return (
    <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden px-4 py-16">
      <Card className="relative w-full max-w-5xl border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl overflow-hidden">
        {/* Gradient border */}
        <div className={`absolute inset-0 bg-gradient-to-r ${colors.primary} opacity-10`} />
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.secondary}`} />
        
        <CardContent className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Left side - SVG and Title */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex items-center gap-6 md:gap-10"
            >
              {svgPath && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    rotate: [0, -5, 5, -5, 0],
                    transition: { duration: 0.5 }
                  }}
                  className="relative flex-shrink-0"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${colors.primary} opacity-20 blur-2xl rounded-full`} />
                  <img
                    src={svgPath}
                    alt={`${typeName} 人物形象`}
                    className="relative h-48 md:h-64 w-auto object-contain drop-shadow-2xl"
                  />
                </motion.div>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-center md:text-left"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    delay: 0.5
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 mb-4"
                >
                  <Sparkles className={`w-4 h-4 ${colors.accent}`} />
                  <span className="text-sm font-medium text-muted-foreground">MBTI 人格类型</span>
                </motion.div>
                
                <motion.h1
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    delay: 0.3
                  }}
                  className={`text-8xl md:text-[12rem] font-black tracking-tighter ${colors.accent} drop-shadow-lg`}
                  style={{
                    WebkitTextStroke: '1px rgba(0,0,0,0.1)'
                  }}
                >
                  {typeName}
                </motion.h1>
              </motion.div>
            </motion.div>

            {/* Right side - Stats */}
            {distributionPercentage !== undefined && (
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 150,
                  delay: 0.6
                }}
                whileHover={{ scale: 1.05 }}
                className="relative flex flex-col items-center justify-center p-6 md:p-8"
              >
                {/* Icon and label */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 mb-4"
                >
                  <Users className={`w-4 h-4 ${colors.accent}`} />
                  <span className="text-sm font-medium text-muted-foreground">中国人口占比</span>
                </motion.div>
                
                {/* Progress ring with data inside */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: "spring", stiffness: 150 }}
                  className="relative w-40 h-40 md:w-48 md:h-48"
                >
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" role="img" aria-label="人口占比进度环">
                    <title>中国人口占比进度环</title>
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <motion.circle
                      initial={{ strokeDasharray: "0 283" }}
                      animate={{ strokeDasharray: `${distributionPercentage * 283} 283` }}
                      transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Data inside the ring */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <div className="flex items-end gap-1">
                      <span className={`text-3xl md:text-4xl font-normal bg-gradient-to-br ${colors.primary} bg-clip-text text-transparent`}>
                        {(distributionPercentage * 100).toFixed(2)}
                      </span>
                      <span className={`text-xl md:text-2xl font-normal mb-1 bg-gradient-to-br ${colors.primary} bg-clip-text text-transparent`}>
                        %
                      </span>
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.6 }}
                      className="flex items-center gap-1 mt-1"
                    >
                      <TrendingUp className={`w-3 h-3 ${colors.accent}`} />
                      <span className="text-xs text-muted-foreground">中国区数据</span>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
