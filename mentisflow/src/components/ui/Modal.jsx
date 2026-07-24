import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 w-full sm:max-w-md bg-surface
                        sm: shadow-2xl border border-line flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h3 className="text-base font-semibold text-ink">{title}</h3>
              <button onClick={onClose} aria-label="Close" className="focus-ring p-1.5  hover:bg-raised text-faint transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto overscroll-contain px-5 pb-5" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
