export function Card({ className = '', glow, children, ...props }) {
  return (
    <div
      className={`rounded-3xl bg-white dark:bg-surface-800 border border-surface-100
        dark:border-surface-700/60 shadow-card dark:shadow-card-dark
        ${glow ? 'shadow-glow-primary' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
