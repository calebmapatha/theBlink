import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, Stethoscope, Flag, Megaphone, ScrollText, Settings2,
  CheckCircle, XCircle, Ban, RotateCcw, Trash2, Download, Search, BadgeCheck,
  TrendingUp, Loader, ExternalLink,
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../hooks/useAdmin'
import { isAdminUser, exportCSV } from '../utils/admin'
import { DEFAULT_PRICING, fetchPricing, mergePricing } from '../utils/pricing'
import { BarChart, LineChart } from '../components/ui/charts'
import { isSession } from '../utils/providerStats'

const TABS = [
  { key: 'overview',  label: 'Overview',  icon: TrendingUp },
  { key: 'doctors',   label: 'Doctors',   icon: Stethoscope },
  { key: 'patients',  label: 'Patients',  icon: Users },
  { key: 'reports',   label: 'Reports',   icon: Flag },
  { key: 'announce',  label: 'Announce',  icon: Megaphone },
  { key: 'logs',      label: 'Audit log', icon: ScrollText },
  { key: 'config',    label: 'Settings',  icon: Settings2 },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function providerState(p) {
  if (p.suspended) return { label: 'Suspended', cls: 'bg-red-50 dark:bg-red-500/10 text-red-500' }
  if (p.approvalStatus === 'pending') return { label: 'Pending approval', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' }
  if (p.approvalStatus === 'rejected') return { label: 'Rejected', cls: 'bg-red-50 dark:bg-red-500/10 text-red-500' }
  if (p.subscriptionStatus === 'trial_expired') return { label: 'Trial ended', cls: 'bg-surface-100 dark:bg-surface-700 text-ink-400' }
  if (!p.subscriptionActive) return { label: 'Inactive', cls: 'bg-surface-100 dark:bg-surface-700 text-ink-400' }
  if (p.subscriptionStatus === 'trialing') return { label: 'Trial', cls: 'bg-primary-50 dark:bg-primary-700/15 text-primary-600 dark:text-primary-400' }
  return { label: 'Live', cls: 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400' }
}

function ReasonModal({ open, onClose, title, cta, onConfirm }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    await onConfirm(reason)
    setBusy(false)
    setReason('')
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="Reason (recorded in the audit log)"
          className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600" disabled={busy} onClick={submit}>
            {busy ? <Loader size={13} className="animate-spin" /> : cta}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function StatTile({ label, value, sub }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] text-ink-400">{label}</p>
      <p className="text-xl font-bold text-ink-900 dark:text-ink-100 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-ink-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

export function AdminPortal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const admin    = useAdmin()

  const [tab, setTab]               = useState('overview')
  const [providers, setProviders]   = useState([])
  const [patients, setPatients]     = useState([])
  const [appts, setAppts]           = useState([])
  const [reports, setReports]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [searchQ, setSearchQ]       = useState('')
  const [modal, setModal]           = useState(null) // { type, provider }
  const [pricing, setPricing]       = useState(DEFAULT_PRICING)

  useEffect(() => { fetchPricing().then(setPricing) }, [])

  const authorized = isAdminUser(user)

  const reload = useCallback(async () => {
    setLoading(true)
    const [prov, pats, ap, rep] = await Promise.all([
      admin.fetchAllProviders(),
      admin.fetchAllPatients().catch(() => []),
      admin.fetchAllAppointments().catch(() => []),
      admin.fetchReports().catch(() => []),
    ])
    setProviders(prov)
    setPatients(pats)
    setAppts(ap)
    setReports(rep)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authorized) { navigate('/', { replace: true }); return }
    reload()
  }, [authorized])

  // ---------- derived platform stats ----------
  const stats = useMemo(() => {
    const feeByProvider = Object.fromEntries(providers.map(p => [p.id, Number(p.sessionFee) || 0]))
    const sessions = appts.filter(isSession)
    const gross = sessions.reduce((s, a) => s + (feeByProvider[a.providerUid] || 0), 0)
    const completed = appts.filter(a => a.status === 'completed').length
    const past = appts.filter(a => a.date && a.date < new Date().toISOString().split('T')[0])
    const completionRate = past.length > 0
      ? Math.round((past.filter(a => ['completed', 'confirmed'].includes(a.status)).length / past.length) * 100)
      : null

    // bookings by month (last 12)
    const now = new Date()
    const byMonth = []
    for (let i = 11; i >= 0; i--) {
      const s = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const cnt = appts.filter(a => {
        if (!a.date) return false
        const [y, m, d] = a.date.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        return dt >= s && dt < e
      }).length
      byMonth.push({ label: MONTHS[s.getMonth()], value: cnt })
    }

    return {
      doctors:    providers.length,
      live:       providers.filter(p => p.subscriptionActive && !p.suspended && p.approvalStatus !== 'pending' && p.approvalStatus !== 'rejected').length,
      pendingDocs: providers.filter(p => p.approvalStatus === 'pending').length,
      suspended:  providers.filter(p => p.suspended).length,
      patients:   patients.length,
      bookings:   appts.length,
      sessions:   sessions.length,
      completed,
      completionRate,
      gross,
      trials:     providers.filter(p => p.subscriptionStatus === 'trialing').length,
      // Estimated MRR from paying (non-trial) active subscriptions.
      mrr: providers
        .filter(p => p.subscriptionActive && !p.suspended && p.subscriptionStatus !== 'trialing')
        .reduce((s, p) => s + (p.subscriptionPlan === 'featured'
          ? pricing.plans.featured.monthly
          : pricing.plans.standard.monthly), 0),
      byMonth,
      openReports: reports.filter(r => r.status === 'open').length,
    }
  }, [providers, patients, appts, reports, pricing])

  const filteredProviders = useMemo(() => {
    const q = searchQ.toLowerCase()
    const list = !q ? providers : providers.filter(p =>
      p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.hpcsa?.toLowerCase().includes(q))
    // pending first, then live, then rest
    const rank = (p) => p.approvalStatus === 'pending' ? 0 : p.suspended ? 2 : 1
    return [...list].sort((a, b) => rank(a) - rank(b))
  }, [providers, searchQ])

  if (!authorized) return null

  const act = async (fn, ...args) => { await fn(...args); await reload() }

  return (
    <PageWrapper>
      <div className="mb-5 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-ink-900 dark:bg-ink-100 flex items-center justify-center">
          <Shield size={17} className="text-white dark:text-ink-900" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Super Admin</h1>
          <p className="text-xs text-ink-400">Platform control centre</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-ink-900 dark:bg-ink-100 text-white dark:text-ink-900'
                            : 'bg-surface-100 dark:bg-surface-800 text-ink-400 hover:text-ink-700 dark:hover:text-ink-100'
            }`}>
            <t.icon size={13} /> {t.label}
            {t.key === 'doctors' && stats.pendingDocs > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{stats.pendingDocs}</span>
            )}
            {t.key === 'reports' && stats.openReports > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{stats.openReports}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
      ) : (
        <>
          {/* ---------------- OVERVIEW ---------------- */}
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatTile label="Doctors" value={stats.doctors} sub={`${stats.live} live · ${stats.pendingDocs} pending`} />
                <StatTile label="Patients" value={stats.patients} />
                <StatTile label="Bookings" value={stats.bookings} sub={`${stats.sessions} sessions`} />
                <StatTile label="Completion" value={stats.completionRate !== null ? `${stats.completionRate}%` : 'N/A'} sub="past appointments" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <StatTile label="Gross booking value" value={`R${stats.gross.toLocaleString()}`} sub="all sessions · doctors keep 100%" />
                <StatTile label="Est. subscription MRR" value={`R${stats.mrr.toLocaleString()}`} sub={`${stats.trials} on free trial`} />
              </div>
              <Card className="p-4 mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Bookings: last 12 months</p>
                <BarChart data={stats.byMonth} />
              </Card>
              <div className="flex gap-2">
                <Button variant="soft" size="sm" onClick={() => exportCSV(
                  appts.map(a => ({ id: a.id, date: a.date, time: a.timeSlot, status: a.status, provider: a.providerName, patient: a.patientName })),
                  'mentisflow-appointments.csv')}>
                  <Download size={13} /> Export bookings CSV
                </Button>
                <Button variant="soft" size="sm" onClick={() => exportCSV(
                  providers.map(p => ({ id: p.id, name: p.name, email: p.email, hpcsa: p.hpcsa, type: p.type, fee: p.sessionFee, status: providerState(p).label, views: p.profileViews || 0, rating: p.ratingAvg?.overall || '' })),
                  'mentisflow-doctors.csv')}>
                  <Download size={13} /> Export doctors CSV
                </Button>
              </div>
            </>
          )}

          {/* ---------------- DOCTORS ---------------- */}
          {tab === 'doctors' && (
            <>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search name, email or HPCSA…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div className="space-y-3">
                {filteredProviders.map(p => {
                  const st = providerState(p)
                  return (
                    <Card key={p.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-xl">
                          {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : (p.avatar || '🧠')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{p.name}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${st.cls}`}>{st.label}</span>
                          </div>
                          <p className="text-[11px] text-ink-400">{p.type} · {p.email}</p>
                          {p.hpcsa && (
                            <p className="text-[11px] text-ink-400 flex items-center gap-1">
                              HPCSA: {p.hpcsa}
                              <a href={`https://hpcsaonline.custhelp.com/app/i_reg_form`} target="_blank" rel="noopener noreferrer"
                                className="text-primary-500 hover:underline flex items-center gap-0.5">
                                verify <ExternalLink size={9} />
                              </a>
                            </p>
                          )}
                          <p className="text-[10px] text-ink-400 mt-0.5">
                            R{p.sessionFee}/session · {p.profileViews || 0} views
                            {p.ratingCount > 0 && ` · ★ ${p.ratingAvg?.overall?.toFixed(1)} (${p.ratingCount})`}
                          </p>
                          {p.suspensionReason && <p className="text-[10px] text-red-400 mt-0.5">Suspended: {p.suspensionReason}</p>}
                          {p.rejectionReason && <p className="text-[10px] text-red-400 mt-0.5">Rejected: {p.rejectionReason}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                        {p.approvalStatus === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => act(admin.approveProvider, p.id, p.name)}>
                              <CheckCircle size={12} /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setModal({ type: 'reject', provider: p })}>
                              <XCircle size={12} /> Reject
                            </Button>
                          </>
                        )}
                        {p.approvalStatus === 'rejected' && (
                          <Button size="sm" onClick={() => act(admin.approveProvider, p.id, p.name)}>
                            <CheckCircle size={12} /> Approve anyway
                          </Button>
                        )}
                        {!p.suspended && p.approvalStatus !== 'pending' && (
                          <Button size="sm" variant="ghost" onClick={() => setModal({ type: 'suspend', provider: p })}>
                            <Ban size={12} /> Suspend
                          </Button>
                        )}
                        {p.suspended && (
                          <Button size="sm" variant="soft" onClick={() => act(admin.reactivateProvider, p.id, p.name)}>
                            <RotateCcw size={12} /> Reactivate
                          </Button>
                        )}
                        <button onClick={() => setModal({ type: 'delete', provider: p })}
                          className="ml-auto p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete account">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Card>
                  )
                })}
                {filteredProviders.length === 0 && <p className="text-sm text-ink-400 text-center py-8">No doctors found.</p>}
              </div>
            </>
          )}

          {/* ---------------- PATIENTS ---------------- */}
          {tab === 'patients' && (
            <div className="space-y-3">
              <p className="text-xs text-ink-400">{patients.length} patient record{patients.length !== 1 ? 's' : ''} (created when patients link a doctor, book, or upload a photo)</p>
              {patients.map(p => {
                const linked = providers.find(pr => pr.id === p.linkedDoctorUid)
                const patAppts = appts.filter(a => a.patientUid === p.id)
                return (
                  <Card key={p.id} className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100 dark:bg-primary-700/20 flex items-center justify-center text-lg">
                        {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : '🙂'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-ink-600 dark:text-ink-300 truncate">{p.id}</p>
                        <p className="text-[10px] text-ink-400">
                          {linked ? `Linked: ${linked.name}` : 'No linked doctor'} · {patAppts.length} booking{patAppts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button onClick={() => setModal({ type: 'deletePatient', patient: p })}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                )
              })}
              {patients.length === 0 && <p className="text-sm text-ink-400 text-center py-8">No patient records yet.</p>}
            </div>
          )}

          {/* ---------------- REPORTS ---------------- */}
          {tab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 && <p className="text-sm text-ink-400 text-center py-8">No reports filed. 🎉</p>}
              {[...reports].sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1)).map(r => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag size={13} className={r.status === 'open' ? 'text-red-500' : 'text-ink-400'} />
                    <p className="text-sm font-semibold text-ink-900 dark:text-ink-100 flex-1">{r.providerName || r.providerUid}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                      r.status === 'open' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-600 dark:text-ink-300 bg-surface-50 dark:bg-surface-900 px-3 py-2 rounded-xl">"{r.reason}"</p>
                  <p className="text-[10px] text-ink-400 mt-1.5">Reported by {r.reporterEmail || r.reporterUid}</p>
                  {r.resolution && <p className="text-[10px] text-ink-400 mt-0.5">Resolution: {r.resolution}</p>}
                  {r.status === 'open' && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="soft" onClick={() => act(admin.resolveReport, r.id, 'dismissed, no action')}>Dismiss</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        const prov = providers.find(p => p.id === r.providerUid)
                        if (prov) setModal({ type: 'suspend', provider: prov, reportId: r.id })
                      }}>
                        <Ban size={12} /> Suspend doctor
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* ---------------- ANNOUNCEMENTS ---------------- */}
          {tab === 'announce' && <AnnouncementsTab admin={admin} />}

          {/* ---------------- AUDIT LOG ---------------- */}
          {tab === 'logs' && <LogsTab admin={admin} />}

          {/* ---------------- CONFIG ---------------- */}
          {tab === 'config' && <ConfigTab admin={admin} />}
        </>
      )}

      {/* Action modals */}
      <ReasonModal
        open={modal?.type === 'reject'} onClose={() => setModal(null)}
        title={`Reject ${modal?.provider?.name}`} cta="Reject application"
        onConfirm={async (reason) => act(admin.rejectProvider, modal.provider.id, modal.provider.name, reason)} />
      <ReasonModal
        open={modal?.type === 'suspend'} onClose={() => setModal(null)}
        title={`Suspend ${modal?.provider?.name}`} cta="Suspend account"
        onConfirm={async (reason) => {
          await admin.suspendProvider(modal.provider.id, modal.provider.name, reason)
          if (modal.reportId) await admin.resolveReport(modal.reportId, `provider suspended: ${reason}`)
          await reload()
        }} />
      <ReasonModal
        open={modal?.type === 'delete'} onClose={() => setModal(null)}
        title={`Permanently delete ${modal?.provider?.name}?`} cta="Delete forever"
        onConfirm={async () => act(admin.deleteProvider, modal.provider.id, modal.provider.name)} />
      <ReasonModal
        open={modal?.type === 'deletePatient'} onClose={() => setModal(null)}
        title="Delete patient record?" cta="Delete record"
        onConfirm={async () => act(admin.deletePatient, modal.patient.id)} />
    </PageWrapper>
  )
}

