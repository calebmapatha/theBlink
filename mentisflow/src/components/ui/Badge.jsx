const variants = {
  urgent:  'bg-red-100 dark:bg-red-500/15 text-danger dark:text-red-400',
  points:  'bg-accent-soft text-accent-soft-text',
  streak:  'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
  success: 'bg-success-100 dark:bg-success-500/15 text-success-600 dark:text-success-400',
  muted:   'bg-raised/50 text-faint',
}

export function Badge({ variant = 'muted', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5  text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
