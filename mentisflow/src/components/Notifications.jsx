import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck, XCircle, BadgeCheck, ShieldAlert, Inbox } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useApp } from '../context/AppContext'
import { useInbox } from '../hooks/useInbox'
import { formatRelative } from '../utils/dateUtils'

const ICONS = {
  booking_requested: CalendarCheck,
  booking_confirmed: CalendarCheck,
  booking_cancelled: XCircle,
  account_verified:  BadgeCheck,
  account_rejected:  ShieldAlert,
  account_suspended: ShieldAlert,
}

// Notification createdAt is a Firestore Timestamp; formatRelative wants an ISO
// string. Convert defensively.
const toIso = (ts) => {
  try { return ts?.toDate ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString()) }
  catch { return new Date().toISOString() }
}

export function Notifications() {
  const { userId } = useApp()
  const { items, unreadCount, markRead, markAllRead } = useInbox(userId)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Snapshot which items were unread when the panel opened, so the highlight
  // stays while we clear the badge in the background.
  const [seenUnread, setSeenUnread] = useState(new Set())
  useEffect(() => {
    if (!open) return
    setSeenUnread(new Set(items.filter(i => !i.read).map(i => i.id)))
    markAllRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClick = (n) => {
    markRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-end px-4 sm:px-6 h-11 bg-bg/85 backdrop-blur-sm">
        <button onClick={() => setOpen(true)} aria-label="Notifications"
          className="relative p-2 rounded-xl text-muted hover:bg-raised transition-colors">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
        {items.length === 0 ? (
          <div className="py-10 text-center">
            <Inbox size={30} className="text-faint mx-auto mb-3 opacity-50" />
            <p className="text-sm text-faint">You're all caught up. Updates about your appointments and account will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(n => {
              const Icon = ICONS[n.type] || Bell
              const wasUnread = seenUnread.has(n.id)
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left flex gap-3 p-3 rounded-2xl border transition-colors ${
                    wasUnread
                      ? 'bg-accent-soft/60 border-accent/20'
                      : 'bg-surface border-line'
                  }`}>
                  <div className="w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-accent-soft-text" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      {wasUnread && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-faint mt-1">{formatRelative(toIso(n.createdAt))}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Modal>
    </>
  )
}
