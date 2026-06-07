import { useUserLocalStorage } from './useLocalStorage'
import { POINTS, POINT_LABELS } from '../utils/pointsConfig'
import { getLevelForPoints, getNextLevel } from '../utils/levelConfig'

const INITIAL = { totalPoints: 0, history: [] }

export function useRewards(userId) {
  const [state, setState] = useUserLocalStorage(userId, 'adhd_rewards', INITIAL)

  const awardPoints = (action, customLabel) => {
    const pts = POINTS[action] ?? 0
    const label = customLabel || POINT_LABELS[action] || action
    setState(prev => ({
      totalPoints: prev.totalPoints + pts,
      history: [
        { id: Date.now().toString(), action, label, points: pts, timestamp: new Date().toISOString() },
        ...prev.history.slice(0, 49),
      ],
    }))
    return pts
  }

  const currentLevel = getLevelForPoints(state.totalPoints)
  const nextLevel = getNextLevel(currentLevel)
  const xpInCurrentLevel = state.totalPoints - currentLevel.xpRequired
  const xpForNextLevel = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0

  return { totalPoints: state.totalPoints, history: state.history, awardPoints, currentLevel, nextLevel, xpInCurrentLevel, xpForNextLevel }
}
