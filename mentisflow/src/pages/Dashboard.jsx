import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight, Sun, HeartHandshake, Zap, Brain, BarChart2, ClipboardList, Calendar, Video, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { useProviders } from '../hooks/useProviders'
import { useTreatmentPlan } from '../hooks/useTreatmentPlan'
import { formatDayHeader } from '../utils/dateUtils'

const MOOD_EMOJI   = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }

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
  const { habits, tasks, checkin, dump, timer, rewards, userId, awardAndToast, userProfile, tools } = useApp()
  const { getPatientAppointments, getProvider } = useProviders()
  const treatmentPlan = useTreatmentPlan(userId)
  const [dumpText, setDumpText] = useState('')
  const firstName = (userProfile?.profile?.displayName || '').trim().split(/\s+/)[0] || ''

  // Soonest upcoming appointment (for the "Next appointment" card).
  const [nextAppt, setNextAppt]   = useState(null)
  const [apptDoctor, setApptDoctor] = useState(null)
  useEffect(() => {
    if (!userId) return
    const today = new Date().toISOString().split('T')[0]
    getPatientAppointments(userId).then(async appts => {
      const upcoming = appts
        .filter(a => a.date >= today && ['pending', 'confirmed'].includes(a.status))
        .sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot))
      const next = upcoming[0] || null
      setNextAppt(next)
      if (next?.providerUid) setApptDoctor(await getProvider(next.providerUid))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const saveMood = (mood) => {
    const isFirst = !checkin.todayCheckin
    checkin.saveCheckin({ mood, energy: checkin.todayCheckin?.energy || 3, intention: checkin.todayCheckin?.intention || '' })
    if (isFirst) awardAndToast('DAILY_CHECKIN', 'Daily check-in complete!')
  }

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
      <div className="mb-6">
        <div className="flex items-center gap-2 text-faint text-xs mb-1.5">
          <Sun size={13} />
          <span className="font-medium">{formatDayHeader()}</span>
        </div>
        <h1 className="text-[1.7rem] font-bold tracking-tight text-ink leading-tight">
          {greeting()}{firstName ? `, ${firstName}` : ''} 👋
        </h1>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">

        {/* How are you feeling — inline daily mood */}
        {tools.isEnabled('checkin') && (
        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-faint">{greeting()}</p>
                <p className="text-sm font-bold text-ink">How are you feeling?</p>
              </div>
              <button onClick={() => navigate('/checkin')} title="Full check-in"
                className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-strong flex items-center justify-center transition-colors">
                <HeartHandshake size={15} className="text-white" />
              </button>
            </div>
            <div className="flex justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map(m => (
                <button key={m} onClick={() => saveMood(m)}
                  className={`flex-1 h-11 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 ${
                    checkin.todayCheckin?.mood === m
                      ? 'bg-accent-soft ring-2 ring-accent'
                      : 'bg-raised hover:bg-raised'
                  }`}>
                  {MOOD_EMOJI[m]}
                </button>
              ))}
            </div>
            {checkin.todayCheckin?.intention && (
              <p className="text-xs text-muted mt-2.5 italic truncate">“{checkin.todayCheckin.intention}”</p>
            )}
          </Card>
        </motion.div>
        )}

        {/* Next appointment, or a prompt to connect */}
        {nextAppt ? (
          <motion.div variants={itemVariants}>
            <Card interactive onClick={() => navigate('/connect')}
              className="p-4 border-accent/20 bg-accent-soft/50">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-accent-soft-text uppercase tracking-wide">Next appointment</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  nextAppt.status === 'confirmed'
                    ? 'bg-accent text-on-accent'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                }`}>
                  {nextAppt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                </span>
              </div>
              <p className="text-sm font-bold text-ink">{apptDoctor?.name || nextAppt.providerName || 'Your practitioner'}</p>
              <p className="text-xs text-faint mt-0.5 flex items-center gap-1 flex-wrap">
                {apptDoctor?.type && <span>{apptDoctor.type}</span>}
                <span className="flex items-center gap-1">
                  {apptDoctor?.consultationType === 'in-person'
                    ? <><MapPin size={10} /> {apptDoctor.city || 'In person'}</>
                    : <><Video size={10} /> Online</>}
                </span>
                <span className="flex items-center gap-1"><Calendar size={10} /> {nextAppt.date} · {nextAppt.timeSlot}</span>
              </p>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            <button
              onClick={() => navigate('/connect')}
              className="relative w-full text-left p-5 rounded-3xl bg-gradient-to-br from-accent to-accent-strong text-white shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 transition-shadow overflow-hidden"
            >
              <div className="absolute -top-10 -right-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HeartHandshake size={16} className="opacity-80" />
                    <p className="text-xs font-bold opacity-80 uppercase tracking-wider">MentisFlow Connect</p>
                  </div>
                  <p className="text-lg font-bold leading-snug mb-1">Find your practitioner</p>
                  <p className="text-sm opacity-80 leading-relaxed">
                    Book HPCSA-registered psychiatrists &amp; psychologists and share your wellness data.
                  </p>
                </div>
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <ChevronRight size={16} />
                </span>
              </div>
            </button>
          </motion.div>
        )}

        {/* FocusBlink section divider */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-px bg-line" />
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-accent" />
            <span className="text-xs font-semibold text-faint uppercase tracking-wider">FocusBlink</span>
          </div>
          <div className="flex-1 h-px bg-line" />
        </motion.div>

        {/* Habits + Tasks */}
        {(tools.isEnabled('habits') || tools.isEnabled('tasks')) && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          {tools.isEnabled('habits') && (
          <button onClick={() => navigate('/habits')} className="text-left">
            <Card interactive className="p-4 h-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">Habits</p>
                <ChevronRight size={13} className="text-faint" />
              </div>
              <p className="text-2xl font-bold text-ink leading-none">
                {checkedTodayCount}<span className="text-sm font-normal text-faint">/{habits.totalHabits}</span>
              </p>
              <p className="text-xs text-faint mb-3 mt-0.5">done today</p>
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
          )}

          {tools.isEnabled('tasks') && (
          <button onClick={() => navigate('/tasks')} className="text-left">
            <Card interactive className="p-4 h-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">Tasks</p>
                <ChevronRight size={13} className="text-faint" />
              </div>
              <p className="text-2xl font-bold text-ink leading-none">
                {completedTaskCount}<span className="text-sm font-normal text-faint">/{totalTaskCount}</span>
              </p>
              <p className="text-xs text-faint mb-3 mt-0.5">completed</p>
              <div className="h-1.5 rounded-full bg-raised overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${totalTaskCount > 0 ? (completedTaskCount / totalTaskCount) * 100 : 0}%` }} />
              </div>
              {tasks.todayTasks.slice(0, 2).map(t => (
                <p key={t.id} className="text-xs text-muted mt-1.5 truncate">· {t.text}</p>
              ))}
              {totalTaskCount === 0 && <p className="text-xs text-faint mt-1">No tasks today</p>}
            </Card>
          </button>
          )}
        </motion.div>
        )}

        {/* Brain Dump */}
        {tools.isEnabled('dump') && (
        <motion.div variants={itemVariants}>
          <Card className="p-4">
            <button className="w-full flex items-center justify-between mb-3" onClick={() => navigate('/dump')}>
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-faint" />
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">Brain Dump</p>
                {dump.entries.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-raised text-faint">{dump.entries.length}</span>
                )}
              </div>
              <ChevronRight size={13} className="text-faint" />
            </button>
            <div className="flex gap-2">
              <input
                value={dumpText}
                onChange={e => setDumpText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickDump()}
                placeholder="What’s on your mind? (Enter to save)"
                className="flex-1 px-3 py-2 rounded-xl border border-line bg-raised text-sm text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button size="sm" onClick={handleQuickDump} disabled={!dumpText.trim()}>
                <Zap size={13} /> Dump
              </Button>
            </div>
            {dump.entries.length > 0 && (
              <p className="text-xs text-faint mt-2 truncate">
                Last: {dump.entries[0].text.slice(0, 70)}{dump.entries[0].text.length > 70 ? '…' : ''}
              </p>
            )}
          </Card>
        </motion.div>
        )}

        {/* Timer */}
        {tools.isEnabled('timer') && (
        <motion.div variants={itemVariants}>
          <Card interactive className="p-4" onClick={() => navigate('/timer')}>
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-1">Focus Timer</p>
                <p className="text-3xl font-mono font-bold text-ink tracking-tight leading-none">
                  {formatSeconds(timer.secondsLeft)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                    isRunning ? 'bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400'
                    : isPaused ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : 'bg-raised text-muted'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-success-500 animate-pulse' : isPaused ? 'bg-amber-500' : 'bg-faint'}`} />
                    {isRunning ? 'Running' : isPaused ? 'Paused' : 'Idle'}
                  </span>
                  {timer.sessionCount > 0 && (
                    <span className="text-xs text-faint">{timer.sessionCount} session{timer.sessionCount !== 1 ? 's' : ''} today</span>
                  )}
                </div>
              </div>
              {!isRunning && (
                <button onClick={e => { e.stopPropagation(); timer.start() }}
                  className="w-12 h-12 rounded-full bg-accent hover:bg-accent-strong active:bg-accent-strong shadow-sm flex items-center justify-center transition-all flex-shrink-0">
                  <Play size={18} className="text-white ml-0.5" />
                </button>
              )}
              {isRunning && (
                <Button size="sm" variant="soft" onClick={e => { e.stopPropagation(); navigate('/timer') }}>View</Button>
              )}
            </div>
            {(isRunning || isPaused) && (
              <div className="mt-3 h-1 rounded-full bg-raised overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all duration-1000"
                  style={{ width: `${(1 - timer.secondsLeft / (timer.settings.workDuration * 60)) * 100}%` }} />
              </div>
            )}
          </Card>
        </motion.div>
        )}

        {/* Monthly overview */}
        {tools.isEnabled('monthly') && (
        <motion.div variants={itemVariants}>
          <Card interactive className="p-4" onClick={() => navigate('/monthly')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={15} className="text-faint" />
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">This Month</p>
              </div>
              <ChevronRight size={13} className="text-faint" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-ink">{monthHabitRate}%</p>
                <p className="text-[10px] text-faint mt-0.5">Habit avg</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{monthTasksDone}</p>
                <p className="text-[10px] text-faint mt-0.5">Tasks done</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{monthCheckins}</p>
                <p className="text-[10px] text-faint mt-0.5">Check-ins</p>
              </div>
            </div>
          </Card>
        </motion.div>
        )}

        {/* Treatment Plan */}
        <motion.div variants={itemVariants}>
          <Card interactive className="p-4" onClick={() => navigate('/treatment')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-faint" />
                <p className="text-xs font-semibold uppercase tracking-wider text-faint">Treatment Plan</p>
              </div>
              <ChevronRight size={13} className="text-faint" />
            </div>
            {activeGoals.length === 0 && activeMeds.length === 0 ? (
              <p className="text-sm text-faint">Track goals, medications and symptoms for your doctor</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-ink">{activeGoals.length}</p>
                  <p className="text-[10px] text-faint mt-0.5">Goals</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink">{activeMeds.length}</p>
                  <p className="text-[10px] text-faint mt-0.5">Medications</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink">{treatmentPlan.plan.symptoms.length}</p>
                  <p className="text-[10px] text-faint mt-0.5">Symptoms</p>
                </div>
              </div>
            )}
            {topGoal && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted truncate flex-1">{topGoal.text}</p>
                  <span className="text-xs text-accent font-semibold ml-2 flex-shrink-0">{topGoal.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-raised overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${topGoal.progress}%` }} />
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* XP */}
        {tools.isEnabled('rewards') && (
        <motion.div variants={itemVariants}>
          <Card interactive className="p-4" onClick={() => navigate('/rewards')}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-0.5">Level {rewards.currentLevel.level}</p>
                <p className="text-sm font-semibold text-ink">{rewards.currentLevel.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent">{rewards.totalPoints} XP</span>
                <ChevronRight size={14} className="text-faint" />
              </div>
            </div>
            <div className="h-2 rounded-full bg-raised overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-all duration-500" style={{ width: `${xpProgress * 100}%` }} />
            </div>
            {rewards.nextLevel && (
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-faint">{rewards.xpInCurrentLevel} / {xpToNext} XP</span>
                <span className="text-xs text-faint">Next: {rewards.nextLevel.name}</span>
              </div>
            )}
            {!rewards.nextLevel && <p className="text-xs text-accent mt-1.5 font-medium">Max level reached!</p>}
          </Card>
        </motion.div>
        )}

      </motion.div>
    </PageWrapper>
  )
}
