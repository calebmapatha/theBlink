import { useRef, useState, useCallback } from 'react'

function buildNoiseBuffer(ctx, type) {
  const len = ctx.sampleRate * 3
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d   = buf.getChannelData(0)
  if (type === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  } else {
    let last = 0
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = last * 3.5
    }
  }
  return buf
}

export const SOUNDS = [
  { id: 'none',  label: 'Off',         emoji: '🔇' },
  { id: 'white', label: 'White noise', emoji: '🌫️' },
  { id: 'brown', label: 'Brown noise', emoji: '🌊' },
]

export function useAmbientSound() {
  const ctxRef    = useRef(null)
  const sourceRef = useRef(null)
  const gainRef   = useRef(null)
  const [active, setActive]    = useState('none')
  const [volume, setVolumeVal] = useState(0.25)

  const stop = useCallback(() => {
    try { sourceRef.current?.stop() } catch {}
    sourceRef.current = null
    setActive('none')
  }, [])

  const play = useCallback((type) => {
    if (type === 'none') { stop(); return }
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()
    try { sourceRef.current?.stop() } catch {}
    const source = ctx.createBufferSource()
    source.buffer = buildNoiseBuffer(ctx, type)
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = volume
    gainRef.current = gain
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    sourceRef.current = source
    setActive(type)
  }, [stop, volume])

  const setVolume = useCallback((v) => {
    setVolumeVal(v)
    if (gainRef.current) gainRef.current.gain.value = v
  }, [])

  return { active, play, stop, volume, setVolume }
}
