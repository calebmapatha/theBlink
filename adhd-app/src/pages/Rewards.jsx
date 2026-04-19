import { motion } from 'framer-motion'
import { Zap, Trophy } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatRelative } from '../utils/dateUtils'

export function Rewards() {
  const { rewards } = useApp()
  const { currentLevel, nextLevel, xpInCurrentLevel, xpForNextLevel, totalPoints, history } = rewards
  const progress = xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 100

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Rewards</h1>
        <p className="text-sm text-ink-400 mt-0.5">Your progress and achievements</p>
      </div>

      {/* Level card */}
      <Card glow className="p-6 mb-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-3">
          <Trophy size={28} className="text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Level {currentLevel.level}</p>
        <h2 className={`text-xl font-bold mb-1 ${currentLevel.color}`}>{currentLevel.name}</h2>
        <p className="text-3xl font-bold text-ink-900 dark:text-ink-100 timer-nums">{totalPoints} <span className="text-sm font-normal text-ink-400">total XP</span></p>
      </Card>

      {/* XP Progress */}
      {nextLevel && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-700 dark:text-ink-300">Progress to Level {nextLevel.level}</span>
            <span className="text-sm font-semibold text-primary-500 timer-nums">{xpInCurrentLevel} / {xpForNextLevel} XP</span>
          </div>
          <div className="h-3 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-ink-400 mt-2">{nextLevel.xpRequired - totalPoints} XP until "{nextLevel.name}"</p>
        </Card>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Recent Activity</p>
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <Zap size={32} className="text-ink-400 mx-auto mb-2 opacity-40" />
            <p className="text-sm text-ink-400">Complete tasks, habits, and focus sessions to earn XP!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={14} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-900 dark:text-ink-100 truncate">{item.label}</p>
                  <p className="text-xs text-ink-400">{formatRelative(item.timestamp)}</p>
                </div>
                <span className="text-sm font-semibold text-success-600 dark:text-success-400 timer-nums flex-shrink-0">
                  +{item.points}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
