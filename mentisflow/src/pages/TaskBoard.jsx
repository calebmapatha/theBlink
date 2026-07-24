import { useState, useRef, useEffect } from 'react'
import { Plus, Star, Trash2, ArrowUp, ArrowDown, CalendarDays, GripVertical, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { DatePicker } from '../components/ui/DatePicker'
import { Checkbox } from '../components/ui/Checkbox'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useApp } from '../context/AppContext'

function DueDateBadge({ dueDate }) {
  if (!dueDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T12:00:00')
  const label = format(due, 'MMM d')
  if (due < today) return <span className="text-xs px-1.5 py-0.5  text-danger bg-red-50 dark:bg-red-900/20">{label}</span>
  if (due.toDateString() === today.toDateString()) return <span className="text-xs px-1.5 py-0.5  text-amber-600 bg-amber-50 dark:bg-amber-900/20">{label}</span>
  return <span className="text-xs px-1.5 py-0.5  text-faint bg-raised">{label}</span>
}

function TaskItem({ task, onComplete, onDelete, onToggleUrgent, onMove, isToday, onDragStart, onDragOver, onDrop }) {
  const [leaving, setLeaving] = useState(false)
  const handleComplete = () => { setLeaving(true); setTimeout(() => onComplete(task.id), 300) }

  return (
    <motion.div layout draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: leaving ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 p-3.5  border transition-colors ${
        leaving
          ? 'bg-success-100/40 dark:bg-success-500/10 border-success-200 dark:border-success-500/20'
          : 'bg-surface border-line hover:border-faint'
      }`}>
      <GripVertical size={14} className="text-faint flex-shrink-0 cursor-grab active:cursor-grabbing" />
      <Checkbox checked={leaving} onChange={handleComplete} />
      <span className={`flex-1 text-sm ${leaving ? 'line-through text-faint' : 'text-ink'}`}>{task.text}</span>
      {task.urgent && <Badge variant="urgent">urgent</Badge>}
      <DueDateBadge dueDate={task.dueDate} />
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onToggleUrgent(task.id)}
          className={`focus-ring p-1.5  transition-colors ${task.urgent ? 'text-warm-500' : 'text-faint hover:text-warm-500'}`}>
          <Star size={14} fill={task.urgent ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => onMove(task.id)} className="focus-ring p-1.5  text-faint hover:text-accent transition-colors">
          {isToday ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
        </button>
        <button onClick={() => onDelete(task.id)} className="focus-ring p-1.5  text-faint hover:text-danger transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

function CompletedItem({ task, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3  opacity-50">
      <Checkbox checked onChange={() => {}} />
      <span className="flex-1 text-sm line-through text-faint">{task.text}</span>
      <button onClick={() => onDelete(task.id)} className="p-1  text-faint hover:text-danger"><Trash2 size={13} /></button>
    </div>
  )
}

export function TaskBoard() {
  const { tasks, awardAndToast, showToast } = useApp()
  const [input, setInput]           = useState('')
  const [urgent, setUrgent]         = useState(false)
  const [tab, setTab]               = useState('today')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dueDate, setDueDate]       = useState('')
  const inputRef = useRef(null)
  const dragId   = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleAdd = () => {
    if (!input.trim()) return
    tasks.addTask(input, urgent, dueDate || null)
    setInput(''); setUrgent(false); setDueDate(''); setShowDatePicker(false)
  }

  const handleComplete = (id) => {
    const task = tasks.tasks.find(t => t.id === id)
    tasks.completeTask(id)
    awardAndToast(task?.urgent ? 'URGENT_TASK' : 'TASK_COMPLETE', `Task done: "${task?.text?.slice(0, 30)}"`)
  }

  // Delete with an Undo toast instead of a permanent, silent removal.
  const handleDelete = (id) => {
    const index = tasks.tasks.findIndex(t => t.id === id)
    const task  = tasks.tasks[index]
    if (!task) return
    tasks.deleteTask(id)
    showToast('Task deleted', { variant: 'info', action: { label: 'Undo', onClick: () => tasks.restoreTask(task, index) } })
  }

  const currentTasks = tab === 'today' ? tasks.todayTasks : tasks.backlogTasks

  return (
    <PageWrapper>
      <PageHeader title="Tasks" subtitle="Capture, focus, finish" />

      <div className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5  border border-line bg-surface focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
            <Plus size={16} className="text-faint flex-shrink-0" />
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add a task... (Enter to save)"
              className="flex-1 bg-transparent text-sm text-ink placeholder-faint focus:outline-none" />
            <button onClick={() => setUrgent(u => !u)}
              className={`p-1  transition-colors ${urgent ? 'text-warm-500' : 'text-faint hover:text-warm-500'}`}>
              <Star size={15} fill={urgent ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => setShowDatePicker(v => !v)}
              className={`p-1  transition-colors ${showDatePicker || dueDate ? 'text-accent' : 'text-faint hover:text-accent'}`}>
              <CalendarDays size={15} />
            </button>
          </div>
          <Button onClick={handleAdd} disabled={!input.trim()}>Add</Button>
        </div>
        {showDatePicker && (
          <div className="mt-2">
            <DatePicker value={dueDate} onChange={setDueDate}
              min={new Date().toISOString().split('T')[0]}
              clearable placeholder="Due date (optional)" />
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-raised/60 ">
        {[
          { key: 'today',   label: `Today (${tasks.todayTasks.length})` },
          { key: 'backlog', label: `Backlog (${tasks.backlogTasks.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2  text-sm font-medium transition-all ${
              tab === key ? 'bg-surface dark:bg-line text-ink shadow-sm' : 'text-faint hover:text-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 group">
        <AnimatePresence mode="popLayout">
          {currentTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3  bg-raised flex items-center justify-center"><Sparkles size={22} className="text-faint" /></div>
              <p className="text-sm text-faint">{tab === 'today' ? 'Nothing here. Add a task above!' : 'Backlog is clear'}</p>
            </motion.div>
          ) : (
            currentTasks.map(task => (
              <TaskItem key={task.id} task={task}
                onComplete={handleComplete} onDelete={handleDelete}
                onToggleUrgent={tasks.toggleUrgent}
                onMove={tab === 'today' ? tasks.moveToBacklog : tasks.moveToToday}
                isToday={tab === 'today'}
                onDragStart={() => { dragId.current = task.id }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (dragId.current) tasks.reorderTask(dragId.current, task.id) }} />
            ))
          )}
        </AnimatePresence>
      </div>

      {tab === 'today' && tasks.completedToday.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-2">Completed today ({tasks.completedToday.length})</p>
          <div className="space-y-1">
            {tasks.completedToday.map(task => (
              <CompletedItem key={task.id} task={task} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
