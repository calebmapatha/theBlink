import { useState } from 'react'
import { CheckCircle, Edit3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatDayHeader } from '../utils/dateUtils'

const MOODS = ['😔', '😕', '😐', '🙂', '😄']
const MOOD_LABELS = ['Rough', 'Meh', 'Okay', 'Good', 'Great']
const ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Energized']

function MoodPicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-3">How are you feeling?</label>
      <div className="flex gap-2">
        {MOODS.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all
              ${value === i + 1
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
              }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-xs text-ink-400">{MOOD_LABELS[i]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EnergyPicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-3">Energy level?</label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(level => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all"
          >
            <div className="flex flex-col gap-0.5">
              {[5, 4, 3, 2, 1].map(bar => (
                <div
                  key={bar}
                  className={`w-6 rounded-sm transition-colors ${
                    bar <= level && value >= level
                      ? 'bg-primary-500'
                      : bar <= level
                      ? 'bg-primary-200 dark:bg-primary-700/40'
                      : 'bg-surface-200 dark:bg-surface-700'
                  }`}
                  style={{ height: `${bar * 3}px` }}
                />
              ))}
            </div>
            <span className="text-xs text-ink-400">{level}</span>
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-xs text-ink-400 mt-2 text-center">{ENERGY_LABELS[value - 1]}</p>
      )}
    </div>
  )
}

function CheckinSummary({ checkin, onEdit }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle size={18} className="text-success-500" />
        <span className="font-medium text-ink-900 dark:text-ink-100">Check-in complete</span>
        <button onClick={onEdit} className="ml-auto p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-ink-400">
          <Edit3 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 rounded-xl bg-surface-50 dark:bg-surface-900">
          <p className="text-3xl mb-1">{MOODS[checkin.mood - 1]}</p>
          <p className="text-xs text-ink-400">{MOOD_LABELS[checkin.mood - 1]}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-surface-50 dark:bg-surface-900">
          <p className="text-2xl font-semibold text-primary-500 mb-1">{checkin.energy}/5</p>
          <p className="text-xs text-ink-400">{ENERGY_LABELS[checkin.energy - 1]}</p>
        </div>
      </div>
      {checkin.intention && (
        <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-700/15 border border-primary-100 dark:border-primary-700/30">
          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">Today's intention</p>
          <p className="text-sm text-ink-900 dark:text-ink-100">{checkin.intention}</p>
        </div>
      )}
    </Card>
  )
}

export function DailyCheckin() {
  const { checkin, awardAndToast } = useApp()
  const [mood, setMood] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [intention, setIntention] = useState('')
  const [editing, setEditing] = useState(false)

  const handleSubmit = () => {
    const isFirst = !checkin.todayCheckin
    checkin.saveCheckin({ mood, energy, intention })
    if (isFirst) awardAndToast('DAILY_CHECKIN', 'Daily check-in complete!')
    setEditing(false)
  }

  const handleEdit = () => {
    if (checkin.todayCheckin) {
      setMood(checkin.todayCheckin.mood)
      setEnergy(checkin.todayCheckin.energy)
      setIntention(checkin.todayCheckin.intention || '')
    }
    setEditing(true)
  }

  const showForm = !checkin.todayCheckin || editing

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Daily Check-in</h1>
        <p className="text-sm text-ink-400 mt-0.5">{formatDayHeader()}</p>
      </div>

      {!showForm ? (
        <CheckinSummary checkin={checkin.todayCheckin} onEdit={handleEdit} />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-5">
            <MoodPicker value={mood} onChange={setMood} />
          </Card>

          <Card className="p-5">
            <EnergyPicker value={energy} onChange={setEnergy} />
          </Card>

          <Card className="p-5">
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
              One intention for today
            </label>
            <input
              value={intention}
              onChange={e => setIntention(e.target.value.slice(0, 120))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="What's one thing you want to accomplish?"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <p className="text-xs text-ink-400 mt-1 text-right">{intention.length}/120</p>
          </Card>

          <div className="flex gap-2">
            {editing && (
              <Button variant="ghost" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
            )}
            <Button onClick={handleSubmit} className="flex-1">
              <CheckCircle size={16} />
              {editing ? 'Update' : 'Save Check-in'}
            </Button>
          </div>
        </motion.div>
      )}
    </PageWrapper>
  )
}
