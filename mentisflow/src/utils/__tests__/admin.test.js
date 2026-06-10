import { describe, it, expect } from 'vitest'
import { csvCell, isAdminUser, ADMIN_EMAIL } from '../admin'

describe('isAdminUser', () => {
  it('matches only the configured admin email', () => {
    expect(isAdminUser({ email: ADMIN_EMAIL })).toBe(true)
    expect(isAdminUser({ email: 'someone@example.com' })).toBe(false)
    expect(isAdminUser(null)).toBe(false)
    expect(isAdminUser(undefined)).toBe(false)
  })
})

describe('csvCell', () => {
  it('passes plain values through', () => {
    expect(csvCell('hello')).toBe('hello')
    expect(csvCell(42)).toBe('42')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })

  it('quotes values containing commas, quotes or newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('neutralises spreadsheet formula injection', () => {
    expect(csvCell('=cmd|/C calc!A1')).toBe("'=cmd|/C calc!A1")
    expect(csvCell('+1+1')).toBe("'+1+1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('-2+3')).toBe("'-2+3")
    // formula char + separator → quoted AND prefixed
    expect(csvCell('=1,2')).toBe('"\'=1,2"')
  })
})
