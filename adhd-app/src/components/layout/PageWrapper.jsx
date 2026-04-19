import { motion } from 'framer-motion'

export function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto px-6 py-8">
        {children}
      </div>
    </motion.div>
  )
}
