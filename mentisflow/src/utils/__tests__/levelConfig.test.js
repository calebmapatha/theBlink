import { describe, it, expect } from 'vitest'
import { LEVELS, getLevelForPoints, getNextLevel } from '../levelConfig'

describe('getLevelForPoints', () => {
  it('starts at level 1 with 0 points', () => {
    expect(getLevelForPoints(0).level).toBe(1)
  })

  it('promotes exactly at each threshold', () => {
    for (const lvl of LEVELS) {
      expect(getLevelForPoints(lvl.xpRequired).level).toBe(lvl.level)
      if (lvl.xpRequired > 0) {
        expect(getLevelForPoints(lvl.xpRequired - 1).level).toBe(lvl.level - 1)
      }
    }
  })

  it('caps at the top level for huge totals', () => {
    expect(getLevelForPoints(1e9).level).toBe(10)
  })
})

describe('getNextLevel', () => {
  it('returns the following level, or null at the cap', () => {
    expect(getNextLevel(LEVELS[0]).level).toBe(2)
    expect(getNextLevel(LEVELS[9])).toBeNull()
  })
})
