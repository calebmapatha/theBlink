import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

export function Checkbox({ checked, onChange, className = '' }) {
  return (
    <motion.button
      onClick={onChange}
      whileTap={{ scale: 0.85 }}
      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
        ${checked
          ? 'bg-success-500 border-success-500'
          : 'border-line hover:border-accent'
        } ${className}`}
    >
      {checked && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <Check size={14} strokeWidth={3} className="text-white" />
        </motion.span>
      )}
    </motion.button>
  )
}
