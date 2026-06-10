// Lightweight SVG charts — no external chart library, keeps the PWA small.

const fmtVal = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))

// Vertical bar chart: data = [{ label, value }]
export function BarChart({ data, height = 120, prefix = '', color = 'fill-primary-500' }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const bw = 100 / data.length
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 16)
          return (
            <rect key={i}
              x={i * bw + bw * 0.15} y={height - h}
              width={bw * 0.7} height={Math.max(h, d.value > 0 ? 2 : 0)}
              rx="1.5"
              className={`${color} opacity-90`} />
          )
        })}
      </svg>
      <div className="flex">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-[9px] text-ink-400 truncate">{d.label}</p>
            <p className="text-[9px] font-semibold text-ink-600 dark:text-ink-300">{d.value > 0 ? `${prefix}${fmtVal(d.value)}` : ''}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Smooth-ish line chart with area fill: data = [{ label, value }]
export function LineChart({ data, height = 110, prefix = '' }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100
  const px = (i) => data.length === 1 ? W / 2 : (i / (data.length - 1)) * W
  const py = (v) => height - 8 - (v / max) * (height - 20)
  const pts  = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ')
  const area = `0,${height} ${pts} ${W},${height}`
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <polygon points={area} className="fill-primary-500/15" />
        <polyline points={pts} fill="none" className="stroke-primary-500" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <circle key={i} cx={px(i)} cy={py(d.value)} r="1.8" className="fill-primary-500" />
        ))}
      </svg>
      <div className="flex justify-between">
        <span className="text-[9px] text-ink-400">{data[0].label}</span>
        <span className="text-[9px] font-semibold text-ink-600 dark:text-ink-300">
          peak {prefix}{fmtVal(Math.max(...data.map(d => d.value)))}
        </span>
        <span className="text-[9px] text-ink-400">{data[data.length - 1].label}</span>
      </div>
    </div>
  )
}

// Horizontal proportional bars: items = [{ label, value, sub? }]
export function HBarList({ items, color = 'bg-primary-500', valueFmt = (v) => v }) {
  if (!items?.length) return null
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] text-ink-600 dark:text-ink-300">{it.label}</span>
            <span className="text-[11px] font-semibold text-ink-700 dark:text-ink-200">
              {valueFmt(it.value)}{it.sub ? <span className="text-ink-400 font-normal ml-1">{it.sub}</span> : null}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Conversion funnel: steps = [{ label, value }]
export function Funnel({ steps }) {
  if (!steps?.length) return null
  const max = Math.max(steps[0]?.value || 0, 1)
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const pct  = Math.max((s.value / max) * 100, 6)
        const conv = i > 0 && steps[i - 1].value > 0
          ? Math.round((s.value / steps[i - 1].value) * 100)
          : null
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="h-7 rounded-lg bg-primary-500 flex items-center px-2.5 transition-all"
                style={{ width: `${pct}%`, opacity: 1 - i * 0.22 }}>
                <span className="text-[10px] font-semibold text-white whitespace-nowrap">{s.value}</span>
              </div>
            </div>
            <div className="w-28 flex-shrink-0">
              <p className="text-[10px] text-ink-600 dark:text-ink-300">{s.label}</p>
              {conv !== null && <p className="text-[9px] text-ink-400">{conv}% of previous</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Split bar for two complementary values (e.g. new vs returning)
export function SplitBar({ a, b, labelA, labelB }) {
  const total = a + b
  const pctA  = total > 0 ? Math.round((a / total) * 100) : 50
  return (
    <div>
      <div className="h-2.5 rounded-full overflow-hidden flex bg-surface-100 dark:bg-surface-700">
        {total > 0 && <div className="h-full bg-primary-500" style={{ width: `${pctA}%` }} />}
        {total > 0 && <div className="h-full bg-warm-400 flex-1" />}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-ink-600 dark:text-ink-300">
          <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1" />{labelA}: <strong>{a}</strong>{total > 0 ? ` (${pctA}%)` : ''}
        </span>
        <span className="text-[10px] text-ink-600 dark:text-ink-300">
          <span className="inline-block w-2 h-2 rounded-full bg-warm-400 mr-1" />{labelB}: <strong>{b}</strong>{total > 0 ? ` (${100 - pctA}%)` : ''}
        </span>
      </div>
    </div>
  )
}
