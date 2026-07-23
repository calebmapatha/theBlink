import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// A number that counts up into place — 0 → value on mount, then from the
// current figure to the next whenever the value changes, so it only ever
// sweeps toward the live number (never resets back to zero on updates).
// Renders with tabular figures so digits don't jitter sideways mid-count.
//
// Respects prefers-reduced-motion: the final value renders immediately.
//
//   <CountUp value={1240} />                          → "1,240"
//   <CountUp value={82} format={n => `${Math.round(n)}%`} />
export function CountUp({ value, duration = 0.9, format = n => Math.round(n).toLocaleString(), className = '' }) {
  const reduceMotion = useReducedMotion()
  const current = useRef(0) // where the sweep is right now
  const [text, setText] = useState(() => format(0))

  useEffect(() => {
    if (reduceMotion || !Number.isFinite(value)) return
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // strong ease-out: quick rise, gentle landing
      onUpdate: v => { current.current = v; setText(format(v)) },
    })
    return () => controls.stop()
  }, [value, reduceMotion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Non-numeric values (e.g. "N/A") and reduced-motion users skip the sweep.
  if (!Number.isFinite(value)) return <span className={className}>{value}</span>
  if (reduceMotion) return <span className={`tabular-nums ${className}`}>{format(value)}</span>
  return <span className={`tabular-nums ${className}`}>{text}</span>
}
