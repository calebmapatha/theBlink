import { useState, useEffect } from 'react'
import { Check, CreditCard, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'

const SPECIALTIES = ['ADHD', 'Anxiety', 'Depression', 'OCD', 'PTSD', 'Autism Spectrum', 'Bipolar Disorder', 'Stress Management', 'Sleep Disorders', 'Trauma', 'Life Transitions', 'Executive Function']
const LANGUAGES   = ['English', 'Zulu', 'Xhosa', 'Afrikaans', 'Sotho', 'Tswana', 'Venda', 'Tsonga', 'Spanish', 'French', 'Portuguese', 'Mandarin']
const TIMEZONES   = ['South Africa (SAST, UTC+2)', 'GMT', 'Eastern (ET)', 'Central (CT)', 'Western Europe (CET)', 'India (IST)', 'Australia (AEST)']
const AVATARS     = ['🧠', '😊', '⚕️', '🌟', '💙', '🌿', '🔬', '🏥', '💊', '🌸', '🌊', '☀️']
const PLATFORMS   = [
  { value: 'zoom',    label: 'Zoom' },
  { value: 'meet',    label: 'Google Meet' },
  { value: 'teams',   label: 'MS Teams' },
  { value: 'whereby', label: 'Whereby' },
  { value: 'skype',   label: 'Skype' },
  { value: 'other',   label: 'Other' },
]
const PLANS = [
  { id: 'standard', price: 49, label: 'Standard', features: ['Profile listing', 'Appointment requests', 'Patient messaging', 'Analytics'] },
  { id: 'featured', price: 99, label: 'Featured',  features: ['Everything in Standard', 'Featured placement in search', 'Priority support', 'Advanced analytics'] },
]

function SpecialtyChips({ selected, onToggle, items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(s => (
        <button key={s} type="button" onClick={() => onToggle(s)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selected.includes(s)
              ? 'bg-primary-500 text-white'
              : 'bg-surface-100 dark:bg-surface-800 text-ink-500 dark:text-ink-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}>
          {s}
        </button>
      ))}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 text-ink-900 dark:text-ink-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400'

export function ProviderSignup() {
  const { user }                      = useAuth()
  const { getProvider, saveProvider } = useProviders()
  const navigate                      = useNavigate()
  const [step, setStep]               = useState(1)
  const [checking, setChecking]       = useState(true)
  const [plan, setPlan]               = useState('standard')
  const [saving, setSaving]           = useState(false)

  const [form, setForm] = useState({
    name:            '',
    type:            'Psychiatrist',
    hpcsa:           '',
    specialties:     ['ADHD'],
    bio:             '',
    experience:      '',
    languages:       ['English'],
    avatar:          '🧠',
    sessionFee:      '',
    availability:    '',
    meetingPlatform: '',
    meetingLink:     '',
    timezone:        'South Africa (SAST, UTC+2)',
  })

  useEffect(() => {
    if (!user) return
    setForm(f => ({ ...f, name: user.displayName || user.email?.split('@')[0] || '' }))
    getProvider(user.uid).then(p => {
      if (p?.subscriptionActive) navigate('/provider/dashboard')
      setChecking(false)
    })
  }, [user])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const toggleList = (key, val) =>
    set(key, form[key].includes(val) ? form[key].filter(x => x !== val) : [...form[key], val])

  const handleActivate = async () => {
    setSaving(true)
    try {
      await saveProvider(user.uid, {
        ...form,
        email:               user.email,
        subscriptionActive:  true,
        subscriptionPlan:    plan,
        subscriptionStarted: new Date().toISOString(),
        profileViews:        0,
      })
      localStorage.setItem('mf_role', 'provider')
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  if (checking) return null

  const hpcsaHint   = form.type === 'Psychiatrist' ? 'MP0123456' : 'PS0123456'
  const STEPS       = ['Profile', 'Session Setup', 'Subscribe']
  const canProceed1 = form.name.trim() && form.bio.trim() && form.specialties.length > 0 && form.hpcsa.trim()
  const canProceed2 = form.sessionFee && Number(form.sessionFee) > 0

  const meetingPlaceholder = form.meetingPlatform === 'meet'
    ? 'https://meet.google.com/abc-defg-hij'
    : form.meetingPlatform === 'zoom'
    ? 'https://zoom.us/j/123456789'
    : form.meetingPlatform === 'teams'
    ? 'https://teams.microsoft.com/l/meetup-join/…'
    : 'https://…'

  return (
    <PageWrapper>
      <button
        onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/connect')}
        className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 mb-4 transition-colors">
        <ArrowLeft size={15} /> {step > 1 ? 'Back' : 'Back to Connect'}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-100">Join as a Provider</h1>
        <p className="text-sm text-ink-400 mt-0.5">List your practice on MentisFlow</p>
      </div>

      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
              step > i + 1 ? 'bg-success-500 text-white' : step === i + 1 ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-ink-400'
            }`}>
              {step > i + 1 ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-ink-900 dark:text-ink-100' : 'text-ink-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700 ml-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-ink-400 mb-2">Choose an avatar</p>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(e => (
                <button key={e} onClick={() => set('avatar', e)}
                  className={`text-2xl p-2 rounded-xl transition-colors ${
                    form.avatar === e ? 'bg-primary-100 dark:bg-primary-700/30 ring-1 ring-primary-400' : 'hover:bg-surface-100 dark:hover:bg-surface-700'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">Full name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-2">Role</label>
              <div className="flex gap-2">
                {['Psychiatrist', 'Psychologist'].map(t => (
                  <button key={t} onClick={() => set('type', t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.type === t
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                        : 'border-surface-200 dark:border-surface-700 text-ink-400'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">
                HPCSA practice number <span className="text-red-400">*</span>
              </label>
              <input value={form.hpcsa} onChange={e => set('hpcsa', e.target.value.toUpperCase())}
                className={inputCls} placeholder={`e.g. ${hpcsaHint}`} />
              <p className="text-[10px] text-ink-400 mt-1">
                Psychiatrists: MP + digits · Psychologists: PS + digits
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">Years of experience</label>
              <input type="number" value={form.experience} onChange={e => set('experience', e.target.value)}
                min="0" max="60" className={inputCls} placeholder="10" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4}
                placeholder="I specialise in ADHD and related conditions, helping clients develop practical strategies…"
                className={`${inputCls} resize-none`} />
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium text-ink-400 mb-2">Specialties</p>
            <SpecialtyChips selected={form.specialties} onToggle={s => toggleList('specialties', s)} items={SPECIALTIES} />
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium text-ink-400 mb-2">Languages</p>
            <SpecialtyChips selected={form.languages} onToggle={l => toggleList('languages', l)} items={LANGUAGES} />
          </Card>

          <Button className="w-full" disabled={!canProceed1} onClick={() => setStep(2)}>Continue →</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">Session fee (ZAR)</label>
              <p className="text-xs text-ink-400 mb-1">Charged directly to patients — you set the price.</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">R</span>
                <input type="number" value={form.sessionFee} onChange={e => set('sessionFee', e.target.value)}
                  min="0" className={`${inputCls} pl-7`} placeholder="800" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">Availability</label>
              <input value={form.availability} onChange={e => set('availability', e.target.value)}
                className={inputCls} placeholder="Mon–Fri, 8 am–5 pm SAST" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">Timezone</label>
              <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={inputCls}>
                {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-2">Video platform</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.value} type="button" onClick={() => set('meetingPlatform', p.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border transition-colors ${
                      form.meetingPlatform === p.value
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-700/20 text-primary-600 dark:text-primary-400'
                        : 'border-surface-200 dark:border-surface-700 text-ink-400 hover:border-surface-300'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-400 mb-1">
                Meeting link <span className="text-ink-400 font-normal">(optional — can be added later)</span>
              </label>
              <p className="text-xs text-ink-400 mb-1">Shared with patients only after you confirm their appointment.</p>
              <input value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)}
                className={inputCls} placeholder={meetingPlaceholder} />
            </div>
          </Card>
          <Button className="w-full" disabled={!canProceed2} onClick={() => setStep(3)}>Continue →</Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-ink-400 px-1">Choose your plan</p>
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                plan === p.id
                  ? 'border-primary-400 bg-primary-50/60 dark:bg-primary-700/15'
                  : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    plan === p.id ? 'border-primary-500 bg-primary-500' : 'border-surface-300 dark:border-surface-600'
                  }`}>
                    {plan === p.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{p.label}</span>
                  {p.id === 'featured' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-400 text-white font-medium">Popular</span>
                  )}
                </div>
                <span className="font-bold text-ink-900 dark:text-ink-100 text-base">R{p.price}<span className="text-xs font-normal text-ink-400">/mo</span></span>
              </div>
              <ul className="space-y-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-ink-400">
                    <Check size={10} className="text-success-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </button>
          ))}

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-400">Payment details</p>
              <div className="flex items-center gap-1 text-xs text-ink-400"><CreditCard size={11} /> Stripe</div>
            </div>
            <div>
              <label className="block text-xs text-ink-400 mb-1">Card number</label>
              <input readOnly placeholder="4242 4242 4242 4242"
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-sm text-ink-300 cursor-not-allowed" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-ink-400 mb-1">Expiry</label>
                <input readOnly placeholder="MM / YY"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-sm text-ink-300 cursor-not-allowed" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-ink-400 mb-1">CVC</label>
                <input readOnly placeholder="•••"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 text-sm text-ink-300 cursor-not-allowed" />
              </div>
            </div>
            <p className="text-[10px] text-ink-400 bg-surface-50 dark:bg-surface-900 px-2.5 py-1.5 rounded-lg">
              🔒 Demo mode — no real charge. Full Stripe billing enabled at launch.
            </p>
          </Card>

          <Button className="w-full" disabled={saving} onClick={handleActivate}>
            {saving ? 'Activating…' : `Activate for R${PLANS.find(p => p.id === plan)?.price}/month`}
          </Button>
        </div>
      )}
    </PageWrapper>
  )
}
