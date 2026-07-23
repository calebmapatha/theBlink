// `flat` swaps the soft shadow for a hairline border — the editorial card
// treatment used on the provider surfaces. `as` lets a card render as a
// button so interactive cards stay real, focusable controls.
//
// Shadowed cards use the layered `shadow-card` pair (crisp contact + wide
// ambient) with a slightly translucent border, so they read as glossy panes
// floating just above the page; interactive ones lift and deepen on hover.
export function Card({ className = '', glow, interactive, flat, as: Tag = 'div', children, ...props }) {
  return (
    <Tag
      className={`rounded-3xl bg-surface border transition-all duration-300 ease-out
        ${flat
          ? 'border-line/60'
          : 'border-line/80 shadow-card dark:shadow-card-dark'}
        ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0' : ''}
        ${glow ? 'shadow-glow-primary' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
