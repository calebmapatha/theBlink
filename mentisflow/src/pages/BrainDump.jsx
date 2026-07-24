import { useState, useRef } from 'react'
import { Trash2, Zap, Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../context/AppContext'
import { formatRelative, formatTimestamp } from '../utils/dateUtils'

export function BrainDump() {
  const { dump, awardAndToast, showToast } = useApp()
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

  const handleDelete = (entry) => {
    dump.deleteEntry(entry.id)
    showToast('Note deleted', { variant: 'info', action: { label: 'Undo', onClick: () => dump.restoreEntry(entry) } })
  }

  return (
    <PageWrapper>
      <PageHeader title="Brain Dump" subtitle="Clear your head, get it out of your brain" />

      {/* Editor */}
      <div className="mb-8  border border-line bg-surface overflow-hidden focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Racing thoughts, ideas, worries, reminders... just dump it all here."
          rows={5}
          className="w-full px-4 pt-4 pb-2 bg-transparent text-sm text-ink placeholder-faint focus:outline-none resize-none"
          autoFocus
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-faint">
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
        <EmptyState icon={Brain} title="Your brain dump will appear here. Nothing to judge, just dump!" className="py-12" />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">
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
                className="group p-4  bg-surface border border-line"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-faint mb-2" title={formatTimestamp(entry.createdAt)}>
                      {formatRelative(entry.createdAt)}
                    </p>
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="focus-ring p-1.5  text-faint hover:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all flex-shrink-0"
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
