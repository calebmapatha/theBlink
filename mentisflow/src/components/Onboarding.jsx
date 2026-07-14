import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HeartHandshake, Search, Zap, Lock, ArrowRight, Sun } from 'lucide-react'
import { useApp } from '../context/AppContext'

const STEPS = [
  {
    icon: HeartHandshake,
    title: 'Welcome to MentisFlow',
    desc: 'Mental health care, connected. Everything you need to look after your mind, and the professionals to support you, in one place.',
    chips: null,
  },
  {
    icon: Search,
    title: 'Find your practitioner',
    desc: 'Browse HPCSA-registered psychiatrists and psychologists across South Africa, book straight into their diary, and meet online.',
    chips: ['🩺 HPCSA verified', '📅 Book online', '🇿🇦 All 9 provinces'],
  },
  {
    icon: Zap,
    title: 'Your daily toolkit',
    desc: 'FocusBlink helps you between appointments: check in on your mood, build habits, focus with a timer, and earn rewards for showing up.',
    chips: ['😊 Check-ins', '🔄 Habits', '🎯 Focus timer', '🏆 Rewards'],
  },
  {
    icon: Lock,
    title: 'Private by design',
    desc: 'Your data belongs to you. Nothing is shared with a practitioner unless you explicitly choose to share it when you book.',
    chips: ['🔒 You control sharing', '🗑️ Delete any time'],
  },
]

// First-run welcome tour for patients. Shows once per account (synced via the
// profile's onboardedAt flag) and only after the profile has hydrated from
// Firestore, so long-time users on a new device never see it flash.
export function Onboarding() {
  const navigate = useNavigate()
  const { userProfile } = useApp()
  const { profile, updateProfile, hydrated } = userProfile
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  if (!hydrated || profile.onboardedAt || dismissed) return null

  const finish = (destination) => {
    updateProfile({ onboardedAt: new Date().toISOString() })
    setDismissed(true)
    if (destination) navigate(destination)
  }

  const isLast = step === STEPS.length - 1
  const { icon: Icon, title, desc, chips } = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-surface-950/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-sm rounded-[2rem] bg-surface shadow-2xl overflow-hidden"
      >
        {/* Decorative header band */}
        <div className="relative h-36 bg-gradient-to-br from-accent to-accent-strong overflow-hidden">
          <div className="absolute -top-8 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
                <Icon size={30} className="text-white" />
              </div>
            </motion.div>
          </AnimatePresence>
          <button
            onClick={() => finish()}
            className="absolute top-4 right-4 text-xs font-semibold text-white/70 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 pt-6 pb-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="min-h-[9.5rem]"
            >
              <h2 className="text-xl font-bold tracking-tight text-ink text-center">{title}</h2>
              <p className="text-sm text-muted leading-relaxed text-center mt-2">{desc}</p>
              {chips && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {chips.map(c => (
                    <span key={c} className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent-soft text-accent-soft-text">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-accent' : 'w-1.5 bg-line'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <div className="space-y-2">
              <button
                onClick={() => finish('/checkin')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent hover:bg-accent-strong active:scale-[0.98] text-white text-sm font-semibold transition-all"
              >
                <Sun size={15} />
                Do my first check-in
              </button>
              <button
                onClick={() => finish()}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-muted hover:bg-raised active:scale-[0.98] transition-all"
              >
                Explore on my own
              </button>
            </div>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent hover:bg-accent-strong active:scale-[0.98] text-white text-sm font-semibold transition-all"
            >
              Next
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
