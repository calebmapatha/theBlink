import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Calendar, Users, Star, Lightbulb, Clock, CalendarCheck } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'
import { BarChart, LineChart, HBarList, Funnel, SplitBar } from '../components/ui/charts'
import {
  WINDOWS, buildBuckets, series, kpis, attendance, newVsReturning,
  patientGrowth, peakWeekdays, peakHours, occupancyNext7, upcoming, insights, isSession,
} from '../utils/providerStats'

function KpiCard({ label, value, delta, prefix = '' }) {
  const up = delta > 0
  const flat = delta === 0
  return (
    <Card className="p-3">
      <p className="text-[10px] text-faint mb-1">{label}</p>
      <p className="text-xl font-bold text-ink">{prefix}{value.toLocaleString()}</p>
      <p className={`text-[10px] font-medium flex items-center gap-0.5 mt-0.5 ${
        flat ? 'text-faint' : up ? 'text-success-600 dark:text-success-400' : 'text-danger'}`}>
        {!flat && (up ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
        {flat ? 'no change' : `${up ? '+' : ''}${delta}%`} <span className="text-faint font-normal">vs prev period</span>
      </p>
    </Card>
  )
}

function Section({ title, icon: Icon, children, right }) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-faint flex items-center gap-1.5">
          {Icon && <Icon size={12} />} {title}
        </p>
        {right}
      </div>
      {children}
    </Card>
  )
}

