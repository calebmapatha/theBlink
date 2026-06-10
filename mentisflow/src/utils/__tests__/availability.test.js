import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  DEFAULT_HOURS, DAY_KEYS,
  slotsForDay, dayMode, availableSlotsForDate, addBookedSlot,
} from '../availability'

afterEach(() => vi.useRealTimers())

describe('slotsForDay', () => {
  it('falls back to default hours on weekdays when no override exists', () => {
    expect(slotsForDay({}, 'mon')).toEqual(DEFAULT_HOURS)
    expect(slotsForDay(undefined, 'fri')).toEqual(DEFAULT_HOURS)
  })

  it('is closed by default on weekends', () => {
    expect(slotsForDay({}, 'sat')).toEqual([])
    expect(slotsForDay({}, 'sun')).toEqual([])
  })

  it('honours custom slots and returns them sorted', () => {
    expect(slotsForDay({ mon: ['14:00', '09:00'] }, 'mon')).toEqual(['09:00', '14:00'])
  })

  it('treats an empty array as an explicitly closed day', () => {
    expect(slotsForDay({ wed: [] }, 'wed')).toEqual([])
  })
})

describe('dayMode', () => {
  it('classifies default / closed / custom days', () => {
    expect(dayMode({}, 'mon')).toBe('default')
    expect(dayMode({ mon: [] }, 'mon')).toBe('closed')
    expect(dayMode({ mon: ['09:00'] }, 'mon')).toBe('custom')
  })
})

describe('availableSlotsForDate', () => {
  it('returns [] for a missing date', () => {
    expect(availableSlotsForDate({}, {}, '')).toEqual([])
    expect(availableSlotsForDate({}, {}, undefined)).toEqual([])
  })

  it('maps a date to the right weekday', () => {
    // 2026-06-08 is a Monday
    expect(DAY_KEYS[new Date(2026, 5, 8).getDay()]).toBe('mon')
    expect(availableSlotsForDate({ mon: ['09:00', '10:00'] }, {}, '2026-06-08')).toEqual(['09:00', '10:00'])
  })

  it('subtracts booked slots', () => {
    const out = availableSlotsForDate({ mon: ['09:00', '10:00', '11:00'] }, { '2026-06-08': ['10:00'] }, '2026-06-08')
    expect(out).toEqual(['09:00', '11:00'])
  })

  it('hides times already past when the date is today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 8, 10, 30)) // Mon 10:30
    const out = availableSlotsForDate({ mon: ['09:00', '10:00', '11:00'] }, {}, '2026-06-08')
    expect(out).toEqual(['11:00'])
  })
})

describe('addBookedSlot', () => {
  it('adds a slot, dedupes, and keeps times sorted', () => {
    const next = addBookedSlot({ '2099-01-01': ['10:00'] }, '2099-01-01', '09:00')
    expect(next['2099-01-01']).toEqual(['09:00', '10:00'])
    const again = addBookedSlot(next, '2099-01-01', '09:00')
    expect(again['2099-01-01']).toEqual(['09:00', '10:00'])
  })

  it('prunes past dates but keeps today and future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'))
    const next = addBookedSlot(
      { '2026-06-09': ['09:00'], '2026-06-10': ['10:00'], '2026-06-11': ['11:00'] },
      '2026-06-12', '08:00',
    )
    expect(Object.keys(next).sort()).toEqual(['2026-06-10', '2026-06-11', '2026-06-12'])
  })

  it('works from an empty/undefined map', () => {
    expect(addBookedSlot(undefined, '2099-01-01', '09:00')).toEqual({ '2099-01-01': ['09:00'] })
  })
})
