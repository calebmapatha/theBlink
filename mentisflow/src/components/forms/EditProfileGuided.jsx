import { useState } from 'react'
import { Loader, MapPin } from 'lucide-react'
import GuidedFlow from './GuidedFlow'
import { detectLocation } from '../../utils/geolocate'

/**
 * EditProfileGuided
 *
 * The practitioner Edit Profile form rebuilt as a guided flow. Six
 * short steps, each with a plain language guide bubble, then a review
 * screen. Switching the guide off collapses it back into a single
 * classic form, so nobody is forced through the steps.
 *
 * Field names match the provider document (bio, sessionFee, hideFee,
 * availability, meetingPlatform, meetingLink, city, province,
 * consultationType, address) so onSave feeds saveProvider unchanged.
 *
 * Use the same pattern for any other form: define the steps, hand
 * them to GuidedFlow.
 */

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent'

const PLATFORMS = [
  { value: 'zoom',    label: 'Zoom' },
  { value: 'meet',    label: 'Google Meet' },
  { value: 'teams',   label: 'MS Teams' },
  { value: 'whereby', label: 'Whereby' },
  { value: 'skype',   label: 'Skype' },
  { value: 'other',   label: 'Other' },
]

const SA_PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']

const CONSULT_TYPES = [
  ['remote',    'Online only'],
  ['in-person', 'In person'],
  ['both',      'Both'],
]

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm transition-colors motion-reduce:transition-none ${
        selected
          ? 'border-accent bg-accent-soft font-medium text-accent-soft-text'
          : 'border-line bg-raised text-muted hover:border-faint'
      }`}
    >
      {label}
    </button>
  )
}

// City/province inputs plus the "use my location" helper from the old modal.
function LocationFields({ values, setValues }) {
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  const handleUseLocation = async () => {
    setLocating(true)
    setLocError('')
    try {
      const { city, province } = await detectLocation()
      if (!city && !province) setLocError('Could not determine your location.')
      else setValues({ city: city || values.city, province: province || values.province })
    } catch (e) {
      setLocError(e.message)
    }
    setLocating(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">City</p>
          <input
            type="text"
            value={values.city}
            onChange={e => setValues({ city: e.target.value })}
            placeholder="Johannesburg"
            className={inputCls}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Province</p>
          <select
            value={values.province}
            onChange={e => setValues({ province: e.target.value })}
            className={inputCls}
          >
            <option value="">Choose a province</option>
            {SA_PROVINCES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="button" onClick={handleUseLocation} disabled={locating}
        className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-strong disabled:opacity-50 transition-colors">
        {locating ? <Loader size={12} className="animate-spin" /> : <MapPin size={12} />}
        {locating ? 'Finding your location…' : 'Use my current location'}
      </button>
      {locError && <p className="text-xs text-danger">{locError}</p>}
    </div>
  )
}

const steps = [
  {
    id: 'bio',
    title: 'Bio',
    guide:
      'Your bio is the first thing patients read. One or two sentences about what you treat and how you work is enough.',
    render: ({ values, setValues }) => (
      <textarea
        rows={4}
        value={values.bio}
        onChange={e => setValues({ bio: e.target.value })}
        placeholder="I specialise in ADHD and depression"
        className={`${inputCls} resize-none`}
      />
    ),
    summary: v => v.bio || 'Not added',
    validate: v => (v.bio.trim() ? null : 'Add a short bio so patients know what you treat.'),
  },
  {
    id: 'fee',
    title: 'Session fee (ZAR)',
    guide:
      'Enter your fee per session. If you prefer not to show it, tick the box and patients will see Fee on request instead.',
    render: ({ values, setValues }) => (
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-sm">R</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={values.sessionFee}
            onChange={e => setValues({ sessionFee: e.target.value })}
            className={`${inputCls} pl-7`}
          />
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={!!values.hideFee}
            onChange={e => setValues({ hideFee: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded accent-accent flex-shrink-0"
          />
          <span className="text-xs leading-relaxed">
            Hide my session fee from patients. Your profile will show
            &ldquo;Fee on request&rdquo; instead of the amount.
          </span>
        </label>
      </div>
    ),
    summary: v =>
      v.sessionFee
        ? `R${v.sessionFee}${v.hideFee ? ' (hidden from patients)' : ''}`
        : 'Not set',
    validate: v =>
      v.sessionFee && Number(v.sessionFee) > 0
        ? null
        : 'Enter your session fee, even if you hide it from patients.',
  },
  {
    id: 'availability',
    title: 'Availability',
    guide:
      'Describe your usual working hours in plain words. Your weekly diary controls the exact bookable slots, and patients can book up to six months ahead.',
    render: ({ values, setValues }) => (
      <input
        type="text"
        value={values.availability}
        onChange={e => setValues({ availability: e.target.value })}
        placeholder="Mon to Fri, 08:00 to 16:30"
        className={inputCls}
      />
    ),
    summary: v => v.availability || 'Not set',
    validate: v => (v.availability.trim() ? null : 'Describe your usual hours.'),
  },
  {
    id: 'platform',
    title: 'Video platform',
    guide:
      'Pick the platform you use for online sessions. You can paste a standing meeting link too, otherwise you can send one per booking.',
    render: ({ values, setValues }) => (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <Chip
              key={p.value}
              label={p.label}
              selected={values.meetingPlatform === p.value}
              onClick={() => setValues({ meetingPlatform: p.value })}
            />
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            Meeting link <span className="font-normal text-faint">(optional)</span>
          </p>
          <input
            type="url"
            value={values.meetingLink}
            onChange={e => setValues({ meetingLink: e.target.value })}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
      </div>
    ),
    summary: v => {
      const platform = PLATFORMS.find(p => p.value === v.meetingPlatform)
      return platform
        ? `${platform.label}${v.meetingLink ? ' · link added' : ''}`
        : 'Not chosen'
    },
    validate: v => (v.meetingPlatform ? null : 'Choose the platform you use.'),
  },
  {
    id: 'location',
    title: 'Location',
    guide:
      'Your city and province help patients searching near them, even if you only consult online.',
    render: ({ values, setValues }) => (
      <LocationFields values={values} setValues={setValues} />
    ),
    summary: v =>
      v.city || v.province ? [v.city, v.province].filter(Boolean).join(', ') : 'Not set',
    validate: v => (v.city && v.province ? null : 'Add your city and province.'),
  },
  {
    id: 'consultation',
    title: 'Consultation type',
    guide:
      'Tell patients how you consult. Choose Both if you see patients online and in your rooms.',
    render: ({ values, setValues }) => (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {CONSULT_TYPES.map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={values.consultationType === value}
              onClick={() => setValues({ consultationType: value })}
            />
          ))}
        </div>
        {(values.consultationType === 'in-person' || values.consultationType === 'both') && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Practice address</p>
            <input
              type="text"
              value={values.address}
              onChange={e => setValues({ address: e.target.value })}
              placeholder="e.g. 12 Oak Ave, Rosebank, Johannesburg"
              className={inputCls}
            />
            <p className="mt-1 text-[10px] text-faint">
              Shown to patients on a map — use a full address Google Maps can find.
            </p>
          </div>
        )}
      </div>
    ),
    summary: v => {
      const label = CONSULT_TYPES.find(([value]) => value === v.consultationType)?.[1]
      if (!label) return 'Not chosen'
      return v.consultationType === 'remote' ? label : `${label}${v.address ? ` · ${v.address}` : ''}`
    },
    validate: v => (v.consultationType ? null : 'Choose how you consult.'),
  },
]

export default function EditProfileGuided({ initialValues, onSave, onCancel }) {
  return (
    <GuidedFlow
      steps={steps}
      initialValues={initialValues}
      onSubmit={onSave}
      onCancel={onCancel}
      storageKey="guide:edit-profile"
      defaultGuided
      submitLabel="Save profile"
    />
  )
}
