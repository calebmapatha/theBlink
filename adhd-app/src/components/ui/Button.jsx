const variants = {
  primary: 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white shadow-sm hover:shadow-glow-primary',
  ghost:   'bg-transparent hover:bg-surface-100 dark:hover:bg-surface-800 text-ink-700 dark:text-ink-100',
  danger:  'bg-transparent hover:bg-red-500/10 text-red-400 hover:text-red-500',
  success: 'bg-success-500 hover:bg-success-600 active:bg-success-600 text-white shadow-sm hover:shadow-glow-success',
  soft:    'bg-primary-100 dark:bg-primary-700/20 hover:bg-primary-200 dark:hover:bg-primary-700/30 text-primary-700 dark:text-primary-300',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  icon: 'p-2.5 rounded-xl',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
