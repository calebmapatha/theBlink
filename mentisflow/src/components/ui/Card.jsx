// Paper card: flat off-white surface on the cooler page ground, with ONE
// edge treatment — a hairline border (default) or, with `shadow`, one soft
// low shadow instead. Never both. `as` lets a card render as a button so
// interactive cards stay real, focusable controls.
export function Card({ className = '', interactive, shadow, as: Tag = 'div', children, ...props }) {
  return (
    <Tag
      className={`bg-surface transition-all duration-200 motion-reduce:transition-none
        ${shadow
          ? 'shadow-card dark:shadow-card-dark'
          : 'border border-line'}
        ${interactive ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0 motion-reduce:hover:translate-y-0' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}
