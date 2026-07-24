import { useState } from 'react'
import { Plus, Settings, Edit2, Trash2, Check, Sprout, Flame } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { formatDayHeader } from '../utils/dateUtils'
import { HABIT_COLORS } from '../hooks/useHabits'

const EMOJI_OPTIONS = ['💧','🚶','💊','🍳','🛏️','🧘','📖','🏃','🎯','✨','🌿','🤸','💪','🥗','☀️','🏋️','🚴','🧗','🏊','🎨','🎵','📝','🧹','🛁','😴']
const FREQ_OPTIONS  = [
  { value: 'daily',  label: 'Every day' },
  { value: 'weekly', label: 'Times per week' },
]

function ProgressRing({ progress, size = 80, strokeWidth = 8, color = 'rgb(var(--accent))', children }) {
  const radius        = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset    = circumference * (1 - Math.min(Math.max(progress, 0), 1))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth} opacity={0.15} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

function SummaryRing({ checked, total }) {
  const progress = total > 0 ? checked / total : 0
  const allDone  = checked === total && total > 0
  return (
    <div className="flex flex-col items-center py-6">
      <ProgressRing progress={progress} size={156} strokeWidth={15} color="rgb(var(--accent))">
        <div className="text-center">
          <p className="text-4xl font-bold text-ink leading-none">{checked}</p>
          <p className="text-sm text-faint mt-1">of {total}</p>
        </div>
      </ProgressRing>
      <p className={`text-sm font-medium mt-4 transition-colors ${allDone ? 'text-success-500' : 'text-faint'}`}>
        {allDone ? 'All habits complete!' : 'habits today'}
      </p>
    </div>
  )
}

function HabitCard({ habit, checked, onToggle, streak, weeklyCount }) {
  const isWeekly  = habit.frequency === 'weekly'
  const weeklyMet = isWeekly && weeklyCount >= habit.weeklyTarget
  const progress  = isWeekly ? Math.min(weeklyCount / habit.weeklyTarget, 1) : checked ? 1 : 0

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.93 }}
      onClick={() => onToggle(habit.id)}
      className={`flex flex-col items-center gap-2.5 p-4  border transition-colors w-full ${
        checked || weeklyMet
          ? 'bg-raised/60 border-line'
          : 'bg-surface border-line'
      }`}
    >
      <ProgressRing progress={progress} size={76} strokeWidth={7} color={habit.color}>
        <motion.span
          className="text-2xl select-none"
          animate={checked && !isWeekly ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {habit.emoji}
        </motion.span>
      </ProgressRing>

      <div className="text-center">
        <p className="text-xs font-semibold text-ink leading-tight line-clamp-2">{habit.name}</p>
        {isWeekly ? (
          <p className="text-[10px] text-faint mt-0.5">{weeklyCount}/{habit.weeklyTarget}× week</p>
        ) : streak > 0 ? (
          <p className="flex items-center justify-center gap-0.5 text-[10px] text-faint mt-0.5"><Flame size={10} className="text-warm-500" /> {streak} day{streak !== 1 ? 's' : ''}</p>
        ) : null}
      </div>
    </motion.button>
  )
}

