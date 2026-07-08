import { HeartHandshake, Stethoscope, CalendarCheck, FileCheck, LineChart, ArrowRight } from 'lucide-react'
import { DEFAULT_PRICING } from '../utils/pricing'

const POINTS = [
  { icon: Stethoscope,   title: 'Verified listing',     desc: 'List your practice with your HPCSA number and reach patients across South Africa.' },
  { icon: CalendarCheck, title: 'Diary & availability', desc: 'Set your available slots once. Patients book directly, no phone tag.' },
  { icon: FileCheck,     title: 'Patient snapshots',    desc: 'See mood, habit, and check-in trends your patients consent to share at booking.' },
  { icon: LineChart,     title: 'Practice analytics',   desc: 'Appointment volumes, ratings, and growth trends for your practice at a glance.' },
]

export function Practitioners() {
  const { trialDays } = DEFAULT_PRICING
  const home     = import.meta.env.BASE_URL
  const startUrl = `${import.meta.env.BASE_URL}?role=provider`

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
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
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-14 pb-10 lg:pt-20">
        <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">For practitioners</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2 leading-[1.08] max-w-2xl">
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
      </section>

      {/* Feature points */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                <Icon size={19} className="text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trial callout */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-10 lg:py-16">
        <div className="rounded-3xl bg-slate-50 border border-slate-100 p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">Start with a 2-month free trial</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">Try everything, commitment-free.</h2>
          <p className="text-slate-500 mt-3 leading-relaxed max-w-xl mx-auto">
            Every new practice starts with a full 2-month ({trialDays}-day) free trial, no card
            required. Set up your profile, open your diary, and start meeting patients right away.
          </p>
          <a href={startUrl}
            className="inline-flex items-center justify-center gap-2 mt-6 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors">
            Start your free trial
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <a href={home} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <HeartHandshake size={16} className="text-white" />
            </div>
            <span className="font-semibold text-slate-500">MentisFlow</span>
          </a>
          <div className="flex items-center gap-6">
            <a href={`${import.meta.env.BASE_URL}privacy`} className="hover:text-slate-600 transition-colors">Privacy policy</a>
            <a href={`${import.meta.env.BASE_URL}terms`} className="hover:text-slate-600 transition-colors">Terms of service</a>
            <span>© {new Date().getFullYear()} MentisFlow</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
