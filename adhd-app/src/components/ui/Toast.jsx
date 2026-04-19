import { AnimatePresence, motion } from 'framer-motion'
import { Zap } from 'lucide-react'

export function Toast({ toast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-success-500 text-white text-sm font-medium shadow-glow-success"
          >
            <Zap size={15} className="flex-shrink-0" />
            <span>+{toast.pts} XP · {toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
