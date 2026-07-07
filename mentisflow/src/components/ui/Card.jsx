export function Card({ className = '', glow, interactive, children, ...props }) {
  return (
    <div
      className={`rounded-3xl bg-white dark:bg-surface-800 border border-surface-100
        dark:border-surface-700/60 shadow-card dark:shadow-card-dark transition-all duration-200
        ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-card' : ''}
        ${glow ? 'shadow-glow-primary' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
