import { motion } from 'framer-motion'

export function PageWrapper({ children, wide = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full overflow-y-auto"
    >
      <div className={`${wide ? 'max-w-6xl' : 'max-w-2xl'} mx-auto px-5 sm:px-6 lg:px-8 py-8`}>
        {children}
      </div>
    </motion.div>
  )
}
