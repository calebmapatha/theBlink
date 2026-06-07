import { useState, useEffect, useMemo } from 'react'
import { Search, Clock, Globe, BadgeCheck, Calendar, X, HeartHandshake, Link2, Unlink, Check } from 'lucide-react'
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

const DATA_TYPES = [
  { id: 'habits',  label: 'Habit streaks',  emoji: '🔄' },
  { id: 'checkin', label: 'Mood & energy',   emoji: '😊' },
  { id: 'focus',   label: 'Focus sessions',  emoji: '⏱️' },
  { id: 'tasks',   label: 'Task completion', emoji: '✅' },
]

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function ProviderCard({ provider, onBook, onLink, linked }) {
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
          {provider.hpcsa && <p className="text-xs text-ink-400">HPCSA: {provider.hpcsa}</p>}
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

      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          <span className="text-sm font-bold text-ink-900 dark:text-ink-100">R{provider.sessionFee}</span>
          <span className="text-xs text-ink-400"> / session</span>
        </div>
        <div className="flex gap-2">
          {onLink && !linked && (
            <Button size="sm" variant="ghost" onClick={() => onLink(provider)}>
              <Link2 size={13} /> Link
            </Button>
          )}
          {linked && (
            <span className="text-xs px-2 py-1 rounded-full bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 font-medium">Linked</span>
          )}
          <Button size="sm" onClick={() => onBook(provider)}>
            <Calendar size={13} /> Book
          </Button>
        </div>
      </div>
    </Card>
  )
}

