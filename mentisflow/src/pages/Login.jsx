import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, HeartHandshake, Zap, Shield, Users, Search, CalendarCheck, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const HOW_IT_WORKS = [
  { icon: Search,        step: '1', label: 'Find a practitioner', desc: 'Browse HPCSA-verified psychiatrists & psychologists near you' },
  { icon: CalendarCheck, step: '2', label: 'Book via their diary', desc: 'Pick an available slot and confirm your appointment instantly' },
  { icon: TrendingUp,    step: '3', label: 'Track your progress', desc: 'Share mood, habits & task data with your doctor securely' },
]

export function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, authError } = useAuth()
  const [role, setRole]         = useState(null)
  const [mode, setMode]         = useState('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [showHow, setShowHow]   = useState(false)

  const pickRole = (r) => {
    localStorage.setItem('mf_role', r)
    setRole(r)
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (mode === 'signin') await signInWithEmail(email, password)
    else await signUpWithEmail(email, password)
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    await signInWithGoogle()
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-teal-50 via-white to-slate-50 overflow-y-auto">
      <div className="flex flex-col items-center max-w-sm mx-auto px-6 pt-10 pb-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center mb-6 w-full"
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-500 flex items-center justify-center shadow-lg mb-4">
            <HeartHandshake size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">MentisFlow</h1>
          <p className="text-slate-500 mt-1.5 text-sm text-center leading-snug">
            Mental health care, connected.
          </p>
          <p className="text-slate-400 text-xs text-center mt-0.5">
            South Africa's platform for psychiatrists &amp; psychologists.
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Shield size={12} className="text-teal-400" />
              HPCSA verified
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Users size={12} className="text-teal-400" />
              SA practitioners
            </div>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="w-full space-y-2.5 mb-4"
        >
          <div className="bg-white rounded-2xl p-3.5 border border-teal-100 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HeartHandshake size={16} className="text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-semibold text-slate-900">Connect</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 uppercase tracking-wide">Core</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Find &amp; book HPCSA-registered psychiatrists and psychologists. Securely share your mental health data with your doctor.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50/60 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap size={16} className="text-teal-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 mb-0.5">FocusBlink</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                ADHD companion: habits, focus timer, mood check-ins, and task management to support your daily routine.
              </p>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="w-full mb-5"
        >
          <button
            onClick={() => setShowHow(s => !s)}
            className="flex items-center gap-2 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors mb-2"
          >
            <span>{showHow ? '▾' : '▸'} How it works</span>
          </button>
          <AnimatePresence>
            {showHow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="space-y-2.5 pt-1">
                  {HOW_IT_WORKS.map(({ icon: Icon, step, label, desc }) => (
                    <div key={step} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                      <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-white">{step}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 mb-0.5">{label}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Role selector or auth form */}
        <AnimatePresence mode="wait">
          {!role ? (
            <motion.div
              key="role-select"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">I am…</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => pickRole('patient')}
                  className="bg-white border-2 border-slate-200 hover:border-teal-400 active:border-teal-500 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all text-center group"
                >
                  <div className="w-11 h-11 rounded-xl bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                    <span className="text-2xl">🧑</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Seeking care</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">Find &amp; book a mental health professional</p>
                  </div>
                </button>
                <button
                  onClick={() => pickRole('provider')}
                  className="bg-white border-2 border-slate-200 hover:border-teal-400 active:border-teal-500 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all text-center group"
                >
                  <div className="w-11 h-11 rounded-xl bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                    <span className="text-2xl">⚕️</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Practitioner</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">Psychiatrist or psychologist</p>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setRole(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ← Change role
                </button>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  role === 'provider'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {role === 'provider' ? '⚕️ Practitioner' : '🧑 Patient'}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                  {['signin', 'signup'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        mode === m
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {m === 'signin' ? 'Sign in' : 'Sign up'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all mb-4 disabled:opacity-50"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">or</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={handleEmail} className="space-y-3">
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs"
                      >
                        <AlertCircle size={13} className="flex-shrink-0" />
                        {authError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
                  </button>
                </form>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                Your data is private and only visible to you and your chosen practitioner.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
