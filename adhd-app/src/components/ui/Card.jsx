export function Card({ className = '', glow, children, ...props }) {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-surface-800 border border-surface-200
        dark:border-surface-700 shadow-card dark:shadow-card-dark
        ${glow ? 'shadow-glow-primary' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
