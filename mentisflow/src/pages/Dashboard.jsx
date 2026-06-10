import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight, Sun, HeartHandshake, Zap, Brain, BarChart2, ClipboardList } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { useTreatmentPlan } from '../hooks/useTreatmentPlan'
import { formatDayHeader } from '../utils/dateUtils'

const MOOD_EMOJI   = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const ENERGY_EMOJI = { 1: '🪴', 2: '😴', 3: '⚡', 4: '🔥', 5: '🚀' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatSeconds(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function MiniRing({ color, progress, size = 36, stroke = 5 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const fill = Math.min(Math.max(progress, 0), 1)
  const dash = fill * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} opacity={0.18} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.4s ease' }} />
    </svg>
  )
}

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: 'easeOut' } } }

export function Dashboard() {
  const navigate = useNavigate()
  const { habits, tasks, checkin, dump, timer, rewards, userId, awardAndToast } = useApp()
  const treatmentPlan = useTreatmentPlan(userId)
  const [dumpText, setDumpText] = useState('')

  const checkedTodayCount  = habits.habits.filter(h => habits.isCheckedToday(h.id)).length
  const completedTaskCount = tasks.completedToday.length
  const totalTaskCount     = tasks.todayTasks.length + completedTaskCount
  const isRunning          = timer.status === 'running'
  const isPaused           = timer.status === 'paused'

  const xpToNext   = rewards.nextLevel ? rewards.nextLevel.xpRequired - rewards.currentLevel.xpRequired : 0
  const xpProgress = xpToNext > 0 ? Math.min(rewards.xpInCurrentLevel / xpToNext, 1) : 1

  // Monthly stats
  const now   = new Date()
  const mData = habits.getMonthlyData(now.getFullYear(), now.getMonth())
  const daysWithData = mData.filter(d => d.total > 0)
  const monthHabitRate = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.completed.length / d.total, 0) / daysWithData.length * 100)
    : 0
  const monthPrefix    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTasksDone = tasks.tasks.filter(t => t.completedAt?.startsWith(monthPrefix)).length
  const monthCheckins  = Object.keys(checkin.checkins).filter(k => k.startsWith(monthPrefix)).length

  // Treatment plan
  const activeGoals = treatmentPlan.plan.goals.filter(g => g.status === 'active')
  const activeMeds  = treatmentPlan.plan.medications.filter(m => m.active)
  const topGoal     = activeGoals[0] ?? null

  const handleQuickDump = () => {
    if (!dumpText.trim()) return
    dump.addEntry(dumpText)
    awardAndToast('BRAIN_DUMP', 'Thought captured!')
    setDumpText('')
  }

  return (
    <PageWrapper>
      <div className="mb-5">
        <div className="flex items-center gap-2 text-ink-400 text-xs mb-1">
          <Sun size={13} />
          <span>{formatDayHeader()}</span>
        </div>
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">{greeting()} 👋</h1>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">

        {/* Connect — hero card */}
        <motion.div variants={itemVariants}>
          <button
            onClick={() => navigate('/connect')}
            className="w-full text-left p-5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <HeartHandshake size={16} className="opacity-80" />
                  <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">MentisFlow Connect</p>
                </div>
                <p className="text-lg font-semibold leading-snug mb-1">Mental Health Support</p>
                <p className="text-sm opacity-80 leading-relaxed">
                  Connect with HPCSA-registered psychiatrists &amp; psychologists. Book appointments and share your wellness data.
                </p>
              </div>
              <ChevronRight size={18} className="opacity-60 flex-shrink-0 mt-1" />
            </div>
          </button>
        </motion.div>

        {/* FocusBlink section divider */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-primary-500" />
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">FocusBlink</span>
          </div>
          <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
        </motion.div>

        {/* Check-in */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors" onClick={() => navigate('/checkin')}>
            {checkin.todayCheckin ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{MOOD_EMOJI[checkin.todayCheckin.mood] ?? '😐'}</span>
                  <span className="text-2xl">{ENERGY_EMOJI[checkin.todayCheckin.energy] ?? '⚡'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-0.5">Today's check-in</p>
                  {checkin.todayCheckin.intention ? (
                    <p className="text-sm text-ink-700 dark:text-ink-200 truncate">"{checkin.todayCheckin.intention}"</p>
                  ) : (
                    <p className="text-sm text-ink-500 dark:text-ink-400">No intention set</p>
                  )}
                </div>
                <ChevronRight size={16} className="text-ink-400 flex-shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Sun size={18} className="text-yellow-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-100">Start your day</p>
                  <p className="text-xs text-ink-400">Log mood, energy &amp; set an intention</p>
                </div>
                <ChevronRight size={16} className="text-ink-400 flex-shrink-0" />
              </div>
            )}
          </Card>
        </motion.div>

        {/* Habits + Tasks */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/habits')} className="text-left">
            <Card className="p-4 h-full hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Habits</p>
                <ChevronRight size={13} className="text-ink-400" />
              </div>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100 leading-none">
                {checkedTodayCount}<span className="text-sm font-normal text-ink-400">/{habits.totalHabits}</span>
              </p>
              <p className="text-xs text-ink-400 mb-3 mt-0.5">done today</p>
              {habits.totalHabits > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {habits.habits.slice(0, 6).map(h => (
                    <MiniRing key={h.id} color={h.color}
                      progress={h.frequency === 'weekly' ? Math.min(habits.getWeeklyCount(h.id) / (h.weeklyTarget || 1), 1) : habits.isCheckedToday(h.id) ? 1 : 0} />
                  ))}
                </div>
              )}
            </Card>
          </button>

          <button onClick={() => navigate('/tasks')} className="text-left">
            <Card className="p-4 h-full hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Tasks</p>
                <ChevronRight size={13} className="text-ink-400" />
              </div>
              <p className="text-2xl font-bold text-ink-900 dark:text-ink-100 leading-none">
                {completedTaskCount}<span className="text-sm font-normal text-ink-400">/{totalTaskCount}</span>
              </p>
              <p className="text-xs text-ink-400 mb-3 mt-0.5">completed</p>
              <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                <div className="h-full rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${totalTaskCount > 0 ? (completedTaskCount / totalTaskCount) * 100 : 0}%` }} />
              </div>
              {tasks.todayTasks.slice(0, 2).map(t => (
                <p key={t.id} className="text-xs text-ink-500 dark:text-ink-400 mt-1.5 truncate">· {t.text}</p>
              ))}
              {totalTaskCount === 0 && <p className="text-xs text-ink-400 mt-1">No tasks today</p>}
            </Card>
          </button>
        </motion.div>

        {/* Brain Dump */}
        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <button className="w-full flex items-center justify-between mb-3" onClick={() => navigate('/dump')}>
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-ink-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Brain Dump</p>
                {dump.entries.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-ink-400">{dump.entries.length}</span>
                )}
              </div>
              <ChevronRight size={13} className="text-ink-400" />
            </button>
            <div className="flex gap-2">
              <input
                value={dumpText}
                onChange={e => setDumpText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickDump()}
                placeholder="What's on your mind? (Enter to save)"
                className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-sm text-ink-900 dark:text-ink-100 placeholder-ink-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
              <Button size="sm" onClick={handleQuickDump} disabled={!dumpText.trim()}>
                <Zap size={13} /> Dump
              </Button>
            </div>
            {dump.entries.length > 0 && (
              <p className="text-xs text-ink-400 mt-2 truncate">
                Last: {dump.entries[0].text.slice(0, 70)}{dump.entries[0].text.length > 70 ? '…' : ''}
              </p>
            )}
          </Card>
        </motion.div>

        {/* Timer */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors" onClick={() => navigate('/timer')}>
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">Focus Timer</p>
                <p className="text-3xl font-mono font-bold text-ink-900 dark:text-ink-100 tracking-tight leading-none">
                  {formatSeconds(timer.secondsLeft)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                    isRunning ? 'bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400'
                    : isPaused ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'bg-surface-100 dark:bg-surface-700 text-ink-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-success-500 animate-pulse' : isPaused ? 'bg-amber-500' : 'bg-ink-400'}`} />
                    {isRunning ? 'Running' : isPaused ? 'Paused' : 'Idle'}
                  </span>
                  {timer.sessionCount > 0 && (
                    <span className="text-xs text-ink-400">{timer.sessionCount} session{timer.sessionCount !== 1 ? 's' : ''} today</span>
                  )}
                </div>
              </div>
              {!isRunning && (
                <button onClick={e => { e.stopPropagation(); timer.start() }}
                  className="w-12 h-12 rounded-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 shadow-sm flex items-center justify-center transition-all flex-shrink-0">
                  <Play size={18} className="text-white ml-0.5" />
                </button>
              )}
              {isRunning && (
                <Button size="sm" variant="soft" onClick={e => { e.stopPropagation(); navigate('/timer') }}>View</Button>
              )}
            </div>
            {(isRunning || isPaused) && (
              <div className="mt-3 h-1 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                <div className="h-full rounded-full bg-primary-500 transition-all duration-1000"
                  style={{ width: `${(1 - timer.secondsLeft / (timer.settings.workDuration * 60)) * 100}%` }} />
              </div>
            )}
          </Card>
        </motion.div>

        {/* Monthly overview */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors" onClick={() => navigate('/monthly')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-ink-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">This Month</p>
              </div>
              <ChevronRight size={13} className="text-ink-400" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{monthHabitRate}%</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Habit avg</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{monthTasksDone}</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Tasks done</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{monthCheckins}</p>
                <p className="text-[10px] text-ink-400 mt-0.5">Check-ins</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Treatment Plan */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors" onClick={() => navigate('/treatment')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-ink-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Treatment Plan</p>
              </div>
              <ChevronRight size={13} className="text-ink-400" />
            </div>
            {activeGoals.length === 0 && activeMeds.length === 0 ? (
              <p className="text-sm text-ink-400">Track goals, medications and symptoms for your doctor</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{activeGoals.length}</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">Goals</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{activeMeds.length}</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">Medications</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{treatmentPlan.plan.symptoms.length}</p>
                  <p className="text-[10px] text-ink-400 mt-0.5">Symptoms</p>
                </div>
              </div>
            )}
            {topGoal && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-ink-600 dark:text-ink-300 truncate flex-1">{topGoal.text}</p>
                  <span className="text-xs text-primary-500 font-semibold ml-2 flex-shrink-0">{topGoal.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${topGoal.progress}%` }} />
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* XP */}
        <motion.div variants={itemVariants}>
          <Card className="p-4 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors" onClick={() => navigate('/rewards')}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-0.5">Level {rewards.currentLevel.level}</p>
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{rewards.currentLevel.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary-500">{rewards.totalPoints} XP</span>
                <ChevronRight size={14} className="text-ink-400" />
              </div>
            </div>
            <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500" style={{ width: `${xpProgress * 100}%` }} />
            </div>
            {rewards.nextLevel && (
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-ink-400">{rewards.xpInCurrentLevel} / {xpToNext} XP</span>
                <span className="text-xs text-ink-400">Next: {rewards.nextLevel.name}</span>
              </div>
            )}
            {!rewards.nextLevel && <p className="text-xs text-primary-500 mt-1.5 font-medium">Max level reached!</p>}
          </Card>
        </motion.div>

      </motion.div>
    </PageWrapper>
  )
}
