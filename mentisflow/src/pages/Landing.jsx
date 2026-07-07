import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  HeartHandshake, Shield, Zap, Search, CalendarCheck, TrendingUp, Smile,
  Repeat, Timer, Lightbulb, ListChecks, Award, Stethoscope, LineChart,
  Lock, Trash2, FileCheck, CheckCircle2, ArrowRight, Menu, X,
} from 'lucide-react'
import { DEFAULT_PRICING } from '../utils/pricing'

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.45, ease: 'easeOut' },
}

const NAV_LINKS = [
  { href: '#features',      label: 'Features' },
  { href: '#how-it-works',  label: 'How it works' },
  { href: '#practitioners', label: 'For practitioners' },
  { href: '#security',      label: 'Security' },
]

const PATIENT_FEATURES = [
  { icon: Search,     title: 'Find your practitioner', desc: 'Browse HPCSA-registered psychiatrists and psychologists, filtered by province or near you, and book directly into their diary.' },
  { icon: Smile,      title: 'Daily mood check-ins',   desc: 'A gentle daily pulse on how you are doing: mood, sleep, and energy. Over time it builds a picture you can share with your doctor.' },
  { icon: Repeat,     title: 'Habit tracking',         desc: 'Build routines that stick with streaks, reminders, and progress views designed for ADHD brains.' },
  { icon: Timer,      title: 'Focus timer',            desc: 'Pomodoro-style focus sessions with ambient sound that help you start, and finish, what matters.' },
  { icon: Lightbulb,  title: 'Brain dump',             desc: 'Capture racing thoughts the moment they arrive, then sort them into tasks when you are ready.' },
  { icon: ListChecks, title: 'Tasks & monthly goals',  desc: 'A simple task board and monthly tracker that turn overwhelm into small, doable steps.' },
  { icon: Award,      title: 'Rewards',                desc: 'Earn points and level up for showing up. Positive reinforcement is built into every feature.' },
  { icon: FileCheck,  title: 'Treatment plan',         desc: 'Keep your treatment plan in one place and share a secure snapshot of your progress with your doctor.' },
]

const HOW_IT_WORKS = [
  { icon: Search,        step: '1', title: 'Find a practitioner',  desc: 'Browse HPCSA-verified psychiatrists and psychologists near you.' },
  { icon: CalendarCheck, step: '2', title: 'Book via their diary', desc: 'Pick an available slot and confirm your appointment instantly.' },
  { icon: TrendingUp,    step: '3', title: 'Track your progress',  desc: 'Share mood, habit, and task data securely with your doctor.' },
]

const PROVIDER_POINTS = [
  { icon: Stethoscope,   title: 'Verified listing',        desc: 'List your practice with your HPCSA number and reach patients across South Africa.' },
  { icon: CalendarCheck, title: 'Diary & availability',    desc: 'Set your available slots once. Patients book directly, no phone tag.' },
  { icon: FileCheck,     title: 'Patient snapshots',       desc: 'See mood, habit, and check-in trends your patients consent to share at booking.' },
  { icon: LineChart,     title: 'Practice analytics',      desc: 'Appointment volumes, ratings, and growth trends for your practice at a glance.' },
]

const SECURITY_POINTS = [
  { icon: Lock,         title: 'Private by design',   desc: 'Patient records are readable only by the patient and the practitioner they choose to share with, enforced at the database level.' },
  { icon: Shield,       title: 'Consent comes first', desc: 'Your health data is never shared without your explicit consent, and you can withdraw that consent at any time.' },
  { icon: Trash2,       title: 'Right to erasure',    desc: 'Patients can delete their appointments at any time, and old records are automatically purged after two years.' },
  { icon: CheckCircle2, title: 'Hardened backend',    desc: 'Strict database security rules and abuse protection guard every endpoint.' },
]

