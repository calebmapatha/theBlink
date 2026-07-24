// Shared empty-state: lucide icon in a soft tile + message (+ optional hint
// and action). Replaces the ad-hoc large-emoji pattern so empty screens read
// as designed, match dark mode, and stay consistent with the icon system.
export function EmptyState({ icon: Icon, title, hint, action, className = '' }) {
  return (
    <div className={`py-10 text-center ${className}`}>
      <div className="w-12 h-12 mx-auto mb-3  bg-raised flex items-center justify-center">
        <Icon size={22} className="text-faint" />
      </div>
      <p className="text-sm text-faint">{title}</p>
      {hint && <p className="text-xs text-faint mt-1 max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
