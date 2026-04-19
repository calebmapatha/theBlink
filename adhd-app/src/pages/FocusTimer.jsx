import { useState } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Settings } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ProgressRing } from '../components/ui/ProgressRing'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'

const MODE_LABELS = {
  work:       '🎯 Focus',
  shortBreak: '☕ Short Break',
  longBreak:  '🌿 Long Break',
}

const MODE_COLORS = {
  work:       'text-primary-500',
  shortBreak: 'text-success-500',
  longBreak:  'text-accent-500',
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function SettingsModal({ open, onClose, settings, onSave }) {
  const [local, setLocal] = useState(settings)
  const field = (key) => ({
    value: local[key],
    onChange: (e) => setLocal(prev => ({ ...prev, [key]: Math.max(1, parseInt(e.target.value) || 1) })),
  })
  return (
    <Modal open={open} onClose={onClose} title="Timer Settings">
      <div className="space-y-4">
        {[
          { key: 'workDuration',      label: 'Focus duration (min)' },
          { key: 'shortBreak',        label: 'Short break (min)' },
          { key: 'longBreak',         label: 'Long break (min)' },
          { key: 'longBreakInterval', label: 'Long break every N sessions' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">{label}</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              {...field(key)}
            />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => { onSave(local); onClose() }}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}

export function FocusTimer() {
  const { timer } = useApp()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isRunning = timer.status === 'running'

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Focus Timer</h1>
          <p className="text-sm text-ink-400 mt-0.5">Pomodoro-style work sessions</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
          <Settings size={18} />
        </Button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-10 p-1 bg-surface-100 dark:bg-surface-800/60 rounded-xl">
        {Object.entries(MODE_LABELS).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => timer.setMode(mode)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              timer.mode === mode
                ? 'bg-white dark:bg-surface-700 text-ink-900 dark:text-ink-100 shadow-sm'
                : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative">
          <ProgressRing progress={timer.progress} mode={timer.mode} size={240} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-light timer-nums ${MODE_COLORS[timer.mode]}`}>
              {formatTime(timer.secondsLeft)}
            </span>
            <span className="text-sm text-ink-400 mt-1">{MODE_LABELS[timer.mode]}</span>
          </div>
        </div>
        <p className="text-xs text-ink-400 mt-4">
          Session {timer.sessionCount + 1} of {timer.settings.longBreakInterval}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={timer.reset} title="Reset">
          <RotateCcw size={18} />
        </Button>
        <Button
          size="lg"
          variant={isRunning ? 'ghost' : 'primary'}
          className={`px-10 ${isRunning ? 'border border-surface-200 dark:border-surface-700' : ''}`}
          onClick={isRunning ? timer.pause : timer.start}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button variant="ghost" size="icon" onClick={timer.skip} title="Skip">
          <SkipForward size={18} />
        </Button>
      </div>

      {/* Stats */}
      {timer.sessionCount > 0 && (
        <Card className="p-4 text-center">
          <p className="text-sm text-ink-400">
            <span className="text-ink-900 dark:text-ink-100 font-semibold">{timer.sessionCount}</span>{' '}
            focus session{timer.sessionCount !== 1 ? 's' : ''} completed today 🎉
          </p>
        </Card>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={timer.settings}
        onSave={timer.updateSettings}
      />
    </PageWrapper>
  )
}
