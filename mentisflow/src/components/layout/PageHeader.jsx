export function PageHeader({ icon: Icon, eyebrow, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-widest mb-1">
            {Icon && <Icon size={12} />}
            {eyebrow}
          </div>
        )}
        <h1 className="text-[1.7rem] font-bold tracking-tight text-ink-900 dark:text-ink-100 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </div>
  )
}
