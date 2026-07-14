import { CalendarPlus, Download } from 'lucide-react'
import { buildEvent, googleCalendarUrl, outlookCalendarUrl, downloadICS } from '../../utils/calendar'

// Compact "add to calendar" actions for a confirmed appointment.
// role: 'patient' | 'provider' — controls whose name appears in the event.
export function AddToCalendar({ appt, role = 'patient', className = '' }) {
  const ev = buildEvent(appt, role)
  const btn = 'flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border border-line text-muted hover:text-accent hover:border-accent/40 transition-colors'
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className="text-[10px] text-faint flex items-center gap-1">
        <CalendarPlus size={11} /> Add to calendar:
      </span>
      <a className={btn} href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">Google</a>
      <a className={btn} href={outlookCalendarUrl(ev)} target="_blank" rel="noopener noreferrer">Outlook</a>
      <button className={btn} onClick={() => downloadICS(ev)}>
        <Download size={10} /> .ics
      </button>
    </div>
  )
}
