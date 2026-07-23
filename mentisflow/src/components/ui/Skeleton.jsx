// Shimmer placeholders for content loads. Compose the primitives to echo
// the layout that's coming, so the page doesn't reflow when data lands.
// The sweep itself lives in index.css (.skeleton) and goes still under
// prefers-reduced-motion.

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />
}

// A stack of text bars, the last one shorter — reads as a paragraph.
export function SkeletonLines({ lines = 3, className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 rounded-md ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

// A card-shaped placeholder: optional avatar circle, a heading bar, lines.
export function SkeletonCard({ avatar = false, lines = 2, className = '' }) {
  return (
    <div aria-hidden="true" className={`rounded-3xl border border-line/60 bg-surface p-5 ${className}`}>
      <div className="flex items-start gap-3">
        {avatar && <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-1/3 rounded-md mb-3" />
          <SkeletonLines lines={lines} />
        </div>
      </div>
    </div>
  )
}

// A KPI-tile placeholder: quiet label bar over an oversized figure bar.
export function SkeletonStat({ className = '' }) {
  return (
    <div aria-hidden="true" className={`rounded-3xl border border-line/60 bg-surface p-5 ${className}`}>
      <Skeleton className="h-3 w-1/2 rounded-md" />
      <Skeleton className="h-8 w-2/3 rounded-lg mt-4" />
    </div>
  )
}
