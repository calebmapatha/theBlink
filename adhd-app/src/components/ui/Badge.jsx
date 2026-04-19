const variants = {
  urgent:  'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400',
  points:  'bg-primary-100 dark:bg-primary-700/20 text-primary-700 dark:text-primary-300',
  streak:  'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
  success: 'bg-success-100 dark:bg-success-500/15 text-success-600 dark:text-success-400',
  muted:   'bg-surface-100 dark:bg-surface-700/50 text-ink-400',
}

export function Badge({ variant = 'muted', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
