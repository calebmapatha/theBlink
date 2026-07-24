/**
 * IllustratedAvatar — the default profile picture when no photo is set.
 *
 * A flat vector bust in the app's editorial style: soft tinted circle,
 * simple geometric shapes, no gradients. Deterministic from `seed` (uid or
 * name), so every user keeps the same face everywhere, and varied across
 * skin tones and hair styles so the defaults reflect real diversity.
 * Providers wear the white coat, scrubs and a stethoscope; patients get a
 * plain top in one of the app's category colours.
 *
 * Original artwork drawn as inline SVG — nothing licensed, nothing fetched.
 */

const SKINS = ['#5C3A21', '#7A4A2B', '#96613A', '#B07B4F', '#C99368', '#E3B58B']
const HAIR_COLORS = ['#241E19', '#3B2E22', '#6E6259']
const BGS   = ['#D1FAE5', '#FEF3C7', '#EDE9FE', '#F1F3FB']
const TOPS  = ['#0F766E', '#B45309', '#6D5BD0', '#4B5266']
const INK   = '#292524'

function hash(str) {
  let h = 0
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function IllustratedAvatar({ seed = '', role = 'patient', className = '' }) {
  const h = hash(seed || 'mentisflow')
  const skin  = SKINS[h % SKINS.length]
  const hair  = HAIR_COLORS[(h >> 3) % HAIR_COLORS.length]
  const bg    = BGS[(h >> 5) % BGS.length]
  const top   = TOPS[(h >> 7) % TOPS.length]
  const style = (h >> 9) % 5          // 0 afro · 1 crop · 2 bun · 3 bob · 4 fade
  const glasses = ((h >> 11) % 3) === 0
  const provider = role === 'provider'

  // Crescent cap shared by the crop / bun / fade styles.
  const cap = (lift = 0) => (
    <path d={`M20.4 ${24 - lift} Q20.4 ${12.6 + lift} 32 ${12.6 + lift} Q43.6 ${12.6 + lift} 43.6 ${24 - lift}
              Q43.6 ${20.6 - lift * 0.5} 39.5 ${18.6 + lift * 0.4} Q35.5 ${16.8 + lift * 0.6} 32 ${16.8 + lift * 0.6}
              Q28.5 ${16.8 + lift * 0.6} 24.5 ${18.6 + lift * 0.4} Q20.4 ${20.6 - lift * 0.5} 20.4 ${24 - lift} Z`}
      fill={hair} />
  )

  return (
    <svg viewBox="0 0 64 64" className={`h-full w-full ${className}`} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={bg} />

      {/* hair drawn behind the head: afro halo or bob mass */}
      {style === 0 && <circle cx="32" cy="21" r="15.5" fill={hair} />}
      {style === 3 && (
        <path d="M18.5 35 Q17 12.5 32 12.5 Q47 12.5 45.5 35 Q45.5 39 41.5 39 L22.5 39 Q18.5 39 18.5 35 Z" fill={hair} />
      )}

      {/* neck + shoulders */}
      <rect x="27.5" y="33" width="9" height="11" rx="3.5" fill={skin} />
      <path d="M11 64 C 11 50 21.5 45.5 32 45.5 C 42.5 45.5 53 50 53 64 Z"
        fill={provider ? '#FBFCFF' : top} />

      {provider && (
        <>
          {/* scrubs in the coat opening, then the stethoscope */}
          <path d="M26.5 46 L32 54.5 L37.5 46 L37.5 64 L26.5 64 Z" fill="#8FD8CA" />
          <path d="M26.5 46 L32 54.5 L30 64 L24 64 Q24.5 50 26.5 46 Z" fill="#FBFCFF" />
          <path d="M37.5 46 L32 54.5 L34 64 L40 64 Q39.5 50 37.5 46 Z" fill="#FBFCFF" />
          <path d="M28 46.5 Q27.5 56 32.5 57.5" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
          <path d="M36 46.5 Q36.3 50.5 34.8 52.3" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
          <circle cx="33" cy="58.2" r="2.4" fill={INK} />
        </>
      )}

      {/* ears + head */}
      <circle cx="21.6" cy="26.5" r="2.3" fill={skin} />
      <circle cx="42.4" cy="26.5" r="2.3" fill={skin} />
      <ellipse cx="32" cy="25" rx="11" ry="12" fill={skin} />

      {/* hair in front of the face */}
      {style === 1 && cap(0)}
      {style === 2 && <>{cap(0)}<circle cx="32" cy="9.5" r="4.6" fill={hair} /></>}
      {style === 3 && cap(0.6)}
      {style === 4 && cap(1.6)}

      {/* face: eyes, brows, smile */}
      <circle cx="27.6" cy="25.8" r="1.35" fill={INK} />
      <circle cx="36.4" cy="25.8" r="1.35" fill={INK} />
      <path d="M25.6 22.6 Q27.6 21.4 29.6 22.4" stroke={INK} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M34.4 22.4 Q36.4 21.4 38.4 22.6" stroke={INK} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M29 30.6 Q32 32.8 35 30.6" stroke={INK} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.85" />

      {glasses && (
        <g stroke={INK} strokeWidth="1.1" fill="none" opacity="0.9">
          <circle cx="27.6" cy="25.8" r="3.4" />
          <circle cx="36.4" cy="25.8" r="3.4" />
          <path d="M31 25.4 Q32 24.8 33 25.4" />
        </g>
      )}
    </svg>
  )
}
