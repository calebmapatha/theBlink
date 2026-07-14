// `flat` swaps the soft shadow for a hairline border — the editorial card
// treatment used on the provider surfaces. `as` lets a card render as a
// button so interactive cards stay real, focusable controls.
export function Card({ className = '', glow, interactive, flat, as: Tag = 'div', children, ...props }) {
  return (
    <Tag
      className={`rounded-3xl bg-white dark:bg-surface-800 border transition-all duration-200
        ${flat
          ? 'border-surface-200 dark:border-surface-700/60'
          : 'border-surface-100 dark:border-surface-700/60 shadow-card dark:shadow-card-dark'}
        ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0' : ''}
        ${glow ? 'shadow-glow-primary' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
