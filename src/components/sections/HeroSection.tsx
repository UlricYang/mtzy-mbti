import { SparklesCore } from '@/components/ui/sparkles'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { motion } from 'framer-motion'
import { Brain, Sparkles } from 'lucide-react'
import type { TestData } from '@/types'
import { getMBTITypeName, getMBTITypeData } from '@/lib/data-loader'

interface HeroSectionProps {
  data: TestData
}

export function HeroSection({ data }: HeroSectionProps) {
  const typeName = getMBTITypeName(data)
  const typeData = getMBTITypeData(data)

  return (
    <section className="relative min-h-[480px] flex flex-col items-center justify-center overflow-hidden px-4 py-16">
      <BackgroundGradientAnimation
        gradientBackgroundStart="rgb(240, 240, 255)"
        gradientBackgroundEnd="rgb(255, 240, 250)"
        firstColor="102, 126, 234"
        secondColor="240, 147, 251"
        thirdColor="79, 172, 254"
        fourthColor="245, 87, 108"
        fifthColor="118, 75, 162"
        pointerColor="102, 126, 234"
        size="60%"
        blendingValue="hard-light"
        interactive={true}
        containerClassName="opacity-60"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-[1]" />

      <div className="absolute inset-0 z-[2]">
        <SparklesCore
          id="hero-sparkles"
          background="transparent"
          minSize={0.4}
          maxSize={1.2}
          particleDensity={80}
          className="w-full h-full"
          particleColor="#667eea"
        />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-purple-200/50 bg-white/60 dark:bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium mb-6"
        >
          <Sparkles className="w-4 h-4 text-[#667eea]" />
          <AnimatedGradientText>
            MBTI 测试结果报告
          </AnimatedGradientText>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#f093fb] bg-clip-text text-transparent drop-shadow-sm">
            {typeName}
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 border border-purple-100/50">
            <Brain className="w-5 h-5 text-[#764ba2]" />
            <TextGenerateEffect
              words={typeData?.career_match?.split('：')[0] || '人格类型分析'}
              className="text-lg md:text-xl font-medium text-foreground"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="inline-flex items-center rounded-full border border-white/30 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground"
        >
          数据来源: {import.meta.env.VITE_DATA_PATH || 'data/inputs.json'}
        </motion.div>
      </div>
    </section>
  )
}