function AnnouncementsTab({ admin }) {
  const [list, setList]   = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody]   = useState('')
  const [audience, setAudience] = useState('all')
  const [busy, setBusy]   = useState(false)

  const load = () => admin.fetchAnnouncements().then(setList)
  useEffect(() => { load() }, [])

  const send = async () => {
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    await admin.createAnnouncement({ title: title.trim(), body: body.trim(), audience })
    setTitle(''); setBody('')
    setBusy(false)
    load()
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">New announcement</p>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-sm text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Message shown as a banner in the app"
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-sm text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
          <div className="flex gap-2">
            {[['all', 'Everyone'], ['patient', 'Patients'], ['provider', 'Doctors']].map(([k, l]) => (
              <button key={k} onClick={() => setAudience(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  audience === k ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-ink-400'}`}>
                {l}
              </button>
            ))}
            <Button size="sm" className="ml-auto" onClick={send} disabled={busy || !title.trim() || !body.trim()}>
              {busy ? <Loader size={13} className="animate-spin" /> : <><Megaphone size={13} /> Publish</>}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {list.map(a => (
          <Card key={a.id} className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{a.title}</p>
                <p className="text-xs text-ink-600 dark:text-ink-300 mt-0.5">{a.body}</p>
                <p className="text-[10px] text-ink-400 mt-1">To: {a.audience === 'all' ? 'everyone' : `${a.audience}s`}</p>
              </div>
              <button onClick={async () => { await admin.deleteAnnouncement(a.id); load() }}
                className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 size={13} /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function LogsTab({ admin }) {
  const [logs, setLogs] = useState(null)
  useEffect(() => { admin.fetchLogs().then(setLogs) }, [])
  if (!logs) return <div className="h-24 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-400">Every administrative action is recorded here permanently (append-only).</p>
      {logs.length === 0 && <p className="text-sm text-ink-400 text-center py-8">No admin actions yet.</p>}
      {logs.map(l => (
        <Card key={l.id} className="p-3">
          <div className="flex items-center gap-2">
            <ScrollText size={12} className="text-ink-400 flex-shrink-0" />
            <p className="text-xs font-medium text-ink-800 dark:text-ink-200 flex-1">
              {l.action.replace(/_/g, ' ')}
              {l.detail && <span className="text-ink-400 font-normal"> · {l.detail}</span>}
            </p>
            <span className="text-[10px] text-ink-400 flex-shrink-0">
              {l.at?.seconds ? new Date(l.at.seconds * 1000).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}

function ConfigTab({ admin }) {
  const [cfg, setCfg]     = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    admin.getConfig().then(c => setCfg({
      signupsOpen: true,
      ...c,
      pricing: mergePricing(c?.pricing),
    }))
  }, [])
  if (!cfg) return <div className="h-24 rounded-2xl bg-surface-100 dark:bg-surface-800 animate-pulse" />

  const setPricingField = (path, value) => setCfg(c => {
    const p = structuredClone(c.pricing)
    if (path.length === 1) p[path[0]] = value
    else p.plans[path[0]][path[1]] = value
    return { ...c, pricing: p }
  })

  const save = async () => {
    setSaving(true)
    // Re-merge so blank/invalid numbers fall back to defaults instead of
    // being written to config and breaking the signup page.
    await admin.saveConfig({ ...cfg, pricing: mergePricing(cfg.pricing) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const numInputCls = 'w-28 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-sm text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-400'

  return (
    <Card className="p-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Platform settings</p>

      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-ink-100">Doctor signups open</p>
          <p className="text-[11px] text-ink-400">When off, the provider signup page shows a waitlist message.</p>
        </div>
        <button onClick={() => setCfg(c => ({ ...c, signupsOpen: !c.signupsOpen }))} aria-pressed={cfg.signupsOpen}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 overflow-hidden ${cfg.signupsOpen ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${cfg.signupsOpen ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </label>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-ink-100">Subscription pricing</p>
          <p className="text-[11px] text-ink-400">Shown on the doctor signup page. Existing subscriptions are not re-billed. New trials use the trial length below.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="block">
            <span className="block text-xs text-ink-400 mb-1">Free trial (days)</span>
            <input type="number" min="1" max="365" value={cfg.pricing.trialDays}
              onChange={e => setPricingField(['trialDays'], Number(e.target.value))}
              className={numInputCls} />
          </label>
          <label className="block">
            <span className="block text-xs text-ink-400 mb-1">Standard (R/mo)</span>
            <input type="number" min="1" value={cfg.pricing.plans.standard.monthly}
              onChange={e => setPricingField(['standard', 'monthly'], Number(e.target.value))}
              className={numInputCls} />
          </label>
          <label className="block">
            <span className="block text-xs text-ink-400 mb-1">Featured (R/mo)</span>
            <input type="number" min="1" value={cfg.pricing.plans.featured.monthly}
              onChange={e => setPricingField(['featured', 'monthly'], Number(e.target.value))}
              className={numInputCls} />
          </label>
        </div>
        <p className="text-[10px] text-ink-400">Doctors keep 100% of their session fees. The platform charges no per-session commission.</p>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader size={13} className="animate-spin" /> : saved ? <><BadgeCheck size={13} /> Saved</> : 'Save settings'}
      </Button>
    </Card>
  )
}
