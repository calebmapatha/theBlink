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
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
          open
            ? 'border-primary-400 ring-2 ring-primary-400/30 bg-surface-50 dark:bg-surface-900'
            : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
        }`}
      >
        <CalendarDays size={15} className="text-ink-400 flex-shrink-0" />
        <span className={`flex-1 ${value ? 'text-ink-900 dark:text-ink-100 font-medium' : 'text-ink-400'}`}>
          {value ? format(new Date(value + 'T12:00:00'), 'EEE, d MMMM yyyy') : placeholder}
        </span>
        {clearable && value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); setOpen(false) } }}
            className="p-0.5 rounded text-ink-400 hover:text-red-500 transition-colors"
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
            <div className="mt-2 p-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => shift(-1)}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{MONTHS[view.m]} {view.y}</p>
                <button type="button" onClick={() => shift(1)}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-ink-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startPad }).map((_, i) => <div key={`p-${i}`} />)}
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
                      className={`aspect-square rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-sm'
                          : disabled
                          ? 'text-ink-400/35 cursor-not-allowed'
                          : `text-ink-700 dark:text-ink-200 hover:bg-primary-50 dark:hover:bg-primary-700/20 ${
                              isToday ? 'ring-1 ring-primary-400 text-primary-600 dark:text-primary-400' : ''
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
