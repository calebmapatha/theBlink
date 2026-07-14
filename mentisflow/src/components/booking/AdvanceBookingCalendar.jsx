import { useMemo, useState } from 'react'
import { availableSlotsForDate } from '../../utils/availability'

/**
 * AdvanceBookingCalendar
 *
 * Replaces the date-picker plus slot-chip pair on the booking side.
 * Patients see a proper month calendar and can page forward through
 * the next six months (horizonMonths). Selecting a day shows the open
 * slots for that date, derived from:
 *
 *   1. the practitioner's weekly diary (the diary stays the source of
 *      truth for usual hours — this simply projects it forward),
 *   2. confirmed bookings, which are removed automatically, and
 *   3. the clock: past slots never show.
 *
 * Slot maths is availableSlotsForDate — the exact rule the provider's
 * own diary uses, so the two sides can never disagree.
 */

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function AdvanceBookingCalendar({
  diary,
  bookedSlots,
  horizonMonths = 6,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}) {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [monthOffset, setMonthOffset] = useState(0) // 0 = this month

  const viewYear = today.getFullYear()
  const viewMonthIndex = today.getMonth() + monthOffset
  const viewMonth = new Date(viewYear, viewMonthIndex, 1)
  // End of the final month in the horizon.
  const lastBookable = new Date(today.getFullYear(), today.getMonth() + horizonMonths + 1, 0)

  const canGoBack = monthOffset > 0
  const canGoForward = monthOffset < horizonMonths

  /* Build the visible grid: Monday-first weeks covering the month. */
  const gridDays = useMemo(() => {
    const first = new Date(viewMonth)
    const lead = (first.getDay() + 6) % 7 // days before the 1st, Monday-first
    const start = new Date(first)
    start.setDate(first.getDate() - lead)
    const days = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [viewYear, viewMonthIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSlots = selectedDate
    ? availableSlotsForDate(diary, bookedSlots, selectedDate)
    : []

  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-ZA', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : ''

  return (
    <div className="w-full">
      {/* Month header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoBack && setMonthOffset(o => o - 1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="rounded-full px-2.5 py-1 text-muted hover:bg-raised disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-ink">
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </p>
        <button
          type="button"
          onClick={() => canGoForward && setMonthOffset(o => o + 1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="rounded-full px-2.5 py-1 text-muted hover:bg-raised disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center text-xs text-faint">
        {DAY_LABELS.map(d => (
          <span key={d} className="pb-1.5">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {gridDays.map(d => {
          const key = toDateKey(d)
          const inMonth = d.getMonth() === viewMonth.getMonth()
          const past = d < today
          const beyond = d > lastBookable
          const hasSlots =
            !past && !beyond &&
            availableSlotsForDate(diary, bookedSlots, key).length > 0
          const disabled = past || beyond || !hasSlots
          const isSelected = key === selectedDate

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(key)}
              aria-pressed={isSelected}
              className={`relative aspect-square rounded-xl text-sm transition-colors motion-reduce:transition-none ${
                isSelected
                  ? 'bg-accent font-medium text-white'
                  : disabled
                  ? 'text-faint'
                  : 'text-ink hover:bg-accent-soft'
              } ${inMonth ? '' : 'opacity-40'}`}
            >
              {d.getDate()}
              {hasSlots && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </button>
          )
        })}
      </div>

      {/* Slot picker for the selected day */}
      {selectedDate && (
        <div className="mt-4 border-t border-line pt-3.5">
          <p className="mb-2.5 text-sm font-medium text-ink">
            Open times on {selectedLabel}
          </p>
          {selectedSlots.length === 0 ? (
            <p className="text-sm text-faint">
              No open times on this day. Choose another date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedSlots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  aria-pressed={selectedSlot === slot}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    selectedSlot === slot
                      ? 'border-accent bg-accent-soft font-medium text-accent-soft-text'
                      : 'border-line bg-raised text-ink hover:border-accent/40'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-3.5 text-xs text-faint">
        Bookings can be made up to {horizonMonths} months ahead.
      </p>
    </div>
  )
}
