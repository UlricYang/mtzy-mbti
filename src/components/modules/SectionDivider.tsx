import { motion } from 'framer-motion'

interface SectionDividerProps {
  gradient?: string
  showDot?: boolean
  animated?: boolean
}

export function SectionDivider({ 
  gradient = 'from-indigo-500 to-purple-500',
  showDot = true,
  animated = true
}: SectionDividerProps) {
  return (
    <motion.div
      initial={animated ? { scaleX: 0 } : false}
      animate={animated ? { scaleX: 1 } : false}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="flex items-center justify-center gap-4 py-4"
    >
      {/* Left line */}
      <div className={`w-24 h-1 bg-gradient-to-r ${gradient} rounded-full`} />
      
      {/* Center dot */}
      {showDot && (
        <motion.div
          animate={animated ? { rotate: 360 } : false}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`}
        />
      )}
      
      {/* Right line */}
      <div className={`w-24 h-1 bg-gradient-to-l ${gradient} rounded-full`} />
    </motion.div>
  )
}

export function SectionLine({ className = '' }: { className?: string }) {
  return (
    <div className={`h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent ${className}`} />
  )
}
