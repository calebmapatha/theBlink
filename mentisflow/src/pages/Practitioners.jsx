import { HeartHandshake, Stethoscope, CalendarCheck, FileCheck, LineChart, ArrowRight, Star, Clock } from 'lucide-react'
import { DEFAULT_PRICING } from '../utils/pricing'

const POINTS = [
  { icon: Stethoscope,   title: 'Verified listing',     desc: 'List your practice with your HPCSA number and reach patients across South Africa.' },
  { icon: CalendarCheck, title: 'Diary & availability', desc: 'Set your available slots once. Patients book directly, no phone tag.' },
  { icon: FileCheck,     title: 'Patient snapshots',    desc: 'See mood, habit, and check-in trends your patients consent to share at booking.' },
  { icon: LineChart,     title: 'Practice analytics',   desc: 'Appointment volumes, ratings, and growth trends for your practice at a glance.' },
]

const DIARY_ROWS = [
  { time: '09:30', name: 'T. Mokoena',  kind: 'Follow-up · 45 min',  status: 'Confirmed' },
  { time: '11:00', name: 'S. Naidoo',   kind: 'First visit · 60 min', status: 'Confirmed' },
  { time: '14:15', name: 'L. van Wyk',  kind: 'Follow-up · 45 min',  status: 'Pending' },
]

function DiaryMock() {
  return (
    <div className="relative w-full max-w-[360px]">
      <div className="relative bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-300/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Your diary · Tuesday</p>
            <p className="text-sm font-bold text-slate-900">3 appointments today</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <CalendarCheck size={15} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          {DIARY_ROWS.map(({ time, name, kind, status }) => (
            <div key={time} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 rounded-lg px-2 py-1 flex-shrink-0">
                <Clock size={11} />
                {time}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                <p className="text-xs text-slate-400 truncate">{kind}</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                status === 'Confirmed' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {status}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-3.5">
          <div>
            <p className="text-xs font-semibold text-white">This month</p>
            <p className="text-[10px] text-slate-400">32 bookings · 9 new patients</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-white">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            4.9
          </div>
        </div>
      </div>
    </div>
  )
}

export function Practitioners() {
  const { trialDays } = DEFAULT_PRICING
  const home     = import.meta.env.BASE_URL
  const startUrl = `${import.meta.env.BASE_URL}?role=provider`

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <a href={home} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
              <HeartHandshake size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">MentisFlow</span>
          </a>
          <div className="flex items-center gap-3">
            <a href={home} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-2 py-2">
              Back to home
            </a>
            <a href={startUrl} className="text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl transition-colors">
              List your practice
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/80 via-white to-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-16 lg:pt-20 lg:pb-20 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">For practitioners</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mt-2 leading-[1.08] [text-wrap:balance]">
              Grow your practice. Focus on your patients.
            </h1>
            <p className="text-base sm:text-lg text-slate-500 mt-5 max-w-2xl leading-relaxed">
              Patients discover you, book straight into your diary, and arrive with context — the mood,
              habit and check-in trends they choose to share. Less phone tag and paperwork, more time for care.
            </p>
            <a href={startUrl}
              className="inline-flex items-center justify-center gap-2 mt-8 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-colors shadow-lg shadow-teal-500/25">
              List your practice
              <ArrowRight size={17} />
            </a>
            <p className="text-xs text-slate-400 mt-5">
              {trialDays}-day free trial · no card required · cancel any time
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <DiaryMock />
          </div>
        </div>
      </section>

      {/* Feature points */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl [text-wrap:balance]">
            Everything a modern practice needs, nothing it doesn’t.
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10 mt-10">
            {POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0">
                  <Icon size={19} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-md">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trial callout */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-14 lg:py-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-500 to-teal-700 text-white px-7 py-14 sm:px-14 text-center">
          <p className="text-sm font-bold text-teal-100 uppercase tracking-wide">Start with a 2-month free trial</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 [text-wrap:balance]">
            Try everything, commitment-free.
          </h2>
          <p className="text-teal-50/90 mt-4 max-w-xl mx-auto leading-relaxed">
            Every new practice starts with a full 2-month ({trialDays}-day) free trial, no card
            required. Set up your profile, open your diary, and start meeting patients right away.
          </p>
          <a href={startUrl}
            className="inline-flex items-center justify-center gap-2 mt-8 bg-white text-teal-700 hover:bg-teal-50 font-semibold px-7 py-3.5 rounded-2xl transition-colors">
            Start your free trial
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <a href={home} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <HeartHandshake size={16} className="text-white" />
            </div>
            <span className="font-semibold text-slate-500">MentisFlow</span>
          </a>
          <div className="flex items-center gap-6">
            <a href={`${import.meta.env.BASE_URL}privacy`} className="py-2 hover:text-slate-600 transition-colors">Privacy policy</a>
            <a href={`${import.meta.env.BASE_URL}terms`} className="py-2 hover:text-slate-600 transition-colors">Terms of service</a>
            <span>© {new Date().getFullYear()} MentisFlow</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
