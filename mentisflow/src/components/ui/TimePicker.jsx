import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')
const MINUTES = ['00', '15', '30', '45']

// Inline-expanding time picker matching DatePicker: an hour grid plus
// quarter-hour minute chips. value/onChange use the 'HH:MM' format already
// stored for reminders and diary slots. Picking an hour keeps the panel open
// so the minutes can be adjusted; picking a minute closes it.
export function TimePicker({ value, onChange, placeholder = 'Pick a time' }) {
  const [open, setOpen] = useState(false)
  const [hour, minute] = (value || '').split(':')

  const pickHour = (hh) => onChange(`${pad(hh)}:${minute || '00'}`)
  const pickMinute = (mm) => {
    onChange(`${hour || '08'}:${mm}`)
    setOpen(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
          open
            ? 'border-accent ring-2 ring-accent/30 bg-raised'
            : 'border-line bg-raised hover:border-faint'
        }`}
      >
        <Clock size={15} className="text-faint flex-shrink-0" />
        <span className={`flex-1 ${value ? 'text-ink font-medium timer-nums' : 'text-faint'}`}>
          {value || placeholder}
        </span>
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
            <div className="mt-2 p-3 rounded-2xl border border-line bg-surface space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mb-1.5">Hour</p>
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 24 }).map((_, hh) => (
                    <button
                      key={hh}
                      type="button"
                      onClick={() => pickHour(hh)}
                      className={`py-1.5 rounded-lg text-xs font-medium timer-nums transition-colors ${
                        hour === pad(hh)
                          ? 'bg-accent text-on-accent shadow-sm'
                          : 'text-ink hover:bg-accent-soft'
                      }`}
                    >
                      {pad(hh)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-faint mb-1.5">Minutes</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {MINUTES.map(mm => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => pickMinute(mm)}
                      className={`py-1.5 rounded-lg text-xs font-medium timer-nums transition-colors ${
                        minute === mm
                          ? 'bg-accent text-on-accent shadow-sm'
                          : 'bg-raised text-ink hover:bg-accent-soft'
                      }`}
                    >
                      :{mm}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
