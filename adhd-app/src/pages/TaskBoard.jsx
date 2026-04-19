import { useState, useRef, useEffect } from 'react'
import { Plus, Star, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Checkbox } from '../components/ui/Checkbox'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'

function TaskItem({ task, onComplete, onDelete, onToggleUrgent, onMove, isToday }) {
  const [leaving, setLeaving] = useState(false)

  const handleComplete = () => {
    setLeaving(true)
    setTimeout(() => onComplete(task.id), 300)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: leaving ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors
        ${leaving
          ? 'bg-success-100/40 dark:bg-success-500/10 border-success-200 dark:border-success-500/20'
          : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
        }`}
    >
      <Checkbox checked={leaving} onChange={handleComplete} />
      <span className={`flex-1 text-sm ${leaving ? 'line-through text-ink-400' : 'text-ink-900 dark:text-ink-100'}`}>
        {task.text}
      </span>
      {task.urgent && <Badge variant="urgent">urgent</Badge>}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleUrgent(task.id)}
          className={`p-1.5 rounded-lg transition-colors ${task.urgent ? 'text-warm-500' : 'text-ink-400 hover:text-warm-500'}`}
          title="Toggle urgent"
        >
          <Star size={14} fill={task.urgent ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onMove(task.id)}
          className="p-1.5 rounded-lg text-ink-400 hover:text-primary-500 transition-colors"
          title={isToday ? 'Move to backlog' : 'Move to today'}
        >
          {isToday ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

function CompletedItem({ task, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl opacity-50">
      <Checkbox checked onChange={() => {}} />
      <span className="flex-1 text-sm line-through text-ink-400">{task.text}</span>
      <button onClick={() => onDelete(task.id)} className="p-1 rounded text-ink-400 hover:text-red-400">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export function TaskBoard() {
  const { tasks, awardAndToast } = useApp()
  const [input, setInput] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [tab, setTab] = useState('today')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleAdd = () => {
    if (!input.trim()) return
    tasks.addTask(input, urgent)
    setInput('')
    setUrgent(false)
  }

  const handleComplete = (id) => {
    const task = tasks.tasks.find(t => t.id === id)
    tasks.completeTask(id)
    awardAndToast(task?.urgent ? 'URGENT_TASK' : 'TASK_COMPLETE', `Task done: "${task?.text?.slice(0, 30)}"`)
  }

  const currentTasks = tab === 'today' ? tasks.todayTasks : tasks.backlogTasks

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Tasks</h1>
        <p className="text-sm text-ink-400 mt-0.5">Capture · focus · finish</p>
      </div>

      {/* Quick add */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 transition-all">
          <Plus size={16} className="text-ink-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task... (Enter to save)"
            className="flex-1 bg-transparent text-sm text-ink-900 dark:text-ink-100 placeholder-ink-400 focus:outline-none"
          />
          <button
            onClick={() => setUrgent(u => !u)}
            className={`p-1 rounded transition-colors ${urgent ? 'text-warm-500' : 'text-ink-400 hover:text-warm-500'}`}
            title="Mark urgent"
          >
            <Star size={15} fill={urgent ? 'currentColor' : 'none'} />
          </button>
        </div>
        <Button onClick={handleAdd} disabled={!input.trim()}>Add</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-surface-100 dark:bg-surface-800/60 rounded-xl">
        {[
          { key: 'today',   label: `Today (${tasks.todayTasks.length})` },
          { key: 'backlog', label: `Backlog (${tasks.backlogTasks.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white dark:bg-surface-700 text-ink-900 dark:text-ink-100 shadow-sm'
                : 'text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2 group">
        <AnimatePresence mode="popLayout">
          {currentTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <p className="text-4xl mb-3">✨</p>
              <p className="text-sm text-ink-400">
                {tab === 'today' ? 'Nothing here — add a task above!' : 'Backlog is clear'}
              </p>
            </motion.div>
          ) : (
            currentTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={tasks.deleteTask}
                onToggleUrgent={tasks.toggleUrgent}
                onMove={tab === 'today' ? tasks.moveToBacklog : tasks.moveToToday}
                isToday={tab === 'today'}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Completed today */}
      {tab === 'today' && tasks.completedToday.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            Completed today ({tasks.completedToday.length})
          </p>
          <div className="space-y-1">
            {tasks.completedToday.map(task => (
              <CompletedItem key={task.id} task={task} onDelete={tasks.deleteTask} />
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
