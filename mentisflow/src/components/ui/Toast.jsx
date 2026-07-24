import { AnimatePresence, motion } from 'framer-motion'
import { Zap, Check, AlertCircle, Info } from 'lucide-react'

const VARIANTS = {
  reward:  { cls: 'bg-success-500 text-white shadow-glow-success',                 icon: Zap },
  success: { cls: 'bg-success-500 text-white shadow-glow-success',                 icon: Check },
  error:   { cls: 'bg-red-500 text-white shadow-lg shadow-red-500/30',             icon: AlertCircle },
  info:    { cls: 'bg-ink-900 dark:bg-surface-700 text-white shadow-lg',           icon: Info },
}

export function Toast({ toast, onDismiss }) {
  const v = VARIANTS[toast?.variant] || VARIANTS.success
  const Icon = v.icon
  return (
    // Sits above the mobile bottom nav (bottom-20) so an action stays tappable.
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 left-4 md:left-auto z-50 pointer-events-none flex justify-center md:justify-end">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto flex items-center gap-2.5 pl-4 pr-2 py-3  text-sm font-medium ${v.cls}`}
          >
            <Icon size={15} className="flex-shrink-0" />
            <span>{toast.pts != null ? `+${toast.pts} XP · ${toast.message}` : toast.message}</span>
            {toast.action && (
              <button
                onClick={() => { toast.action.onClick(); onDismiss?.() }}
                className="ml-1 px-2.5 py-1  bg-white/20 hover:bg-white/30 active:scale-95 text-xs font-semibold transition-all"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
