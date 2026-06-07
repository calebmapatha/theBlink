import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { format, startOfMonth, getDay, getDaysInMonth, isFuture, isToday } from 'date-fns'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getRatio(completed, total) {
  if (total === 0) return 0
  return completed.length / total
}

function DayCell({ day, completed, total, isCurrentMonth }) {
  if (!isCurrentMonth) return <div />

  const date = new Date(day.date)
  const future = isFuture(date) && !isToday(date)
  const ratio = getRatio(completed, total)

  const bg = future
    ? 'bg-surface-100 dark:bg-surface-800/40'
    : ratio === 0
    ? 'bg-surface-100 dark:bg-surface-800'
    : ratio < 0.5
    ? 'bg-warm-100 dark:bg-warm-500/20'
    : ratio < 1
    ? 'bg-primary-100 dark:bg-primary-700/30'
    : 'bg-success-100 dark:bg-success-500/20'

  const textColor = future ? 'text-ink-400/40' : 'text-ink-900 dark:text-ink-100'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center ${bg} ${isToday(date) ? 'ring-2 ring-primary-400' : ''}`}
    >
      <span className={`text-xs font-semibold ${textColor}`}>{format(date, 'd')}</span>
      {!future && total > 0 && (
        <span className="text-[9px] text-ink-400 mt-0.5">{completed.length}/{total}</span>
      )}
    </motion.div>
  )
}

export function MonthlyTracker() {
  const { habits } = useApp()
  const today = new Date()
  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const monthData   = habits.getMonthlyData(viewYear, viewMonth)
  const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth))

  // Pad start: what weekday (Mon=0) does the 1st fall on?
  const firstDay = startOfMonth(new Date(viewYear, viewMonth))
  const startPad = (getDay(firstDay) + 6) % 7 // Mon=0

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Per-habit monthly stats
  const habitStats = habits.habits.map(h => {
    const completed = monthData.filter(d => d.completed.includes(h.id)).length
    const applicable = monthData.filter(d => !isFuture(d.date) || isToday(d.date)).length
    return { ...h, completed, applicable, rate: applicable > 0 ? Math.round((completed / applicable) * 100) : 0 }
  })

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Monthly Tracker</h1>
        <p className="text-sm text-ink-400 mt-0.5">Habit performance over time</p>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={goBack} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-ink-700 dark:text-ink-300 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button onClick={goForward} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 text-ink-700 dark:text-ink-300 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {[
          { color: 'bg-success-100 dark:bg-success-500/20', label: 'All done' },
          { color: 'bg-primary-100 dark:bg-primary-700/30', label: '50%+' },
          { color: 'bg-warm-100 dark:bg-warm-500/20', label: 'Some' },
          { color: 'bg-surface-100 dark:bg-surface-800', label: 'None' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-xs text-ink-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-ink-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {monthData.map((day, i) => (
            <DayCell key={i} day={day} completed={day.completed} total={day.total} isCurrentMonth />
          ))}
        </div>
      </Card>

      {/* Per-habit stats */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Habit breakdown</p>
        {habits.habits.length === 0 ? (
          <p className="text-sm text-ink-400 text-center py-6">No habits to track yet.</p>
        ) : (
          <div className="space-y-3">
            {habitStats.map(h => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{h.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{h.name}</p>
                    <p className="text-xs text-ink-400">
                      {h.frequency === 'weekly' ? `${h.weeklyTarget}× per week` : 'Daily'} · {h.completed}/{h.applicable} days
                    </p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${
                    h.rate >= 80 ? 'text-success-500' : h.rate >= 50 ? 'text-primary-500' : h.rate >= 20 ? 'text-warm-500' : 'text-ink-400'
                  }`}>{h.rate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      h.rate >= 80 ? 'bg-success-500' : h.rate >= 50 ? 'bg-primary-500' : h.rate >= 20 ? 'bg-warm-400' : 'bg-surface-300'
                    }`}
                    animate={{ width: `${h.rate}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
