import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { CalendarPlus, Copy, Check, Link2Off, ExternalLink } from 'lucide-react'
import { db } from '../lib/firebase'
import { Button } from './ui/Button'
import { Skeleton } from './ui/Skeleton'

// Live calendar sync — a personal webcal/ICS feed served by the calendarFeed
// Cloud Function. Subscribing once in Google/Apple/Outlook keeps confirmed
// appointments up to date automatically; no OAuth, revocable any time by
// deleting the token. The token lives in owner-only calendarTokens/{uid}.
const FEED_BASE = `https://europe-west1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/calendarFeed`

const newToken = () =>
  [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('')

export function CalendarSync({ uid, showToast }) {
  const [token, setToken]     = useState(undefined) // undefined = loading, null = off
  const [busy, setBusy]       = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'calendarTokens', uid))
      .then(snap => setToken(snap.exists() ? snap.data().token : null))
      .catch(() => setToken(null))
  }, [uid])

  const httpsUrl  = token ? `${FEED_BASE}?uid=${uid}&token=${token}` : ''
  const webcalUrl = httpsUrl.replace(/^https:/, 'webcal:')

  const enable = async () => {
    setBusy(true)
    try {
      const t = newToken()
      await setDoc(doc(db, 'calendarTokens', uid), { token: t, createdAt: serverTimestamp() })
      setToken(t)
      showToast?.('Calendar sync enabled')
    } catch {
      showToast?.('Could not enable calendar sync. Try again.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await deleteDoc(doc(db, 'calendarTokens', uid))
      setToken(null)
      showToast?.('Calendar sync disabled — the old link no longer works')
    } catch {
      showToast?.('Could not disable calendar sync. Try again.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast?.('Could not copy — long-press the link to copy it manually.', { variant: 'error' })
    }
  }

  if (token === undefined) return <div className="px-4 py-3.5"><Skeleton className="h-14" /></div>

  if (!token) return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">Sync with your calendar</p>
        <p className="text-[11px] text-faint leading-relaxed mt-0.5">
          Subscribe once in Google, Apple, or Outlook Calendar — confirmed appointments then appear and stay up to date automatically.
        </p>
      </div>
      <Button size="sm" variant="soft" onClick={enable} disabled={busy}>
        <CalendarPlus size={13} /> Enable
      </Button>
    </div>
  )

  return (
    <div className="px-4 py-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Calendar sync is on</p>
          <p className="text-[11px] text-faint mt-0.5">Your personal feed link — treat it like a password.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={disable} disabled={busy} className="text-danger flex-shrink-0">
          <Link2Off size={13} /> Disable
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate text-[10px] text-muted bg-raised px-2.5 py-2">{httpsUrl}</code>
        <Button size="sm" variant="soft" onClick={copy} className="flex-shrink-0">
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 text-[11px]">
        <a href={webcalUrl}
          className="flex items-center gap-1.5 px-2.5 py-2 bg-raised text-muted hover:text-accent transition-colors">
          <ExternalLink size={11} className="flex-shrink-0" />
          <span><strong className="text-ink font-medium">Apple</strong> — opens Calendar and subscribes</span>
        </a>
        <a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-2 bg-raised text-muted hover:text-accent transition-colors">
          <ExternalLink size={11} className="flex-shrink-0" />
          <span><strong className="text-ink font-medium">Google</strong> — paste the copied link under “From URL”</span>
        </a>
        <a href="https://outlook.live.com/calendar/0/addcalendar" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-2 bg-raised text-muted hover:text-accent transition-colors">
          <ExternalLink size={11} className="flex-shrink-0" />
          <span><strong className="text-ink font-medium">Outlook</strong> — “Subscribe from web”, paste the link</span>
        </a>
      </div>
    </div>
  )
}