function Logo({ size = 'md' }) {
  const box = size === 'md' ? 'w-9 h-9 rounded-xl' : 'w-8 h-8 rounded-lg'
  const icon = size === 'md' ? 18 : 16
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${box} bg-teal-500 flex items-center justify-center shadow-sm`}>
        <HeartHandshake size={icon} className="text-white" />
      </div>
      <span className="text-lg font-bold text-slate-900 tracking-tight">MentisFlow</span>
    </div>
  )
}

function PhoneMock() {
  return (
    <div className="relative w-[290px] sm:w-[320px]">
      <div className="absolute -top-8 -left-10 w-40 h-40 bg-teal-200/50 rounded-full blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-6 -right-8 w-44 h-44 bg-purple-200/40 rounded-full blur-3xl" aria-hidden="true" />

      <div className="relative bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-300/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Good morning</p>
            <p className="text-sm font-bold text-slate-900">How are you feeling?</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <HeartHandshake size={15} className="text-white" />
          </div>
        </div>

        <div className="flex justify-between bg-slate-50 rounded-2xl p-3">
          {['😔', '😕', '😐', '🙂', '😄'].map((e, i) => (
            <span
              key={e}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg ${
                i === 3 ? 'bg-teal-100 ring-2 ring-teal-400' : ''
              }`}
            >
              {e}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Next appointment</p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-500 text-white">Confirmed</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">Dr. N. Khumalo</p>
          <p className="text-xs text-slate-500">Psychiatrist · Johannesburg · Tue 09:30</p>
        </div>

        <div className="rounded-2xl border border-slate-100 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700">Morning meds</p>
            <span className="text-[10px] font-semibold text-teal-600">12-day streak 🔥</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 10 ? 'bg-teal-400' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-3.5">
          <Timer size={15} className="text-teal-300 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-white">Focus session</p>
            <p className="text-[10px] text-slate-400">Deep work · 18:42 remaining</p>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-teal-400 border-t-transparent animate-spin [animation-duration:3s]" />
        </div>
      </div>
    </div>
  )
}

