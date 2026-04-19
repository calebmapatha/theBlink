import { useState } from 'react'
import { Plus, Trash2, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Checkbox } from '../components/ui/Checkbox'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatDayHeader } from '../utils/dateUtils'

const EMOJI_OPTIONS = ['💧','🚶','💊','🍳','🛏️','🧘','📖','🏃','🎯','✨','🌿','🤸','💪','🥗','☀️']

function HabitRow({ habit, checked, onToggle, streak }) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3 p-3.5 rounded-xl border bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700"
    >
      <span className="text-xl w-7 text-center flex-shrink-0">{habit.emoji}</span>
      <span className="flex-1 text-sm font-medium text-ink-900 dark:text-ink-100">{habit.name}</span>
      {streak > 0 && (
        <Badge variant="streak">🔥 {streak}</Badge>
      )}
      <Checkbox checked={checked} onChange={() => onToggle(habit.id)} />
    </motion.div>
  )
}

function ManageModal({ open, onClose, habits, onAdd, onRemove }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('⭐')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd(name.trim(), emoji)
    setName('')
    setEmoji('⭐')
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Habits">
      <div className="space-y-4">
        {habits.length < 7 ? (
          <div className="space-y-2">
            <p className="text-xs text-ink-400">Add a habit (max 7)</p>
            <div className="flex gap-2">
              <div className="flex flex-wrap gap-1 p-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 flex-shrink-0" style={{ width: '130px' }}>
                {EMOJI_OPTIONS.slice(0, 9).map(e => (
                  <button key={e} onClick={() => setEmoji(e)} className={`text-base rounded p-0.5 transition-colors ${emoji === e ? 'bg-primary-100 dark:bg-primary-700/30' : ''}`}>
                    {e}
                  </button>
                ))}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Habit name..."
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <Button size="sm" onClick={handleAdd} disabled={!name.trim()} className="w-full">
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-400 bg-surface-50 dark:bg-surface-900 px-3 py-2 rounded-lg">
            Maximum 7 habits reached. Remove one to add another.
          </p>
        )}

        <div className="space-y-1.5">
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900">
              <span className="text-lg">{habit.emoji}</span>
              <span className="flex-1 text-sm text-ink-900 dark:text-ink-100">{habit.name}</span>
              <button onClick={() => onRemove(habit.id)} className="p-1 rounded text-ink-400 hover:text-red-500 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function HabitTracker() {
  const { habits, awardAndToast } = useApp()
  const [manageOpen, setManageOpen] = useState(false)

  const handleToggle = (id) => {
    const wasChecked = habits.isCheckedToday(id)
    habits.toggleHabit(id)
    if (!wasChecked) {
      const h = habits.habits.find(h => h.id === id)
      awardAndToast('HABIT_CHECK', `Habit: ${h?.name}`)
    }
  }

  const checked = habits.habits.filter(h => habits.isCheckedToday(h.id)).length

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Habits</h1>
          <p className="text-sm text-ink-400 mt-0.5">{formatDayHeader()}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setManageOpen(true)}>
          <Settings size={18} />
        </Button>
      </div>

      {/* Progress bar */}
      {habits.totalHabits > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-900 dark:text-ink-100">Today's progress</span>
            <span className="text-sm font-semibold text-primary-500">{checked}/{habits.totalHabits}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary-500"
              animate={{ width: `${habits.totalHabits > 0 ? (checked / habits.totalHabits) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {checked === habits.totalHabits && habits.totalHabits > 0 && (
            <p className="text-xs text-success-600 dark:text-success-400 mt-2 font-medium">
              🎉 All habits complete! Amazing job!
            </p>
          )}
        </Card>
      )}

      {/* Habit rows */}
      {habits.habits.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-sm text-ink-400 mb-4">No habits yet. Add some to get started!</p>
          <Button onClick={() => setManageOpen(true)}>
            <Plus size={15} /> Add habits
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {habits.habits.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                checked={habits.isCheckedToday(habit.id)}
                onToggle={handleToggle}
                streak={habits.getStreak(habit.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        habits={habits.habits}
        onAdd={habits.addHabit}
        onRemove={habits.removeHabit}
      />
    </PageWrapper>
  )
}
