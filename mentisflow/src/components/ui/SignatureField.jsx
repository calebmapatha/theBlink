import { useEffect, useRef } from 'react'
import SignaturePad from 'signature_pad'
import { Eraser } from 'lucide-react'

// Draw-to-sign canvas built on the signature_pad library.
// Calls onChange with a PNG data URL after each stroke, or null when cleared.
// White background regardless of theme so the exported image stays legible.
export function SignatureField({ onChange, className = '' }) {
  const canvasRef = useRef(null)
  const padRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const pad = new SignaturePad(canvas, {
      penColor: '#1e293b',
      backgroundColor: 'rgb(255,255,255)',
    })
    padRef.current = pad

    const resize = () => {
      // Scale for device pixel ratio so strokes aren't blurry; resizing
      // clears the canvas, so restore any existing strokes afterwards.
      const data = pad.toData()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width  = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d').scale(ratio, ratio)
      pad.clear()
      if (data.length) pad.fromData(data)
    }
    resize()

    const emit = () => onChange?.(pad.isEmpty() ? null : pad.toDataURL('image/png'))
    pad.addEventListener('endStroke', emit)
    window.addEventListener('resize', resize)
    return () => {
      pad.removeEventListener('endStroke', emit)
      window.removeEventListener('resize', resize)
      pad.off()
    }
  }, [])

  const clear = () => {
    padRef.current?.clear()
    onChange?.(null)
  }

  return (
    <div className={className}>
      <div className="relative  border-2 border-dashed border-line overflow-hidden bg-white">
        <canvas ref={canvasRef} className="w-full h-32 touch-none block" />
        <span className="absolute bottom-1.5 left-3 text-[10px] text-faint pointer-events-none select-none">
          Draw your signature here
        </span>
        <button type="button" onClick={clear}
          className="absolute top-1.5 right-1.5 p-1.5  bg-raised text-muted hover:text-danger hover:bg-red-50 transition-colors"
          title="Clear signature">
          <Eraser size={13} />
        </button>
      </div>
    </div>
  )
}
