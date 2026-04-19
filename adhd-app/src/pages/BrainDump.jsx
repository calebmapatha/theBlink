import { useState, useRef } from 'react'
import { Trash2, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { formatRelative, formatTimestamp } from '../utils/dateUtils'

export function BrainDump() {
  const { dump, awardAndToast } = useApp()
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  const handleDump = () => {
    if (!text.trim()) return
    dump.addEntry(text)
    awardAndToast('BRAIN_DUMP', 'Thought captured!')
    setText('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleDump()
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Brain Dump</h1>
        <p className="text-sm text-ink-400 mt-0.5">Clear your head — get it out of your brain</p>
      </div>

      {/* Editor */}
      <div className="mb-8 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-hidden focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Racing thoughts, ideas, worries, reminders... just dump it all here."
          rows={5}
          className="w-full px-4 pt-4 pb-2 bg-transparent text-sm text-ink-900 dark:text-ink-100 placeholder-ink-400 focus:outline-none resize-none"
          autoFocus
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-ink-400">
            {text.length > 0 && `${text.length} chars · `}
            Cmd+Enter to dump
          </span>
          <Button onClick={handleDump} disabled={!text.trim()} size="sm">
            <Zap size={13} />
            Dump it
          </Button>
        </div>
      </div>

      {/* Entries */}
      {dump.entries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-sm text-ink-400">Your brain dump will appear here. Nothing to judge here — just dump!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            {dump.entries.length} entries
          </p>
          <AnimatePresence>
            {dump.entries.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="group p-4 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-400 mb-2" title={formatTimestamp(entry.createdAt)}>
                      {formatRelative(entry.createdAt)}
                    </p>
                    <p className="text-sm text-ink-900 dark:text-ink-100 whitespace-pre-wrap leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                  <button
                    onClick={() => dump.deleteEntry(entry.id)}
                    className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageWrapper>
  )
}
