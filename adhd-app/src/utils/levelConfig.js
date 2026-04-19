export const LEVELS = [
  { level: 1,  name: 'Getting Started',    xpRequired: 0,    color: 'text-ink-400' },
  { level: 2,  name: 'Building Momentum',  xpRequired: 100,  color: 'text-primary-400' },
  { level: 3,  name: 'Focus Apprentice',   xpRequired: 250,  color: 'text-primary-500' },
  { level: 4,  name: 'Task Tamer',         xpRequired: 500,  color: 'text-accent-500' },
  { level: 5,  name: 'Habit Architect',    xpRequired: 850,  color: 'text-accent-500' },
  { level: 6,  name: 'Flow State Finder',  xpRequired: 1300, color: 'text-success-500' },
  { level: 7,  name: 'Deep Focus Master',  xpRequired: 1900, color: 'text-success-500' },
  { level: 8,  name: 'Executive Legend',   xpRequired: 2700, color: 'text-warm-500' },
  { level: 9,  name: 'Dopamine Alchemist', xpRequired: 3700, color: 'text-warm-400' },
  { level: 10, name: 'ADHD Champion',      xpRequired: 5000, color: 'text-primary-400' },
]

export const getLevelForPoints = (points) => {
  let current = LEVELS[0]
  for (const lvl of LEVELS) {
    if (points >= lvl.xpRequired) current = lvl
    else break
  }
  return current
}

export const getNextLevel = (currentLevel) =>
  LEVELS.find(l => l.level === currentLevel.level + 1) || null