function BookingModal({ provider, open, onClose, bookAppointment, user, userProfile, getDiary }) {
  const [date, setDate]               = useState('')
  const [timeSlot, setTimeSlot]       = useState(null)
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)
  const [diary, setDiary]             = useState({})
  const [diaryLoading, setDiaryLoading] = useState(false)
  const [sharedTypes, setSharedTypes] = useState([])

  useEffect(() => {
    if (!provider || !open) return
    setDiaryLoading(true)
    getDiary(provider.id).then(d => {
      setDiary(d || {})
      setDiaryLoading(false)
    })
  }, [provider?.id, open])

  const availableSlots = useMemo(() => {
    if (!date) return []
    const dayKey = DAY_KEYS[new Date(date + 'T12:00:00').getDay()]
    return (diary[dayKey] || []).slice().sort()
  }, [date, diary])

  const toggleType = (id) =>
    setSharedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const handleBook = async () => {
    if (!date || !timeSlot) return
    setLoading(true)
    try {
      await bookAppointment({
        providerUid:     provider.id,
        providerName:    provider.name,
        patientUid:      user.uid,
        patientName:     userProfile?.profile?.displayName || user?.displayName || user?.email,
        patientEmail:    user?.email,
        date,
        timeSlot,
        notes,
        sharedDataTypes: sharedTypes,
      })
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDone(false); setDate(''); setNotes(''); setTimeSlot(null); setSharedTypes([])
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
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setTimeSlot(null) }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>

          {date && (
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-2">Available slots</label>
              {diaryLoading ? (
                <p className="text-xs text-ink-400">Loading slots…</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-ink-400 bg-surface-50 dark:bg-surface-900 px-3 py-2 rounded-xl">
                  No slots available for this day — try another date or contact the provider directly.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map(slot => (
                    <button key={slot} onClick={() => setTimeSlot(slot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        timeSlot === slot
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                          : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                      }`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="What would you like to discuss?"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-400 mb-2">Share app data with doctor (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              {DATA_TYPES.map(t => (
                <button key={t.id} onClick={() => toggleType(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border transition-colors ${
                    sharedTypes.includes(t.id)
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                      : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                  }`}>
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                  {sharedTypes.includes(t.id) && <Check size={10} className="ml-auto text-primary-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
            {sharedTypes.length > 0 && (
              <p className="text-[10px] text-ink-400 mt-1.5">
                Your selected data will be visible to {provider.name} before the session.
              </p>
            )}
          </div>

          <div className="px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900 text-xs text-ink-400">
            Session fee: <strong className="text-ink-700 dark:text-ink-300">R{provider.sessionFee}</strong> · Payment arranged directly with the provider after confirmation.
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button className="flex-1" disabled={!date || !timeSlot || loading} onClick={handleBook}>
              {loading ? 'Sending…' : 'Send Request'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function Connect() {
  const {
    providers, loading, bookAppointment,
    getDiary, linkDoctor, getLinkedDoctor, unlinkDoctor,
    searchProviderByHPCSA, getPatientAppointments,
  } = useProviders()
  const { user }        = useAuth()
  const { userProfile } = useApp()
  const navigate        = useNavigate()

  const [tab, setTab]               = useState('find')
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [specFilter, setSpecFilter] = useState('')
  const [booking, setBooking]       = useState(null)

  const [linkedDoctor, setLinkedDoctor]     = useState(undefined)
  const [linkLoading, setLinkLoading]       = useState(true)
  const [hpcsaQuery, setHpcsaQuery]         = useState('')
  const [searchResult, setSearchResult]     = useState(null)
  const [searchError, setSearchError]       = useState('')
  const [myAppointments, setMyAppointments] = useState([])

  useEffect(() => {
    if (!user) return
    Promise.all([
      getLinkedDoctor(user.uid),
      getPatientAppointments(user.uid),
    ]).then(([doc, appts]) => {
      setLinkedDoctor(doc || null)
      setMyAppointments(appts.sort((a, b) => (a.date > b.date ? 1 : -1)))
      setLinkLoading(false)
    })
  }, [user])

  const handleHpcsaSearch = async () => {
    setSearchError('')
    setSearchResult(null)
    const q = hpcsaQuery.trim()
    if (!q) return
    let result = null
    if (/^(MP|PS)\d+/i.test(q)) {
      result = await searchProviderByHPCSA(q.toUpperCase())
    } else {
      result = providers.find(p => p.name?.toLowerCase().includes(q.toLowerCase())) || null
    }
    if (!result) setSearchError('No provider found with that HPCSA number or name.')
    else setSearchResult(result)
  }

  const handleLink = async (provider) => {
    await linkDoctor(user.uid, provider.id)
    setLinkedDoctor(provider)
    setSearchResult(null)
    setHpcsaQuery('')
  }

  const handleUnlink = async () => {
    await unlinkDoctor(user.uid)
    setLinkedDoctor(null)
  }

  const filtered = providers.filter(p => {
    if (typeFilter !== 'All' && p.type !== typeFilter) return false
    if (specFilter && !(p.specialties || []).includes(specFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) ||
             (p.specialties || []).some(s => s.toLowerCase().includes(q)) ||
             p.bio?.toLowerCase().includes(q) ||
             p.hpcsa?.toLowerCase().includes(q)
    }
    return true
  })

  const upcomingAppts = myAppointments.filter(a => a.status !== 'cancelled')

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="flex items-center gap-2 mb-1">
          <HeartHandshake size={16} className="opacity-80" />
          <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Mental Health Journey</p>
        </div>
        <h1 className="text-xl font-semibold mb-0.5">You deserve support</h1>
        <p className="text-sm opacity-80">Certified HPCSA-registered psychiatrists &amp; psychologists, available online.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'find',      label: 'Find a Doctor' },
          { key: 'my-doctor', label: 'My Doctor' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary-500 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Find a Doctor tab */}
      {tab === 'find' && (
        <>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, HPCSA number or specialty…"
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
                    <ProviderCard
                      provider={p}
                      onBook={setBooking}
                      onLink={handleLink}
                      linked={linkedDoctor?.id === p.id}
                    />
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
        </>
      )}

      {/* My Doctor tab */}
      {tab === 'my-doctor' && (
        <div className="space-y-5">
          {linkLoading ? (
            <div className="h-28 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
          ) : linkedDoctor ? (
            <>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-2xl flex-shrink-0">
                    {linkedDoctor.avatar || '🧠'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{linkedDoctor.name}</p>
                      <BadgeCheck size={14} className="text-primary-500" />
                    </div>
                    <p className="text-xs text-ink-400">{linkedDoctor.type} · {linkedDoctor.experience} yrs exp</p>
                    {linkedDoctor.hpcsa && <p className="text-xs text-ink-400">HPCSA: {linkedDoctor.hpcsa}</p>}
                    {linkedDoctor.availability && (
                      <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {linkedDoctor.availability}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" size="sm" onClick={() => setBooking(linkedDoctor)}>
                    <Calendar size={13} /> Book session
                  </Button>
                  <button onClick={handleUnlink}
                    className="px-3 py-1.5 rounded-xl text-xs text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-surface-200 dark:border-surface-700 transition-colors flex items-center gap-1.5">
                    <Unlink size={12} /> Unlink
                  </button>
                </div>
              </Card>

              {upcomingAppts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Upcoming appointments</p>
                  <div className="space-y-2">
                    {upcomingAppts.map(a => (
                      <Card key={a.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{a.date} at {a.timeSlot}</p>
                            {a.sharedDataTypes?.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {a.sharedDataTypes.map(t => {
                                  const dt = DATA_TYPES.find(d => d.id === t)
                                  return dt ? (
                                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400">
                                      {dt.emoji} {dt.label}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                            a.status === 'confirmed' ? 'bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400'
                            : a.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-surface-100 dark:bg-surface-700 text-ink-400'
                          }`}>{a.status}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {upcomingAppts.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-3xl mb-2">📅</p>
                  <p className="text-sm text-ink-400">No upcoming appointments.</p>
                  <p className="text-xs text-ink-400 mt-1">Book a session with {linkedDoctor.name} to get started.</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <Card className="p-5 mb-5">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 mb-1">Link your existing doctor</p>
                <p className="text-xs text-ink-400 mb-4">
                  Enter your doctor's HPCSA practice number (e.g. MP0123456) or their name to find and link them.
                </p>
                <div className="flex gap-2">
                  <input value={hpcsaQuery} onChange={e => setHpcsaQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleHpcsaSearch()}
                    placeholder="HPCSA number or doctor's name"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  <Button size="sm" onClick={handleHpcsaSearch}>Search</Button>
                </div>
                {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
                {searchResult && (
                  <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{searchResult.avatar || '🧠'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{searchResult.name}</p>
                          <BadgeCheck size={12} className="text-primary-500" />
                        </div>
                        <p className="text-xs text-ink-400">{searchResult.type} · HPCSA: {searchResult.hpcsa}</p>
                      </div>
                      <Button size="sm" onClick={() => handleLink(searchResult)}>
                        <Link2 size={12} /> Link
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <p className="text-xs text-ink-400 mb-3">Or link a doctor from the directory:</p>
              <div className="space-y-3">
                {loading ? (
                  [1, 2].map(i => <div key={i} className="h-36 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)
                ) : providers.slice(0, 5).map(p => (
                  <ProviderCard key={p.id} provider={p} onBook={setBooking} onLink={handleLink} linked={false} />
                ))}
                {!loading && providers.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-3xl mb-2">🌱</p>
                    <p className="text-sm text-ink-400">No providers yet — check back soon.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <BookingModal
        provider={booking}
        open={!!booking}
        onClose={() => setBooking(null)}
        bookAppointment={bookAppointment}
        user={user}
        userProfile={userProfile}
        getDiary={getDiary}
      />
    </PageWrapper>
  )
}