export function Landing({ onSignIn, onGetStarted }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { trialDays } = DEFAULT_PRICING
  const privacyHref = `${import.meta.env.BASE_URL}privacy`

  return (
    <div className="h-[100dvh] overflow-y-auto scroll-smooth bg-white text-slate-900">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => onSignIn()} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
              Sign in
            </button>
            <button
              onClick={() => onGetStarted('patient')}
              className="text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Get started
            </button>
          </div>
          <button className="md:hidden p-2 -mr-2 text-slate-600" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-5 py-4 space-y-1">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-600">
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-3">
              <button onClick={() => onSignIn()} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                Sign in
              </button>
              <button onClick={() => onGetStarted('patient')} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold">
                Get started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/80 via-white to-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full mb-5">
              <Shield size={12} />
              Built for South Africa
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.08]">
              Mental health care,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-teal-700">connected.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 mt-5 max-w-xl leading-relaxed">
              Find and book HPCSA-registered psychiatrists and psychologists, track your wellbeing
              every day, and share your progress with your doctor, all in one secure app.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => onGetStarted('patient')}
                className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-colors shadow-lg shadow-teal-500/25"
              >
                Get started for free
                <ArrowRight size={17} />
              </button>
              <button
                onClick={() => onGetStarted('provider')}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3.5 rounded-2xl border border-slate-200 transition-colors"
              >
                <Stethoscope size={17} className="text-teal-600" />
                List your practice
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-7 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Shield size={12} className="text-teal-400" /> HPCSA-verified practitioners</span>
              <span className="flex items-center gap-1.5"><Lock size={12} className="text-teal-400" /> Your data stays yours</span>
              <span className="flex items-center gap-1.5"><Zap size={12} className="text-teal-400" /> Installs as an app (PWA)</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <PhoneMock />
          </motion.div>
        </div>
      </section>

      {/* ── Value strip ─────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ['R0', 'commission. Doctors keep 100% of session fees'],
            ['2 months', 'free trial for every new practice'],
            ['9 provinces', 'find practitioners anywhere in SA'],
            ['2 roles', 'one platform for patients & practitioners'],
          ].map(([big, small]) => (
            <div key={big}>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{big}</p>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Patient features ────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">For patients</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
            Everything between appointments, handled.
          </h2>
          <p className="text-slate-500 mt-4 leading-relaxed">
            MentisFlow includes <strong className="text-slate-700">FocusBlink</strong>, an ADHD-friendly
            companion that keeps your daily mental health work (moods, habits, focus, and tasks) in one
            place, ready to share with your doctor.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {PATIENT_FEATURES.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              {...fadeUp}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-teal-100 transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                <Icon size={19} className="text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="text-sm font-bold text-teal-300 uppercase tracking-wide">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              From “I need help” to a booked appointment in minutes.
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <motion.div key={step} {...fadeUp} className="rounded-3xl bg-slate-800/60 border border-slate-700/60 p-7">
                <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-sm font-bold mb-4">{step}</div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Practitioners ───────────────────────────────────── */}
      <section id="practitioners" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <motion.div {...fadeUp} className="max-w-2xl">
          <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">For practitioners</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
            Grow your practice. Keep every rand you earn.
          </h2>
          <p className="text-slate-500 mt-4 leading-relaxed">
            A simple monthly subscription and nothing else. MentisFlow never takes a cut of your
            session fees. Patients find you, book into your diary, and arrive with context.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {PROVIDER_POINTS.map(({ icon: Icon, title, desc }) => (
            <motion.div key={title} {...fadeUp} className="p-1">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                <Icon size={18} className="text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          {...fadeUp}
          className="mt-14 rounded-3xl bg-slate-50 border border-slate-100 p-8 sm:p-10 text-center max-w-3xl mx-auto"
        >
          <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">Start with a 2-month free trial</p>
          <h3 className="text-2xl font-extrabold tracking-tight mt-2">Try everything first. Pay nothing today.</h3>
          <p className="text-slate-500 mt-3 leading-relaxed max-w-xl mx-auto">
            Every new practice starts with a 2-month ({trialDays}-day) free trial, with no card
            required and no per-session commission. Plan options are shown when you create your
            practice profile.
          </p>
          <button
            onClick={() => onGetStarted('provider')}
            className="mt-6 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors"
          >
            Start your free trial
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      {/* ── Security ────────────────────────────────────────── */}
      <section id="security" className="scroll-mt-20 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="text-sm font-bold text-teal-600 uppercase tracking-wide">Security & privacy</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              Health data deserves hospital-grade care.
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-5 mt-12">
            {SECURITY_POINTS.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} {...fadeUp} className="flex items-start gap-4 rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={19} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp} className="text-sm text-slate-400 mt-8">
            Read the full{' '}
            <a href={privacyHref} className="text-teal-600 font-semibold hover:underline">privacy policy</a>.
            No login required.
          </motion.p>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-500 to-teal-700 text-white px-7 py-14 sm:px-14 text-center"
        >
          <div className="absolute -top-16 -right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Take the first step today.</h2>
          <p className="text-teal-50/90 mt-4 max-w-xl mx-auto leading-relaxed">
            Whether you're looking for support or offering it, MentisFlow connects you
            securely, privately, and on your terms.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
            <button
              onClick={() => onGetStarted('patient')}
              className="bg-white text-teal-700 hover:bg-teal-50 font-semibold px-7 py-3.5 rounded-2xl transition-colors"
            >
              Create your free account
            </button>
            <button
              onClick={() => onGetStarted('provider')}
              className="bg-teal-600/40 hover:bg-teal-600/60 border border-white/30 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors"
            >
              Start your 2-month practice trial
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <Logo size="sm" />
            <p className="text-xs text-slate-400">Mental health care, connected.</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href={privacyHref} className="hover:text-slate-600 transition-colors">Privacy policy</a>
            <a href={`${import.meta.env.BASE_URL}terms`} className="hover:text-slate-600 transition-colors">Terms of service</a>
            <button onClick={() => onSignIn()} className="hover:text-slate-600 transition-colors">Sign in</button>
            <span>© {new Date().getFullYear()} MentisFlow</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
