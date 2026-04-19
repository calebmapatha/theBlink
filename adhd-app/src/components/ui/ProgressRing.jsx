const RADIUS = 90
const STROKE = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ProgressRing({ progress, mode, size = 220 }) {
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))
  const strokeColor = mode === 'work' ? '#6366f1' : '#22c55e'
  const center = size / 2
  const scale = size / (RADIUS * 2 + STROKE * 2)
  const viewBoxSize = RADIUS * 2 + STROKE * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        className="text-surface-200 dark:text-surface-700"
      />
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={RADIUS}
        fill="none"
        stroke={strokeColor}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
      />
    </svg>
  )
}
