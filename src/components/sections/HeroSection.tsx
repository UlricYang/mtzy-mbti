import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import type { TestData } from '@/types'
import { getMBTITypeName } from '@/lib/data-loader'

const MBTI_SVG_PATHS: Record<string, string> = {
  'INTJ': '/intj-architect-male.svg',
  'INTP': '/intp-logician-male.svg',
  'ENTJ': '/entj-commander-male.svg',
  'ENTP': '/entp-debater-male.svg',
  'INFJ': '/infj-advocate-male.svg',
  'INFP': '/infp-mediator-male.svg',
  'ENFJ': '/enfj-protagonist-male.svg',
  'ENFP': '/enfp-campaigner-male.svg',
  'ISTJ': '/istj-logistician-male.svg',
  'ISFJ': '/isfj-defender-male.svg',
  'ESTJ': '/estj-executive-male.svg',
  'ESFJ': '/esfj-consul-male.svg',
  'ISTP': '/istp-virtuoso-male.svg',
  'ISFP': '/isfp-adventurer-male.svg',
  'ESTP': '/estp-entrepreneur-male.svg',
  'ESFP': '/esfp-entertainer-male.svg',
}

interface HeroSectionProps {
  data: TestData
}

export function HeroSection({ data }: HeroSectionProps) {
  const typeName = getMBTITypeName(data)
  const svgPath = MBTI_SVG_PATHS[typeName]

  return (
    <section className="relative min-h-[400px] flex flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative z-10 text-center w-full">
        <Card className="border-2 border-[#667eea]/20 shadow-xl">
          <CardContent className="pt-6 pb-6 px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="flex items-center justify-center gap-8"
            >
              {svgPath && (
                <img
                  src={svgPath}
                  alt={`${typeName} 人物形象`}
                  className="h-40 w-auto object-contain"
                />
              )}
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-lg text-gradient-screen">
                {typeName}
              </h1>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
