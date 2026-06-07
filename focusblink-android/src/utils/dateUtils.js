import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns'

export const todayKey       = () => format(new Date(), 'yyyy-MM-dd')
export const formatRelative  = (iso) => formatDistanceToNow(new Date(iso), { addSuffix: true })
export const formatTimestamp = (iso) => {
  const date = new Date(iso)
  return isToday(date) ? format(date, 'h:mm a') : format(date, 'MMM d, h:mm a')
}
export const formatDayHeader = () => format(new Date(), 'EEEE, MMMM d')
