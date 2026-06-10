// Open-by-default availability model.
//
// A provider's `diary` map is an *override* on top of sensible defaults:
//   - day key absent        → default working hours apply (open by default)
//   - day key = []          → the day is closed
//   - day key = ['09:00',…] → only those custom slots are open
//
// Confirmed bookings are tracked in a `bookedSlots` map on the provider doc
// ({ 'YYYY-MM-DD': ['HH:MM', …] }), written by the provider's client when an
// appointment is confirmed. It is public but contains no patient information.

export const DEFAULT_HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const WEEKEND = ['sat', 'sun']

// Raw open slots for a weekday, before subtracting bookings.
export function slotsForDay(diary, dayKey) {
  const custom = diary?.[dayKey]
  if (Array.isArray(custom)) return [...custom].sort()
  return WEEKEND.includes(dayKey) ? [] : DEFAULT_HOURS
}

// The UI mode a day is in, for the diary manager.
export function dayMode(diary, dayKey) {
  const custom = diary?.[dayKey]
  if (!Array.isArray(custom)) return 'default'
  return custom.length === 0 ? 'closed' : 'custom'
}

// Available slots for a specific date: open slots minus confirmed bookings,
// minus times already past when the date is today.
export function availableSlotsForDate(diary, bookedSlots, dateStr) {
  if (!dateStr) return []
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dayKey = DAY_KEYS[new Date(y, mo - 1, d).getDay()]
  const booked = bookedSlots?.[dateStr] || []
  let slots = slotsForDay(diary, dayKey).filter(t => !booked.includes(t))

  const now = new Date()
  const isToday = now.getFullYear() === y && now.getMonth() === mo - 1 && now.getDate() === d
  if (isToday) {
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    slots = slots.filter(t => t > cur)
  }
  return slots
}

// Add a confirmed booking to the map, pruning past dates so it stays small.
export function addBookedSlot(bookedSlots, dateStr, time) {
  const today = new Date().toISOString().split('T')[0]
  const next = {}
  for (const [d, times] of Object.entries(bookedSlots || {})) {
    if (d >= today) next[d] = times
  }
  next[dateStr] = [...new Set([...(next[dateStr] || []), time])].sort()
  return next
}
