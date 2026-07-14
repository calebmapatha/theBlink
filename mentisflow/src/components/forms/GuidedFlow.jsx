import { useState } from 'react'
import { Button } from '../ui/Button'

/**
 * GuidedFlow
 *
 * A reusable shell that turns any form into a step by step experience:
 * one question per screen, a plain language guide above each field, a
 * progress bar, and a review screen before saving.
 *
 * The guide can be switched off at any time. With the guide off, the
 * same steps render as a single classic form for practitioners who
 * prefer to fill everything in at once. The choice is remembered per
 * form via storageKey.
 *
 * Designed to sit inside <Modal> (the modal supplies the card chrome
 * and title). Describe any form as an array of steps:
 *
 *   { id, title, guide, optional?, render({values, setValues, guided}),
 *     summary?(values), validate?(values) -> error | null }
 *
 * See EditProfileGuided.jsx for a complete example.
 */

function readGuidePreference(storageKey, fallback = true) {
  if (!storageKey) return fallback
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw === null ? fallback : raw === 'on'
  } catch {
    return fallback
  }
}

function writeGuidePreference(storageKey, on) {
  if (!storageKey) return
  try {
    window.localStorage.setItem(storageKey, on ? 'on' : 'off')
  } catch {
    /* storage unavailable, ignore */
  }
}

export default function GuidedFlow({
  steps,
  initialValues,
  onSubmit,
  onCancel,
  storageKey,
  defaultGuided = true,
  submitLabel = 'Save',
}) {
  const [values, setAll] = useState(initialValues)
  const [guided, setGuided] = useState(() => readGuidePreference(storageKey, defaultGuided))
  const [stepIndex, setStepIndex] = useState(0) // steps.length === review screen
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const setValues = (patch) => {
    setAll(prev => ({ ...prev, ...patch }))
    setError(null)
  }

  const onReview = stepIndex === steps.length
  const current = onReview ? null : steps[stepIndex]
  const progress = Math.round((stepIndex / steps.length) * 100)

  const toggleGuide = () => {
    const next = !guided
    setGuided(next)
    writeGuidePreference(storageKey, next)
    setError(null)
  }

  const goNext = () => {
    if (current?.validate) {
      const message = current.validate(values)
      if (message) {
        setError(message)
        return
      }
    }
    setStepIndex(i => Math.min(i + 1, steps.length))
  }

  const goBack = () => setStepIndex(i => Math.max(i - 1, 0))

  const submit = async () => {
    for (const step of steps) {
      const message = step.validate?.(values)
      if (message) {
        setError(`${step.title}: ${message}`)
        if (guided) setStepIndex(steps.indexOf(step))
        return
      }
    }
    setSaving(true)
    try {
      await onSubmit(values)
    } finally {
      setSaving(false)
    }
  }

  const guideToggle = (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
      <span>Guide me</span>
      <button
        type="button"
        role="switch"
        aria-checked={guided}
        onClick={toggleGuide}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 overflow-hidden ${
          guided ? 'bg-accent' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            guided ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )

  /* ---------- Classic mode: everything on one screen ---------- */
  if (!guided) {
    return (
      <div>
        <div className="mb-4 flex justify-end">{guideToggle}</div>

        <div className="space-y-6">
          {steps.map(step => (
            <section key={step.id}>
              <h3 className="mb-1.5 text-sm font-medium text-ink">
                {step.title}
                {step.optional && (
                  <span className="ml-1 font-normal text-faint">(optional)</span>
                )}
              </h3>
              {step.render({ values, setValues, guided })}
            </section>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <footer className="mt-8 flex items-center gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" disabled={saving} onClick={submit}>
            {saving ? 'Saving…' : submitLabel}
          </Button>
        </footer>
      </div>
    )
  }

  /* ---------- Guided mode: one step per screen ---------- */
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-faint">
          {onReview ? 'Review your answers' : `Step ${stepIndex + 1} of ${steps.length}`}
        </p>
        {guideToggle}
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={onReview ? 100 : progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-accent transition-all motion-reduce:transition-none"
          style={{ width: `${onReview ? 100 : progress}%` }}
        />
      </div>

      {onReview ? (
        <div className="mt-5">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-raised">
            {steps.map((step, i) => (
              <li key={step.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-faint">{step.title}</p>
                  <p className="truncate text-sm text-ink">
                    {step.summary ? step.summary(values) : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStepIndex(i)}
                  className="shrink-0 text-sm font-medium text-accent hover:text-accent-strong"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <footer className="mt-6 flex items-center gap-2">
            <Button variant="ghost" className="flex-1" onClick={goBack}>Back</Button>
            <Button className="flex-1" disabled={saving} onClick={submit}>
              {saving ? 'Saving…' : submitLabel}
            </Button>
          </footer>
        </div>
      ) : (
        current && (
          <div key={current.id} className="mt-5">
            {/* Guide bubble: the friendly explanation for this step */}
            <div className="mb-4 flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-text"
              >
                ?
              </span>
              <p className="rounded-2xl rounded-tl-sm bg-accent-soft px-4 py-2.5 text-sm leading-relaxed text-accent-soft-text">
                {current.guide}
              </p>
            </div>

            <h3 className="mb-2 text-base font-medium text-ink">
              {current.title}
              {current.optional && (
                <span className="ml-1 text-sm font-normal text-faint">(optional)</span>
              )}
            </h3>

            {current.render({ values, setValues, guided })}

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <footer className="mt-8 flex items-center justify-between gap-2">
              {stepIndex > 0 ? (
                <Button variant="ghost" onClick={goBack}>Back</Button>
              ) : (
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              )}
              <div className="flex items-center gap-2">
                {current.optional && (
                  <Button variant="ghost" onClick={() => setStepIndex(i => i + 1)}>Skip</Button>
                )}
                <Button onClick={goNext}>
                  {stepIndex === steps.length - 1 ? 'Review' : 'Continue'}
                </Button>
              </div>
            </footer>
          </div>
        )
      )}
    </div>
  )
}