export function ProviderAnalytics() {
  const { user } = useAuth()
  const { getProvider, getAppointments, getProviderRatings } = useProviders()
  const [profile, setProfile]   = useState(null)
  const [appts, setAppts]       = useState([])
  const [ratings, setRatings]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [win, setWin]           = useState('30d')

  useEffect(() => {
    if (!user) return
    Promise.all([getProvider(user.uid), getAppointments(user.uid), getProviderRatings(user.uid)])
      .then(([p, a, r]) => { setProfile(p); setAppts(a); setRatings(r); setLoading(false) })
  }, [user])

  const fee = Number(profile?.sessionFee) || 0

  const stats = useMemo(() => {
    if (loading) return null
    const buckets = buildBuckets(win)
    const ratingAvg = ratings.length > 0
      ? ['communication', 'empathy', 'professionalism', 'treatmentPlan', 'overall'].reduce((acc, k) => {
          acc[k] = +(ratings.reduce((s, r) => s + (r[k] || 0), 0) / ratings.length).toFixed(2)
          return acc
        }, {})
      : (profile?.ratingAvg || null)
    const att = attendance(appts)
    const occ = occupancyNext7(appts, profile?.diary || {})
    return {
      kpi:        kpis(appts, win, fee),
      bookingsSeries: series(appts, buckets, () => 1, isSession),
      revenueSeries:  series(appts, buckets, () => Math.round(fee), isSession),
      att, occ, ratingAvg,
      nvr:        newVsReturning(appts, win),
      growth:     patientGrowth(appts),
      weekdays:   peakWeekdays(appts),
      hours:      peakHours(appts),
      next:       upcoming(appts),
      tips:       insights({ appts, diary: profile?.diary || {}, profileViews: profile?.profileViews || 0, ratingAvg, occupancy: occ, att }),
      funnel: [
        { label: 'Profile views',    value: profile?.profileViews || 0 },
        { label: 'Booking requests', value: appts.length },
        { label: 'Sessions held',    value: appts.filter(isSession).length },
      ],
    }
  }, [loading, appts, ratings, profile, win, fee])

  if (loading || !stats) return (
    <PageWrapper>
      <div className="space-y-3 mt-6">
        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-raised animate-pulse" />)}
      </div>
    </PageWrapper>
  )

  const { kpi, att, occ, nvr } = stats

  return (
    <PageWrapper>
      <PageHeader title="Practice Analytics" subtitle="How your practice is performing" className="mb-5" />

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {WINDOWS.map(w => (
          <button key={w.key} onClick={() => setWin(w.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
              win === w.key
                ? 'bg-accent text-on-accent'
                : 'bg-raised text-faint hover:text-ink'
            }`}>
            {w.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KpiCard label="Requests" value={kpi.requests.value} delta={kpi.requests.delta} />
        <KpiCard label="Sessions" value={kpi.sessions.value} delta={kpi.sessions.delta} />
        <KpiCard label="Earnings" value={kpi.earnings.value} delta={kpi.earnings.delta} prefix="R" />
      </div>

      {/* Occupancy + rating quick row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-3">
          <p className="text-[10px] text-faint mb-1 flex items-center gap-1"><CalendarCheck size={10} /> Next 7 days occupancy</p>
          <p className="text-xl font-bold text-ink">{occ.pct !== null ? `${occ.pct}%` : 'N/A'}</p>
          <p className="text-[10px] text-faint">{occ.booked} booked of {occ.open} open slots</p>
          <div className="h-1.5 rounded-full bg-raised overflow-hidden mt-1.5">
            <div className="h-full rounded-full bg-accent" style={{ width: `${occ.pct || 0}%` }} />
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-faint mb-1 flex items-center gap-1"><Star size={10} /> Patient satisfaction</p>
          <p className="text-xl font-bold text-ink">
            {stats.ratingAvg?.overall ? `${stats.ratingAvg.overall.toFixed(1)}/5` : 'N/A'}
          </p>
          <p className="text-[10px] text-faint">{ratings.length || profile?.ratingCount || 0} review{(ratings.length || profile?.ratingCount || 0) !== 1 ? 's' : ''}</p>
        </Card>
      </div>

      <Section title="Sessions trend" icon={Calendar}>
        <BarChart data={stats.bookingsSeries} />
      </Section>

      <Section title="Earnings trend" icon={TrendingUp}>
        <BarChart data={stats.revenueSeries} prefix="R" color="fill-success-500" />
      </Section>

      <Section title="Attendance" icon={CalendarCheck}>
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div>
            <p className="text-lg font-bold text-success-600 dark:text-success-400">{att.completed}</p>
            <p className="text-[10px] text-faint">Completed</p>
          </div>
          <div>
            <p className="text-lg font-bold text-danger">{att.noShow}</p>
            <p className="text-[10px] text-faint">No-shows</p>
          </div>
          <div>
            <p className="text-lg font-bold text-muted">{att.cancelled}</p>
            <p className="text-[10px] text-faint">Declined</p>
          </div>
        </div>
        {att.attendanceRate !== null ? (
          <p className="text-[11px] text-faint text-center">
            Attendance rate <strong className="text-ink">{att.attendanceRate}%</strong>
            {att.noShowRate !== null && <> · No-show rate <strong className="text-ink">{att.noShowRate}%</strong></>}
          </p>
        ) : (
          <p className="text-[11px] text-faint text-center">Mark past sessions as Completed or No-show on the Dashboard to track attendance.</p>
        )}
      </Section>

      <Section title="Patients" icon={Users}>
        <SplitBar a={nvr.newPatients} b={nvr.returningPatients} labelA="New" labelB="Returning" />
        <p className="text-[10px] text-faint mt-3 mb-1.5">Total patients over time</p>
        <LineChart data={stats.growth} />
      </Section>

      <Section title="Peak booking times" icon={Clock}>
        <p className="text-[10px] text-faint mb-2">By weekday</p>
        <HBarList items={stats.weekdays} />
        {stats.hours.length > 0 && (
          <>
            <p className="text-[10px] text-faint mt-4 mb-2">Busiest start times</p>
            <HBarList items={stats.hours} color="bg-warm-400" />
          </>
        )}
      </Section>

      <Section title="Conversion funnel" icon={TrendingUp}>
        <Funnel steps={stats.funnel} />
      </Section>

      {stats.next.length > 0 && (
        <Section title="Upcoming sessions" icon={Calendar}>
          <div className="space-y-2">
            {stats.next.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-raised">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{a.patientName}</p>
                  <p className="text-[10px] text-faint">{a.date} · {a.timeSlot}</p>
                </div>
                <span className="text-[10px] font-semibold text-success-600 dark:text-success-400 flex-shrink-0">R{Math.round(fee)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Recommendations" icon={Lightbulb}>
        <div className="space-y-2">
          {stats.tips.map((t, i) => (
            <p key={i} className="text-xs text-ink leading-relaxed bg-raised px-3 py-2.5 rounded-xl">{t}</p>
          ))}
        </div>
      </Section>
    </PageWrapper>
  )
}
