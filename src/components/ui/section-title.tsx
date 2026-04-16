import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { SectionDivider, SectionLine } from '@/components/modules/SectionDivider'

interface SectionTitleProps {
  title: string
  subtitle: string
  icon: ReactNode
  gradient?: string
}

export function SectionTitle({ title, subtitle, icon, gradient = 'from-indigo-500 to-purple-500' }: SectionTitleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative py-12"
    >
      {/* Decorative top line */}
      <SectionLine className="absolute top-0 left-0 right-0" />
      
      {/* Main content */}
      <div className="text-center space-y-6">
        {/* Icon badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br shadow-lg"
        >
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <div className="text-white scale-125">
              {icon}
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={`text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
        >
          {title}
        </motion.h2>

        {/* Subtitle badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 shadow-md"
        >
          {icon}
          <span className="text-base font-medium text-muted-foreground">{subtitle}</span>
        </motion.div>

        {/* Decorative divider */}
        <SectionDivider gradient={gradient} />
      </div>

      {/* Decorative bottom line */}
      <SectionLine className="absolute bottom-0 left-0 right-0" />
    </motion.div>
  )
}
