import { useState } from 'react'
import { Search, Clock, Globe, BadgeCheck, Calendar, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useProviders } from '../hooks/useProviders'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const SPECIALTIES = ['ADHD', 'Anxiety', 'Depression', 'OCD', 'PTSD', 'Autism Spectrum', 'Bipolar Disorder', 'Stress Management', 'Sleep Disorders', 'Trauma']

function ProviderCard({ provider, onBook }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-2xl flex-shrink-0">
          {provider.avatar || '🧠'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{provider.name}</p>
            <BadgeCheck size={14} className="text-primary-500 flex-shrink-0" />
          </div>
          <p className="text-xs text-ink-400 mt-0.5">{provider.type} · {provider.experience} yrs exp</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {(provider.specialties || []).slice(0, 3).map(s => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">{s}</span>
            ))}
            {(provider.specialties || []).length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-100 dark:bg-surface-700 text-ink-400">+{(provider.specialties || []).length - 3} more</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-ink-400 flex-wrap">
        {provider.availability && (
          <span className="flex items-center gap-1"><Clock size={10} /> {provider.availability}</span>
        )}
        {(provider.languages || []).length > 0 && (
          <span className="flex items-center gap-1"><Globe size={10} /> {provider.languages.join(', ')}</span>
        )}
      </div>

      {provider.bio && (
        <p className="mt-2 text-xs text-ink-400 line-clamp-2">{provider.bio}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-ink-900 dark:text-ink-100">${provider.sessionFee}</span>
          <span className="text-xs text-ink-400"> / session</span>
        </div>
        <Button size="sm" onClick={() => onBook(provider)}>
          <Calendar size={13} /> Book session
        </Button>
      </div>
    </Card>
  )
}

function BookingModal({ provider, open, onClose, bookAppointment, user, userProfile }) {
  const [date, setDate]         = useState('')
  const [timeSlot, setTimeSlot] = useState('morning')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  const handleBook = async () => {
    if (!date) return
    setLoading(true)
    try {
      await bookAppointment({
        providerUid:  provider.id,
        providerName: provider.name,
        patientUid:   user.uid,
        patientName:  userProfile?.profile?.displayName || user?.displayName || user?.email,
        patientEmail: user?.email,
        date,
        timeSlot,
        notes,
      })
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDone(false); setDate(''); setNotes(''); setTimeSlot('morning')
    onClose()
  }

  if (!provider) return null

  return (
    <Modal open={open} onClose={handleClose} title={`Book with ${provider.name}`}>
      {done ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-5xl">✅</p>
          <p className="font-semibold text-ink-900 dark:text-ink-100">Request sent!</p>
          <p className="text-sm text-ink-400">{provider.name} will confirm your appointment soon.</p>
          <Button className="w-full" onClick={handleClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Preferred date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-2">Preferred time</label>
            <div className="flex gap-2">
              {['morning', 'afternoon', 'evening'].map(t => (
                <button key={t} onClick={() => setTimeSlot(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors capitalize ${
                    timeSlot === t
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="What would you like to discuss?"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
          </div>
          <div className="px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900 text-xs text-ink-400">
            Session fee: <strong className="text-ink-700 dark:text-ink-300">${provider.sessionFee}</strong> · Payment arranged directly with the provider after confirmation.
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1" disabled={!date || loading} onClick={handleBook}>
              {loading ? 'Sending…' : 'Send Request'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function Connect() {
  const { providers, loading, bookAppointment } = useProviders()
  const { user }        = useAuth()
  const { userProfile } = useApp()
  const navigate        = useNavigate()
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [specFilter, setSpecFilter] = useState('')
  const [booking, setBooking]       = useState(null)

  const filtered = providers.filter(p => {
    if (typeFilter !== 'All' && p.type !== typeFilter) return false
    if (specFilter && !(p.specialties || []).includes(specFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) ||
             (p.specialties || []).some(s => s.toLowerCase().includes(q)) ||
             p.bio?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Connect</h1>
        <p className="text-sm text-ink-400 mt-0.5">Certified psychiatrists & psychologists, on demand</p>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or specialty…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-ink-900 dark:text-ink-100 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {['All', 'Psychiatrist', 'Psychologist'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-primary-500 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {['', ...SPECIALTIES].map((s, i) => (
          <button key={i} onClick={() => setSpecFilter(s === specFilter ? '' : s)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              specFilter === s && s !== ''
                ? 'bg-warm-400 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}>
            {s || 'All specialties'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">{providers.length === 0 ? '🌱' : '🔍'}</p>
          <p className="text-sm text-ink-400">
            {providers.length === 0
              ? 'No providers have joined yet — check back soon.'
              : 'No providers match your filters.'}
          </p>
          {providers.length > 0 && (
            <button onClick={() => { setSearch(''); setTypeFilter('All'); setSpecFilter('') }}
              className="mt-3 text-xs text-primary-500 hover:underline">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink-400">{filtered.length} provider{filtered.length !== 1 ? 's' : ''} available</p>
          <AnimatePresence>
            {filtered.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}>
                <ProviderCard provider={p} onBook={setBooking} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-10 p-4 rounded-2xl border border-dashed border-primary-200 dark:border-primary-700/40 bg-primary-50/50 dark:bg-primary-700/10">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 mb-1">Are you a psychiatrist or psychologist?</p>
        <p className="text-xs text-ink-400 mb-3">List your practice and connect with ADHD clients who need your expertise.</p>
        <Button variant="soft" size="sm" onClick={() => navigate('/provider/signup')}>
          Join as a provider →
        </Button>
      </div>

      <BookingModal
        provider={booking}
        open={!!booking}
        onClose={() => setBooking(null)}
        bookAppointment={bookAppointment}
        user={user}
        userProfile={userProfile}
      />
    </PageWrapper>
  )
}
