// Buttons are solid accent-colour rectangles — sharp corners, no pills,
// no glow. `pill` remains a valid size for legacy callers but renders as
// the standard square-cornered rectangle.
const variants = {
 primary: 'bg-accent hover:bg-accent-strong active:bg-accent-strong text-on-accent',
 ghost: 'bg-transparent hover:bg-raised text-ink',
 danger: 'bg-transparent hover:bg-danger/10 text-danger hover:text-danger',
 success: 'bg-success-600 hover:bg-success-700 active:bg-success-700 text-white',
 soft: 'bg-accent-soft hover:bg-accent-soft/80 text-accent-soft-text',
 outline: 'bg-transparent border border-ink/70 dark:border-ink/30 text-ink hover:bg-raised',
}

const sizes = {
 sm: 'px-3 py-1.5 text-sm',
 md: 'px-4 py-2.5 text-sm',
 lg: 'px-6 py-3 text-base',
 icon: 'p-2.5',
 pill: 'px-5 py-2.5 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
 return (
    <button
 className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
 motion-reduce:transition-none motion-reduce:active:scale-100
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
