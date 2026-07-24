import { useState, useEffect } from 'react'
import { Check, CreditCard, ArrowLeft, MapPin, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { useProviders } from '../hooks/useProviders'
import { DEFAULT_PRICING, fetchPricing } from '../utils/pricing'
import { detectLocation } from '../utils/geolocate'

const activateProvider = httpsCallable(functions, 'activateProvider')

const SPECIALTIES = ['ADHD', 'Anxiety', 'Depression', 'OCD', 'PTSD', 'Autism Spectrum', 'Bipolar Disorder', 'Stress Management', 'Sleep Disorders', 'Trauma', 'Life Transitions', 'Executive Function']
// All 12 official South African languages (11 + South African Sign Language),
// followed by other commonly-spoken languages.
const SA_LANGUAGES = ['English', 'Afrikaans', 'Zulu', 'Xhosa', 'Ndebele', 'Swati', 'Sotho', 'Northern Sotho', 'Tswana', 'Tsonga', 'Venda', 'South African Sign Language']
const LANGUAGES   = [...SA_LANGUAGES, 'Spanish', 'French', 'Portuguese', 'Mandarin']
const SA_PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']
const TIMEZONES   = ['South Africa (SAST, UTC+2)', 'GMT', 'Eastern (ET)', 'Central (CT)', 'Western Europe (CET)', 'India (IST)', 'Australia (AEST)']
const PLATFORMS   = [
  { value: 'zoom',    label: 'Zoom' },
  { value: 'meet',    label: 'Google Meet' },
  { value: 'teams',   label: 'MS Teams' },
  { value: 'whereby', label: 'Whereby' },
  { value: 'skype',   label: 'Skype' },
  { value: 'other',   label: 'Other' },
]
const PLAN_FEATURES = {
  standard: ['Profile listing', 'Appointment requests', 'Patient messaging', 'Analytics'],
  featured: ['Everything in Standard', 'Featured placement in search', 'Priority support', 'Advanced analytics'],
}

function SpecialtyChips({ selected, onToggle, items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(s => (
        <button key={s} type="button" onClick={() => onToggle(s)}
          className={`px-2.5 py-1  text-xs font-medium transition-colors ${
            selected.includes(s)
              ? 'bg-accent text-on-accent'
              : 'bg-raised text-muted hover:bg-line'
          }`}>
          {s}
        </button>
      ))}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5  border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent'

export function ProviderSignup() {
  const { user }                      = useAuth()
  const { getProvider, saveProvider, getPrivateProfile } = useProviders()
  const navigate                      = useNavigate()
  const [step, setStep]               = useState(1)
  const [checking, setChecking]       = useState(true)
  const [plan, setPlan]               = useState('trial')
  const [cycle, setCycle]             = useState('monthly')
  const [saving, setSaving]           = useState(false)
  const [activateError, setActivateError] = useState('')
  const [pricing, setPricing]         = useState(DEFAULT_PRICING)
  const [trialUsed, setTrialUsed]     = useState(false)
  const [hasProfile, setHasProfile]   = useState(false)
  const [pendingPayment, setPendingPayment] = useState(false)

  const [form, setForm] = useState({
    name:            '',
    type:            'Psychiatrist',
    hpcsa:           '',
    specialties:     ['ADHD'],
    bio:             '',
    experience:      '',
    languages:       ['English'],
    sessionFee:      '',
    hideFee:         false,
    availability:    '',
    meetingPlatform: '',
    meetingLink:     '',
    timezone:        'South Africa (SAST, UTC+2)',
    city:            '',
    province:        '',
    consultationType: 'remote',   // remote | in-person | both
    address:         '',          // physical practice address (in-person only)
  })

  useEffect(() => {
    if (!user) return
    fetchPricing().then(setPricing)
    setForm(f => ({ ...f, name: user.displayName || user.email?.split('@')[0] || '' }))
    getProvider(user.uid).then(async p => {
      // Paid (or legacy-active) providers have nothing to do here. Trialing
      // providers may stay to upgrade; expired ones come back to renew.
      if (p?.subscriptionActive && p?.subscriptionStatus !== 'trialing') {
        navigate('/provider/dashboard')
        return
      }
      if (p) {
        setHasProfile(true)
        setTrialUsed(!!p.trialUsed)
        setPendingPayment(p.subscriptionStatus === 'pending_payment' && !p.subscriptionActive)
        if (p.trialUsed) setPlan('standard')
        // Owner-only fields (meeting link) live in the private subcollection.
        const priv = await getPrivateProfile(user.uid)
        p = { ...p, ...priv }
        // Prefill so re-activation/upgrade never wipes the existing profile.
        setForm(f => Object.fromEntries(
          Object.keys(f).map(k => [k, p[k] != null && p[k] !== '' ? p[k] : f[k]])
        ))
        // Profile already exists — jump straight to plan selection.
        setStep(3)
      }
      setChecking(false)
    })
  }, [user])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const toggleList = (key, val) =>
    set(key, form[key].includes(val) ? form[key].filter(x => x !== val) : [...form[key], val])

  const [locating, setLocating]   = useState(false)
  const [locError, setLocError]   = useState('')
  const handleUseLocation = async () => {
    setLocating(true)
    setLocError('')
    try {
      const { city, province } = await detectLocation()
      if (!city && !province) setLocError('Could not determine your location. Please fill it in manually.')
      else setForm(f => ({ ...f, city: city || f.city, province: province || f.province }))
    } catch (e) {
      setLocError(e.message)
    }
    setLocating(false)
  }

  const handleActivate = async () => {
    setSaving(true)
    setActivateError('')
    try {
      // Save the profile WITHOUT any subscription/trial fields — those are
      // granted only by the trusted activateProvider Cloud Function (paid
      // plans are demo mode until PayFast credentials are configured; trials
      // are real either way).
      await saveProvider(user.uid, {
        ...form,
        email: user.email,
        ...(hasProfile ? {} : { profileViews: 0 }),
      })
      // activateProvider also queues the doctor for Super Admin approval
      // (approvalStatus: 'pending') — set server-side so it can't be forged.
      const res = await activateProvider({ plan, cycle })
      localStorage.setItem('mf_role', 'provider')
      if (res?.data?.authorizationUrl) {
        // Paid plan with live billing: complete checkout on PayFast. The
        // paymentWebhook function activates the subscription once PayFast's
        // ITN reports the payment as complete.
        window.location.href = res.data.authorizationUrl
        return
      }
      window.location.reload()
    } catch (e) {
      setActivateError(e?.message?.includes('trial')
        ? 'Your free trial has already been used. Please choose a plan.'
        : 'Could not activate your subscription. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (checking) return null

  const hpcsaHint   = form.type === 'Psychiatrist' ? 'MP0123456' : 'PS0123456'
  const STEPS       = ['Profile', 'Session Setup', 'Subscribe']
  // Two letters + at least four digits covers MP/PS registration numbers
  // without hard-coding a single prefix; blocks obvious typos and garbage.
  const hpcsaValid  = /^[A-Z]{2}\d{4,}$/.test(form.hpcsa.trim())
  const canProceed1 = form.name.trim() && form.bio.trim() && form.specialties.length > 0 && hpcsaValid
  const needsAddress = form.consultationType === 'in-person' || form.consultationType === 'both'
  const canProceed2 = form.sessionFee && Number(form.sessionFee) > 0 && (!needsAddress || form.address.trim().length > 4)

  const PLANS = [
    { id: 'standard', price: pricing.plans.standard[cycle], label: 'Standard', features: PLAN_FEATURES.standard },
    { id: 'featured', price: pricing.plans.featured[cycle], label: 'Featured', features: PLAN_FEATURES.featured },
  ]
  const perCycle = cycle === 'annual' ? '/yr' : '/mo'

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
        className="flex items-center gap-1.5 text-sm text-faint hover:text-ink mb-4 transition-colors">
        <ArrowLeft size={15} /> {step > 1 ? 'Back' : 'Back to Connect'}
      </button>

      <PageHeader title="Join as a Provider" subtitle="List your practice on MentisFlow" />

      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`w-7 h-7  flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors ${
              step > i + 1 ? 'bg-success-500 text-white' : step === i + 1 ? 'bg-accent text-on-accent' : 'bg-raised text-faint'
            }`}>
              {step > i + 1 ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-ink' : 'text-faint'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-line ml-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-faint mb-1">Full name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-2">Role</label>
              <div className="flex gap-2">
                {['Psychiatrist', 'Psychologist'].map(t => (
                  <button key={t} onClick={() => set('type', t)}
                    className={`flex-1 py-2.5  text-sm font-medium border transition-colors ${
                      form.type === t
                        ? 'border-accent bg-accent-soft text-accent-soft-text'
                        : 'border-line text-faint'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-1">
                HPCSA practice number <span className="text-danger">*</span>
              </label>
              <input value={form.hpcsa}
                onChange={e => set('hpcsa', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className={`${inputCls} ${form.hpcsa && !hpcsaValid ? 'border-red-300 dark:border-red-500/40 focus:ring-red-400' : ''}`}
                placeholder={`e.g. ${hpcsaHint}`} />
              {form.hpcsa && !hpcsaValid ? (
                <p className="text-[10px] text-danger mt-1">
                  Enter two letters followed by digits, e.g. {hpcsaHint}.
                </p>
              ) : (
                <p className="text-[10px] text-faint mt-1">
                  Psychiatrists: MP + digits · Psychologists: PS + digits
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-1">Years of experience</label>
              <input type="number" value={form.experience} onChange={e => set('experience', e.target.value)}
                min="0" max="60" className={inputCls} placeholder="10" />
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4}
                placeholder="I specialise in ADHD and related conditions, helping clients develop practical strategies…"
                className={`${inputCls} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-faint mb-1">City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  className={inputCls} placeholder="e.g. Johannesburg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-faint mb-1">Province</label>
                <select value={form.province} onChange={e => set('province', e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {SA_PROVINCES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <button type="button" onClick={handleUseLocation} disabled={locating}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-strong disabled:opacity-50 transition-colors">
              {locating ? <Loader size={12} className="animate-spin" /> : <MapPin size={12} />}
              {locating ? 'Finding your location…' : 'Use my current location'}
            </button>
            {locError && <p className="text-xs text-danger">{locError}</p>}
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium text-faint mb-2">Specialties</p>
            <SpecialtyChips selected={form.specialties} onToggle={s => toggleList('specialties', s)} items={SPECIALTIES} />
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium text-faint mb-2">Languages</p>
            <SpecialtyChips selected={form.languages} onToggle={l => toggleList('languages', l)} items={LANGUAGES} />
          </Card>

          <Button className="w-full" disabled={!canProceed1} onClick={() => setStep(2)}>Continue →</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-faint mb-1">Session fee (ZAR)</label>
              <p className="text-xs text-faint mb-1">Charged directly to patients. You set the price.</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-sm">R</span>
                <input type="number" value={form.sessionFee} onChange={e => set('sessionFee', e.target.value)}
                  min="0" className={`${inputCls} pl-7`} placeholder="800" />
              </div>
              {form.sessionFee && Number(form.sessionFee) > 0 && (
                <div className="mt-2  bg-accent-soft px-3 py-2.5 text-xs space-y-0.5">
                  <p className="font-semibold text-accent-soft-text">No per-session commission</p>
                  <p className="text-muted">
                    You keep 100% of your R{Number(form.sessionFee).toLocaleString()} session fee. MentisFlow charges only your monthly plan.
                  </p>
                </div>
              )}
              <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
                <input type="checkbox" checked={!!form.hideFee} onChange={e => set('hideFee', e.target.checked)}
                  className="mt-0.5 w-4 h-4  accent-accent flex-shrink-0" />
                <span className="text-xs text-muted leading-relaxed">
                  <span className="font-medium text-ink">Hide my session fee from patients.</span>{' '}
                  Your profile will show "Fee on request" instead of the amount. You can change this any time.
                </span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-1">Availability</label>
              <input value={form.availability} onChange={e => set('availability', e.target.value)}
                className={inputCls} placeholder="Mon to Fri, 8am to 5pm SAST" />
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-1">Timezone</label>
              <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={inputCls}>
                {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-faint mb-2">Consultation type</label>
              <div className="grid grid-cols-3 gap-2">
                {[['remote', 'Online only'], ['in-person', 'In person'], ['both', 'Both']].map(([v, label]) => (
                  <button key={v} type="button" onClick={() => set('consultationType', v)}
                    className={`py-2 px-2  text-xs font-medium border transition-colors ${
                      form.consultationType === v
                        ? 'border-accent bg-accent-soft text-accent-soft-text'
                        : 'border-line text-faint hover:border-faint'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {needsAddress && (
              <div>
                <label className="block text-xs font-medium text-faint mb-1">
                  Practice address <span className="text-danger">*</span>
                </label>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  className={inputCls} placeholder="e.g. 12 Oak Ave, Rosebank, Johannesburg" />
                <p className="text-[10px] text-faint mt-1">Patients see this on a map, so enter a full address Google Maps can find.</p>
              </div>
            )}
            {form.consultationType !== 'in-person' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-faint mb-2">Video platform</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PLATFORMS.map(p => (
                      <button key={p.value} type="button" onClick={() => set('meetingPlatform', p.value)}
                        className={`py-2 px-2  text-xs font-medium border transition-colors ${
                          form.meetingPlatform === p.value
                            ? 'border-accent bg-accent-soft text-accent-soft-text'
                            : 'border-line text-faint hover:border-faint'
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-faint mb-1">
                    Meeting link <span className="text-faint font-normal">(optional, can be added later)</span>
                  </label>
                  <p className="text-xs text-faint mb-1">Shared with patients only after you confirm their appointment.</p>
                  <input value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)}
                    className={inputCls} placeholder={meetingPlaceholder} />
                </div>
              </>
            )}
          </Card>
          <Button className="w-full" disabled={!canProceed2} onClick={() => setStep(3)}>Continue →</Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {pendingPayment && (
            <div className=" bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              We're waiting for your payment to be confirmed. This usually takes a few
              seconds. Refresh this page once you've completed checkout, or choose a plan
              again to restart payment.
            </div>
          )}
          <p className="text-xs font-medium text-faint px-1">Choose your plan</p>

          {!trialUsed && (
            <button onClick={() => setPlan('trial')}
              className={`w-full text-left p-4  border-2 transition-all ${
                plan === 'trial'
                  ? 'border-accent bg-accent-soft/60'
                  : 'border-line hover:border-faint'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4  border-2 flex items-center justify-center flex-shrink-0 ${
                    plan === 'trial' ? 'border-accent bg-accent' : 'border-line'
                  }`}>
                    {plan === 'trial' && <div className="w-1.5 h-1.5  bg-white" />}
                  </div>
                  <span className="font-semibold text-ink text-sm">Free trial</span>
                  <span className="text-[10px] px-1.5 py-0.5  bg-success-500 text-white font-medium">Recommended</span>
                </div>
                <span className="font-bold text-ink text-base">{pricing.currency}0<span className="text-xs font-normal text-faint"> · {pricing.trialDays} days</span></span>
              </div>
              <ul className="space-y-1">
                {['All Standard features', 'No card required', `Then ${pricing.currency}${pricing.plans.standard.monthly}/mo, or cancel anytime`].map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-faint">
                    <Check size={10} className="text-success-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </button>
          )}
          {trialUsed && hasProfile && (
            <div className=" bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              Your {pricing.trialDays}-day free trial has been used. Choose a plan to keep your profile live.
            </div>
          )}

          {/* Billing cycle for the paid plans */}
          <div className="flex p-1 bg-raised/60 ">
            {[['monthly', 'Monthly'], ['annual', 'Annual · 2 months free']].map(([c, label]) => (
              <button key={c} onClick={() => setCycle(c)}
                className={`flex-1 py-2  text-xs font-semibold transition-all ${
                  cycle === c
                    ? 'bg-surface dark:bg-line text-ink shadow-sm'
                    : 'text-faint hover:text-ink'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)}
              className={`w-full text-left p-4  border-2 transition-all ${
                plan === p.id
                  ? 'border-accent bg-accent-soft/60'
                  : 'border-line hover:border-faint'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4  border-2 flex items-center justify-center flex-shrink-0 ${
                    plan === p.id ? 'border-accent bg-accent' : 'border-line'
                  }`}>
                    {plan === p.id && <div className="w-1.5 h-1.5  bg-white" />}
                  </div>
                  <span className="font-semibold text-ink text-sm">{p.label}</span>
                  {p.id === 'featured' && (
                    <span className="text-[10px] px-1.5 py-0.5  bg-warm-400 text-white font-medium">Popular</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-ink text-base">{pricing.currency}{p.price}<span className="text-xs font-normal text-faint">{perCycle}</span></span>
                  {cycle === 'annual' && (
                    <p className="text-[10px] text-success-600 dark:text-success-400 font-medium">
                      2 months free vs monthly
                    </p>
                  )}
                </div>
              </div>
              <ul className="space-y-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-faint">
                    <Check size={10} className="text-success-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </button>
          ))}

          <div className=" bg-raised px-3 py-2.5 text-xs text-muted">
            <span className="font-semibold text-ink">No per-session commission.</span> You keep 100% of your session fees. Your subscription is MentisFlow's only charge.
          </div>

          {plan !== 'trial' && (
            <div className=" bg-raised px-3.5 py-3 flex items-start gap-2.5">
              <CreditCard size={15} className="text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted leading-relaxed">
                <span className="font-semibold text-ink">Secure checkout with PayFast.</span>{' '}
                You'll be redirected to complete your subscription safely. Your listing goes
                live as soon as payment is confirmed.
              </p>
            </div>
          )}

          {activateError && (
            <p className="text-xs text-danger text-center">{activateError}</p>
          )}
          <Button className="w-full" disabled={saving} onClick={handleActivate}>
            {saving ? 'Activating…'
              : plan === 'trial' ? `Start ${pricing.trialDays}-day free trial`
              : `Subscribe for ${pricing.currency}${PLANS.find(p => p.id === plan)?.price}/${cycle === 'annual' ? 'year' : 'month'}`}
          </Button>
          <p className="text-center text-[11px] text-faint">
            By activating you agree to the{' '}
            <a href={`${import.meta.env.BASE_URL}terms`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Terms of Service</a>.
          </p>
        </div>
      )}
    </PageWrapper>
  )
}
