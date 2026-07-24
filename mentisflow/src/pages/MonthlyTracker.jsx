import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { format, startOfMonth, getDay, getDaysInMonth, isFuture, isToday } from 'date-fns'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
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
    ? 'bg-surface'
    : ratio === 0
    ? 'bg-raised'
    : ratio < 0.5
    ? 'bg-tint-peach'
    : ratio < 1
    ? 'bg-accent-soft'
    : 'bg-tint-mint'

  const textColor = future ? 'text-faint/40' : 'text-muted'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative aspect-square flex flex-col items-center justify-center ${bg} ${isToday(date) ? 'ring-1 ring-inset ring-accent' : ''}`}
    >
      <span className={`text-xs font-semibold ${textColor}`}>{format(date, 'd')}</span>
      {!future && total > 0 && (
        <span className="text-[9px] text-faint mt-0.5">{completed.length}/{total}</span>
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

  const firstDay = startOfMonth(new Date(viewYear, viewMonth))
  const startPad = (getDay(firstDay) + 6) % 7

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const habitStats = habits.habits.map(h => {
    const completed = monthData.filter(d => d.completed.includes(h.id)).length
    const applicable = monthData.filter(d => !isFuture(d.date) || isToday(d.date)).length
    return { ...h, completed, applicable, rate: applicable > 0 ? Math.round((completed / applicable) * 100) : 0 }
  })

  return (
    <PageWrapper>
      <PageHeader title="Monthly Tracker" subtitle="Habit performance over time" />

      <div className="flex items-center justify-between mb-4">
        <button onClick={goBack} className="p-2  hover:bg-raised text-ink transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-ink">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button onClick={goForward} className="p-2  hover:bg-raised text-ink transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {[
          { color: 'bg-tint-mint', label: 'All done' },
          { color: 'bg-accent-soft', label: '50%+' },
          { color: 'bg-tint-peach', label: 'Some' },
          { color: 'bg-raised', label: 'None' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3  ${color}`} />
            <span className="text-xs text-faint">{label}</span>
          </div>
        ))}
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-faint py-1">{d}</div>
          ))}
        </div>
        {/* Hairline gridlines: gap-px over the line colour, paper cells on top */}
        <div className="grid grid-cols-7 gap-px bg-line border border-line">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} className="bg-surface" />)}
          {monthData.map((day, i) => (
            <DayCell key={i} day={day} completed={day.completed} total={day.total} isCurrentMonth />
          ))}
        </div>
      </Card>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-3">Habit breakdown</p>
        {habits.habits.length === 0 ? (
          <p className="text-sm text-faint text-center py-6">No habits to track yet.</p>
        ) : (
          <div className="space-y-3">
            {habitStats.map(h => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{h.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{h.name}</p>
                    <p className="text-xs text-faint">
                      {h.frequency === 'weekly' ? `${h.weeklyTarget}× per week` : 'Daily'} · {h.completed}/{h.applicable} days
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: h.color }}>{h.rate}%</span>
                </div>
                <div className="h-1.5  bg-raised overflow-hidden">
                  <motion.div
                    className="h-full "
                    style={{ backgroundColor: h.color }}
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