function HabitFormModal({ open, onClose, onSave, initial }) {
  const [name,      setName]      = useState(initial?.name || '')
  const [emoji,     setEmoji]     = useState(initial?.emoji || '⭐')
  const [color,     setColor]     = useState(initial?.color || HABIT_COLORS[0])
  const [frequency, setFrequency] = useState(initial?.frequency || 'daily')
  const [target,    setTarget]    = useState(initial?.weeklyTarget || 3)

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), emoji, color, frequency, weeklyTarget: Number(target) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Habit' : 'Add Habit'}>
      <div className="space-y-4">
        <div className="flex justify-center py-1">
          <ProgressRing progress={0.6} size={72} strokeWidth={7} color={color}>
            <span className="text-2xl">{emoji}</span>
          </ProgressRing>
        </div>

        <div>
          <label className="block text-xs font-medium text-faint mb-2">Color</label>
          <div className="flex flex-wrap gap-2.5">
            {HABIT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-8 h-8  transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-surface ring-faint' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-faint mb-2">Icon</label>
          <div className="flex flex-wrap gap-1.5 p-2.5  bg-raised max-h-24 overflow-y-auto">
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`text-lg p-1  transition-colors ${emoji === e ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-raised'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-faint mb-1">Habit name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Go to gym"
            className="w-full px-3 py-2.5  border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label className="block text-xs font-medium text-faint mb-2">Frequency</label>
          <div className="flex gap-2">
            {FREQ_OPTIONS.map(f => (
              <button key={f.value} onClick={() => setFrequency(f.value)}
                className={`flex-1 py-2  text-sm font-medium border transition-all ${
                  frequency === f.value
                    ? 'bg-accent-soft border-accent text-accent-soft-text'
                    : 'border-line text-faint hover:border-faint'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {frequency === 'weekly' && (
          <div>
            <label className="block text-xs font-medium text-faint mb-2">
              Times per week: <span className="font-semibold" style={{ color }}>{target}</span>
            </label>
            <div className="flex gap-1.5">
              {[1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => setTarget(n)}
                  className={`flex-1 py-2  text-sm font-medium transition-all ${
                    target === n ? 'text-white' : 'bg-raised text-ink hover:bg-line'
                  }`}
                  style={target === n ? { backgroundColor: color } : {}}>
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
  const [addOpen,    setAddOpen]    = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Habits">
        <div className="space-y-3">
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-3 px-3 py-2.5  bg-raised">
              <div className="w-3 h-3  flex-shrink-0" style={{ backgroundColor: habit.color }} />
              <span className="text-lg">{habit.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{habit.name}</p>
                <p className="text-xs text-faint">
                  {habit.frequency === 'weekly' ? `${habit.weeklyTarget}× per week` : 'Daily'}
                </p>
              </div>
              <button onClick={() => setEditTarget(habit)} className="p-1.5  text-faint hover:text-accent transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onRemove(habit.id)} className="p-1.5  text-faint hover:text-danger transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {habits.length < 10 ? (
            <Button variant="soft" className="w-full" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add habit
            </Button>
          ) : (
            <p className="text-xs text-faint text-center py-2">Maximum 10 habits reached</p>
          )}
        </div>
      </Modal>

      <HabitFormModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={d => onAdd(d.name, d.emoji, d.frequency, d.weeklyTarget, d.color)} />

      {editTarget && (
        <HabitFormModal open={!!editTarget} onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={d => { onEdit(editTarget.id, d); setEditTarget(null) }} />
      )}
    </>
  )
}

export function HabitTracker() {
  const { habits, awardAndToast, showToast } = useApp()
  const [manageOpen, setManageOpen] = useState(false)

  // Delete with an Undo toast; the habit's completion history is preserved,
  // so restoring brings back its streak too.
  const handleRemove = (id) => {
    const index = habits.habits.findIndex(h => h.id === id)
    const habit = habits.habits[index]
    if (!habit) return
    habits.removeHabit(id)
    showToast('Habit deleted', { variant: 'info', action: { label: 'Undo', onClick: () => habits.restoreHabit(habit, index) } })
  }

  const handleToggle = (id) => {
    const wasChecked = habits.isCheckedToday(id)
    habits.toggleHabit(id)
    if (!wasChecked) {
      const h = habits.habits.find(h => h.id === id)
      awardAndToast('HABIT_CHECK', `Habit: ${h?.name}`)
    }
  }

  const checkedToday = habits.habits.filter(h => habits.isCheckedToday(h.id)).length

  return (
    <PageWrapper>
      <PageHeader
        title="Habits"
        subtitle={formatDayHeader()}
        action={
          <Button variant="ghost" size="icon" onClick={() => setManageOpen(true)}>
            <Settings size={18} />
          </Button>
        }
        className="mb-2"
      />

      {habits.totalHabits > 0 && (
        <SummaryRing checked={checkedToday} total={habits.totalHabits} />
      )}

      {habits.habits.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3  bg-raised flex items-center justify-center"><Sprout size={22} className="text-faint" /></div>
          <p className="text-sm text-faint mb-4">No habits yet.</p>
          <Button onClick={() => setManageOpen(true)}><Plus size={15} /> Add habits</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AnimatePresence>
            {habits.habits.map(habit => (
              <HabitCard key={habit.id} habit={habit}
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
        onRemove={handleRemove} />
    </PageWrapper>
  )
}
