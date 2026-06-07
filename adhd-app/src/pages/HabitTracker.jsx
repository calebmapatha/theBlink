import { useState } from 'react'
import { Plus, Settings, Edit2, Trash2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Checkbox } from '../components/ui/Checkbox'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatDayHeader } from '../utils/dateUtils'

const EMOJI_OPTIONS = ['💧','🚶','💊','🍳','🛏️','🧘','📖','🏃','🎯','✨','🌿','🤸','💪','🥗','☀️','🏋️','🚴','🧗','🏊','🎨','🎵','📝','🧹','🛁','😴']
const FREQ_OPTIONS = [
  { value: 'daily',  label: 'Every day' },
  { value: 'weekly', label: 'Times per week' },
]

function WeeklyProgress({ count, target }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: target }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i < count ? 'bg-success-500' : 'bg-surface-200 dark:bg-surface-600'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-ink-400">{count}/{target}w</span>
    </div>
  )
}

function HabitRow({ habit, checked, onToggle, streak, weeklyCount }) {
  const isWeekly = habit.frequency === 'weekly'
  const weeklyMet = isWeekly && weeklyCount >= habit.weeklyTarget

  return (
    <motion.div layout className="flex items-center gap-3 p-3.5 rounded-xl border bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700">
      <span className="text-xl w-7 text-center flex-shrink-0">{habit.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{habit.name}</p>
        {isWeekly && (
          <WeeklyProgress count={weeklyCount} target={habit.weeklyTarget} />
        )}
      </div>
      {streak > 0 && !isWeekly && <Badge variant="streak">🔥 {streak}</Badge>}
      {weeklyMet && <Badge variant="success">✓ Week done!</Badge>}
      <Checkbox checked={checked} onChange={() => onToggle(habit.id)} />
    </motion.div>
  )
}

function HabitFormModal({ open, onClose, onSave, initial }) {
  const [name, setName]           = useState(initial?.name || '')
  const [emoji, setEmoji]         = useState(initial?.emoji || '⭐')
  const [frequency, setFrequency] = useState(initial?.frequency || 'daily')
  const [target, setTarget]       = useState(initial?.weeklyTarget || 3)

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), emoji, frequency, weeklyTarget: Number(target) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Habit' : 'Add Habit'}>
      <div className="space-y-4">
        {/* Emoji picker */}
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-2">Icon</label>
          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-900 max-h-24 overflow-y-auto">
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`text-lg p-1 rounded-lg transition-colors ${emoji === e ? 'bg-primary-100 dark:bg-primary-700/30 ring-1 ring-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-700'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-1">Habit name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Go to gym"
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-xs font-medium text-ink-400 mb-2">Frequency</label>
          <div className="flex gap-2">
            {FREQ_OPTIONS.map(f => (
              <button key={f.value} onClick={() => setFrequency(f.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                  frequency === f.value
                    ? 'bg-primary-50 dark:bg-primary-700/20 border-primary-400 text-primary-600 dark:text-primary-300'
                    : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly target */}
        {frequency === 'weekly' && (
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-2">
              Times per week: <span className="text-primary-500 font-semibold">{target}</span>
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => setTarget(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    target === n
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-700 text-ink-700 dark:text-ink-300 hover:bg-surface-200'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!name.trim()}>
            <Check size={14} /> Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ManageModal({ open, onClose, habits, onAdd, onEdit, onRemove }) {
  const [addOpen, setAddOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Habits">
        <div className="space-y-3">
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900">
              <span className="text-lg">{habit.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{habit.name}</p>
                <p className="text-xs text-ink-400">
                  {habit.frequency === 'weekly' ? `${habit.weeklyTarget}× per week` : 'Daily'}
                </p>
              </div>
              <button onClick={() => setEditTarget(habit)} className="p-1.5 rounded-lg text-ink-400 hover:text-primary-500 transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onRemove(habit.id)} className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {habits.length < 10 ? (
            <Button variant="soft" className="w-full" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add habit
            </Button>
          ) : (
            <p className="text-xs text-ink-400 text-center py-2">Maximum 10 habits reached</p>
          )}
        </div>
      </Modal>

      <HabitFormModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(data) => onAdd(data.name, data.emoji, data.frequency, data.weeklyTarget)} />

      {editTarget && (
        <HabitFormModal open={!!editTarget} onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={(data) => { onEdit(editTarget.id, data); setEditTarget(null) }} />
      )}
    </>
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

      {/* Progress */}
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
            <p className="text-xs text-success-600 dark:text-success-400 mt-2 font-medium">🎉 All habits complete!</p>
          )}
        </Card>
      )}

      {habits.habits.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-sm text-ink-400 mb-4">No habits yet.</p>
          <Button onClick={() => setManageOpen(true)}><Plus size={15} /> Add habits</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {habits.habits.map(habit => (
              <HabitRow key={habit.id} habit={habit}
                checked={habits.isCheckedToday(habit.id)}
                onToggle={handleToggle}
                streak={habits.getStreak(habit.id)}
                weeklyCount={habits.getWeeklyCount(habit.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ManageModal open={manageOpen} onClose={() => setManageOpen(false)}
        habits={habits.habits}
        onAdd={habits.addHabit}
        onEdit={habits.editHabit}
        onRemove={habits.removeHabit} />
    </PageWrapper>
  )
}
