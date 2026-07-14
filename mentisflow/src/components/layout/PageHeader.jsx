export function PageHeader({ icon: Icon, eyebrow, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-1.5 text-accent-soft-text text-xs font-bold uppercase tracking-widest mb-1">
            {Icon && <Icon size={12} />}
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif font-normal text-[2rem] sm:text-[2.4rem] tracking-[-0.02em] text-ink leading-[1.1] text-balance">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </div>
  )
}
