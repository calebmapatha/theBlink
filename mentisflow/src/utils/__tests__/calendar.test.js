import { describe, it, expect } from 'vitest'
import { buildEvent, googleCalendarUrl, outlookCalendarUrl } from '../calendar'

const APPT = {
  date: '2026-06-15',
  timeSlot: '09:30',
  providerName: 'Dr. Test',
  patientName: 'Pat Patient',
  notes: 'Bring previous scripts',
  meetingLink: 'https://meet.example.com/room?id=1&x=2',
}

describe('buildEvent', () => {
  it('parses the local start time and adds a 60-minute duration', () => {
    const ev = buildEvent(APPT)
    expect(ev.start.getFullYear()).toBe(2026)
    expect(ev.start.getMonth()).toBe(5)
    expect(ev.start.getDate()).toBe(15)
    expect(ev.start.getHours()).toBe(9)
    expect(ev.start.getMinutes()).toBe(30)
    expect(+ev.end - +ev.start).toBe(60 * 60 * 1000)
  })

  it('names the counterparty based on role', () => {
    expect(buildEvent(APPT, 'patient').title).toContain('Dr. Test')
    expect(buildEvent(APPT, 'provider').title).toContain('Pat Patient')
  })

  it('falls back to a generic location without a meeting link', () => {
    const ev = buildEvent({ ...APPT, meetingLink: '' })
    expect(ev.location).toBe('Online video session')
  })
})

describe('calendar URLs', () => {
  it('Google URL encodes user-controlled fields safely', () => {
    const ev = buildEvent({ ...APPT, providerName: 'Dr. "A&B" <x>' })
    const url = googleCalendarUrl(ev)
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true)
    const p = new URL(url).searchParams
    expect(p.get('text')).toContain('Dr. "A&B" <x>')
    expect(p.get('dates')).toBe('20260615T093000/20260615T103000')
  })

  it('Outlook URL carries local ISO times and the location', () => {
    const url = outlookCalendarUrl(buildEvent(APPT))
    const p = new URL(url).searchParams
    expect(p.get('startdt')).toBe('2026-06-15T09:30:00')
    expect(p.get('enddt')).toBe('2026-06-15T10:30:00')
    expect(p.get('location')).toBe(APPT.meetingLink)
  })
})
