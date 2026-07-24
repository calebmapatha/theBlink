import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, getDay, getDaysInMonth, startOfMonth } from 'date-fns'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const todayISO = () => format(new Date(), 'yyyy-MM-dd')

// Inline-expanding calendar. Expands in normal document flow (no popover), so
// it never clips inside scrollable modals and works the same on mobile.
// value/min are 'YYYY-MM-DD' strings; onChange receives the same format.
export function DatePicker({ value, onChange, min, clearable, placeholder = 'Pick a date' }) {
  const now = new Date()
  const selected = value ? new Date(value + 'T12:00:00') : null
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({
    y: (selected || now).getFullYear(),
    m: (selected || now).getMonth(),
  })

  const openTo = () => {
    const base = selected || now
    setView({ y: base.getFullYear(), m: base.getMonth() })
    setOpen(o => !o)
  }

  const shift = (delta) => setView(v => {
    const m = v.m + delta
    if (m < 0) return { y: v.y - 1, m: 11 }
    if (m > 11) return { y: v.y + 1, m: 0 }
    return { ...v, m }
  })

  const daysInMonth = getDaysInMonth(new Date(view.y, view.m))
  const startPad = (getDay(startOfMonth(new Date(view.y, view.m))) + 6) % 7 // Monday-first

  const pick = (day) => {
    onChange(toISO(view.y, view.m, day))
    setOpen(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={openTo}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5  border text-sm text-left transition-colors ${
          open
            ? 'border-accent ring-2 ring-accent/30 bg-raised'
            : 'border-line bg-raised hover:border-faint'
        }`}
      >
        <CalendarDays size={15} className="text-faint flex-shrink-0" />
        <span className={`flex-1 ${value ? 'text-ink font-medium' : 'text-faint'}`}>
          {value ? format(new Date(value + 'T12:00:00'), 'EEE, d MMMM yyyy') : placeholder}
        </span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); setOpen(false) } }}
            className="p-0.5  text-faint hover:text-danger transition-colors"
          >
            <X size={13} />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3  border border-line bg-surface">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => shift(-1)}
                  className="p-1.5  text-faint hover:text-ink hover:bg-raised transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-ink">{MONTHS[view.m]} {view.y}</p>
                <button type="button" onClick={() => shift(1)}
                  className="p-1.5  text-faint hover:text-ink hover:bg-raised transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-faint py-1">{d}</div>
                ))}
              </div>
              {/* Hairline gridlines: gap-px over the line colour, paper cells on top */}
              <div className="grid grid-cols-7 gap-px bg-line border border-line">
                {Array.from({ length: startPad }).map((_, i) => <div key={`p-${i}`} className="bg-surface" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const iso = toISO(view.y, view.m, day)
                  const disabled = min ? iso < min : false
                  const isSelected = iso === value
                  const isToday = iso === todayISO()
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(day)}
                      className={`aspect-square text-xs font-medium transition-colors motion-reduce:transition-none ${
                        isSelected
                          ? 'bg-accent text-on-accent'
                          : disabled
                          ? 'bg-surface text-faint/35 cursor-not-allowed'
                          : `bg-surface text-muted hover:bg-accent-soft ${
                              isToday ? 'ring-1 ring-inset ring-accent text-accent-soft-text' : ''
                            }`
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
