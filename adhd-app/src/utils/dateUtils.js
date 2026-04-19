import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns'

export const todayKey = () => format(new Date(), 'yyyy-MM-dd')

export const formatRelative = (isoString) =>
  formatDistanceToNow(new Date(isoString), { addSuffix: true })

export const formatTimestamp = (isoString) => {
  const date = new Date(isoString)
  return isToday(date)
    ? format(date, 'h:mm a')
    : format(date, 'MMM d, h:mm a')
}

export const formatDayHeader = () =>
  format(new Date(), 'EEEE, MMMM d')
