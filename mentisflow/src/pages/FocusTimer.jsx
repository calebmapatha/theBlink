import { useState } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Settings, Volume2 } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { ProgressRing } from '../components/ui/ProgressRing'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useAmbientSound, SOUNDS } from '../hooks/useAmbientSound'

const MODE_LABELS = {
  work:       'Focus',
  shortBreak: 'Short Break',
  longBreak:  'Long Break',
}

const MODE_COLORS = {
  work:       'text-accent',
  shortBreak: 'text-success-500',
  longBreak:  'text-purple-500',
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
            <label className="block text-sm font-medium text-ink mb-1">{label}</label>
            <input type="number" min="1"
              className="w-full px-3 py-2 rounded-xl border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              {...field(key)} />
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
  const { active, play, volume, setVolume } = useAmbientSound()
  const isRunning = timer.status === 'running'

  return (
    <PageWrapper>
      <PageHeader
        title="Focus Timer"
        subtitle="Pomodoro-style work sessions"
        action={
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} />
          </Button>
        }
        className="mb-8"
      />

      <div className="flex gap-2 mb-10 p-1 bg-raised/60 rounded-xl">
        {Object.entries(MODE_LABELS).map(([mode, label]) => (
          <button key={mode} onClick={() => timer.setMode(mode)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              timer.mode === mode
                ? 'bg-surface dark:bg-line text-ink shadow-sm'
                : 'text-faint hover:text-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center mb-10">
        <div className="relative">
          <ProgressRing progress={timer.progress} mode={timer.mode} size={240} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-light timer-nums ${MODE_COLORS[timer.mode]}`}>
              {formatTime(timer.secondsLeft)}
            </span>
            <span className="text-sm text-faint mt-1">{MODE_LABELS[timer.mode]}</span>
          </div>
        </div>
        <p className="text-xs text-faint mt-4">Session {timer.sessionCount + 1} of {timer.settings.longBreakInterval}</p>
      </div>

      <div className="flex items-center justify-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={timer.reset} title="Reset"><RotateCcw size={18} /></Button>
        <Button size="lg" variant={isRunning ? 'ghost' : 'primary'}
          className={`px-10 ${isRunning ? 'border border-line' : ''}`}
          onClick={isRunning ? timer.pause : timer.start}>
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button variant="ghost" size="icon" onClick={timer.skip} title="Skip"><SkipForward size={18} /></Button>
      </div>

      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Volume2 size={13} className="text-faint" />
          <span className="text-xs text-faint font-medium">Ambient sound</span>
        </div>
        <div className="flex gap-2">
          {SOUNDS.filter(s => s.id !== 'none').map(s => (
            <button key={s.id} onClick={() => play(active === s.id ? 'none' : s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                active === s.id
                  ? 'bg-accent-soft border-accent text-accent-soft-text'
                  : 'border-line text-faint hover:border-faint'
              }`}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
        {active !== 'none' && (
          <div className="flex items-center gap-2 w-40">
            <span className="text-xs text-faint">Vol</span>
            <input type="range" min="0" max="1" step="0.05" value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="flex-1 accent-accent" />
          </div>
        )}
      </div>

      {timer.sessionCount > 0 && (
        <Card className="p-4 text-center">
          <p className="text-sm text-faint">
            <span className="text-ink font-semibold">{timer.sessionCount}</span>{' '}
            focus session{timer.sessionCount !== 1 ? 's' : ''} completed today
          </p>
        </Card>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
        settings={timer.settings} onSave={timer.updateSettings} />
    </PageWrapper>
  )
}
