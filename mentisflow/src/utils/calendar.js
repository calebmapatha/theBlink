// Calendar invite helpers — no OAuth required.
// Generates Google Calendar / Outlook deep links and downloadable .ics files
// for a confirmed appointment. Times are emitted as floating local time so
// each participant's calendar shows the slot in their own timezone (both
// parties are expected to be in SAST).

const SESSION_MINUTES = 60

function parseStart(appt) {
  const [y, mo, d] = appt.date.split('-').map(Number)
  const [h, mi]    = appt.timeSlot.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

const pad = (n) => String(n).padStart(2, '0')

// 'YYYYMMDDTHHMMSS' floating local time (no Z suffix)
function compact(dt) {
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
}

// 'YYYY-MM-DDTHH:MM:SS' for Outlook deep links
function isoLocal(dt) {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`
}

export function buildEvent(appt, role = 'patient') {
  const start = parseStart(appt)
  const end   = new Date(start.getTime() + SESSION_MINUTES * 60 * 1000)
  const withName = role === 'patient' ? appt.providerName : appt.patientName
  const lines = [
    `Mental health session ${role === 'patient' ? 'with' : 'for'} ${withName}.`,
    appt.notes ? `Notes: ${appt.notes}` : null,
    'Booked via MentisFlow.',
  ].filter(Boolean)
  return {
    title:       `MentisFlow session — ${withName}`,
    description: lines.join('\n'),
    location:    appt.meetingLink || 'Online video session',
    start, end,
  }
}

export function googleCalendarUrl(ev) {
  const p = new URLSearchParams({
    action:   'TEMPLATE',
    text:     ev.title,
    dates:    `${compact(ev.start)}/${compact(ev.end)}`,
    details:  ev.description,
    location: ev.location,
  })
  return `https://calendar.google.com/calendar/render?${p}`
}

export function outlookCalendarUrl(ev) {
  const p = new URLSearchParams({
    path:    '/calendar/action/compose',
    rru:     'addevent',
    subject: ev.title,
    startdt: isoLocal(ev.start),
    enddt:   isoLocal(ev.end),
    body:    ev.description,
    location: ev.location,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`
}

export function downloadICS(ev) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MentisFlow//Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@mentisflow`,
    `DTSTAMP:${compact(new Date())}`,
    `DTSTART:${compact(ev.start)}`,
    `DTEND:${compact(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(ev.description)}`,
    `LOCATION:${esc(ev.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'mentisflow-appointment.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
