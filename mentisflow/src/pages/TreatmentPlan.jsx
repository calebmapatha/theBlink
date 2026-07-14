import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, ChevronRight, ClipboardList, Target, Pill, FileText, Activity, X, Stethoscope } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageHeader } from '../components/layout/PageHeader'
import { DatePicker } from '../components/ui/DatePicker'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useProviders } from '../hooks/useProviders'
import { useTreatmentPlan } from '../hooks/useTreatmentPlan'

const GOAL_CATEGORIES = ['Anxiety', 'Depression', 'Sleep', 'Medication', 'Social', 'Work', 'Relationships', 'Self-care', 'Other']
const MED_FREQUENCIES  = ['Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly', 'Other']
const SESSION_TYPES    = ['Psychiatrist', 'Psychologist', 'Group therapy', 'Self-reflection', 'Other']
const SYMPTOM_FREQS    = ['Daily', 'Several times a week', 'Weekly', 'Occasionally', 'Rarely']

const SEVERITY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Noticeable', 4: 'Severe', 5: 'Very severe' }
const SEVERITY_COLORS = {
  1: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400',
  2: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  3: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  4: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  5: 'bg-red-200 text-red-800 dark:bg-red-700/30 dark:text-red-300',
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent'

// ── Goals ─────────────────────────────────────────────────────────────────────

function AddGoalModal({ open, onClose, onAdd }) {
  const [text, setText]       = useState('')
  const [category, setCategory] = useState('Other')
  const [targetDate, setTarget] = useState('')

  const handle = () => {
    if (!text.trim()) return
    onAdd({ text: text.trim(), category, targetDate })
    setText(''); setCategory('Other'); setTarget('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add treatment goal">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Goal description</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder="e.g. Reduce anxiety episodes to fewer than 2 per week"
            className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {GOAL_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? 'border-accent bg-accent-soft text-accent-soft-text'
                    : 'border-line text-faint hover:border-faint'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Target date (optional)</label>
          <DatePicker value={targetDate} onChange={setTarget}
            min={new Date().toISOString().split('T')[0]}
            clearable placeholder="Pick a target date" />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!text.trim()} onClick={handle}>Add goal</Button>
        </div>
      </div>
    </Modal>
  )
}

function GoalsTab({ plan, addGoal, updateGoal, deleteGoal }) {
  const [modalOpen, setModalOpen] = useState(false)
  const active    = plan.goals.filter(g => g.status === 'active')
  const completed = plan.goals.filter(g => g.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-faint">{active.length} active goal{active.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={13} /> Add goal</Button>
      </div>

      {active.length === 0 && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-raised flex items-center justify-center"><Target size={22} className="text-faint" /></div>
          <p className="text-sm text-faint">No goals yet.</p>
          <p className="text-xs text-faint mt-1">Add a treatment goal to track your progress.</p>
        </div>
      )}

      <AnimatePresence>
        {active.map(g => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => updateGoal(g.id, { status: 'completed' })}
                  className="mt-0.5 w-5 h-5 rounded-full border-2 border-line hover:border-accent flex items-center justify-center flex-shrink-0 transition-colors"
                  title="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink leading-snug">{g.text}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-soft text-accent-soft-text">{g.category}</span>
                    {g.targetDate && <span className="text-[10px] text-faint">Target: {g.targetDate}</span>}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-faint">Progress</span>
                      <span className="text-[10px] font-semibold text-accent">{g.progress}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" value={g.progress}
                      onChange={e => updateGoal(g.id, { progress: Number(e.target.value) })}
                      className="w-full accent-accent h-1.5"
                    />
                  </div>
                </div>
                <button onClick={() => deleteGoal(g.id)} className="text-faint hover:text-danger transition-colors flex-shrink-0 mt-0.5">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {completed.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-3">Completed ({completed.length})</p>
          <div className="space-y-2">
            {completed.map(g => (
              <Card key={g.id} className="p-3 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <Check size={10} className="text-white" />
                  </div>
                  <p className="text-sm text-ink flex-1 line-through">{g.text}</p>
                  <button onClick={() => updateGoal(g.id, { status: 'active' })} className="text-[10px] text-accent hover:underline">Reopen</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AddGoalModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addGoal} />
    </div>
  )
}

// ── Medications ───────────────────────────────────────────────────────────────

function AddMedModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', dosage: '', frequency: 'Once daily', prescribedBy: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = () => {
    if (!form.name.trim()) return
    onAdd(form)
    setForm({ name: '', dosage: '', frequency: 'Once daily', prescribedBy: '', notes: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add medication">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Medication name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sertraline" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-faint mb-1">Dosage</label>
            <input value={form.dosage} onChange={e => set('dosage', e.target.value)} placeholder="e.g. 50mg" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-faint mb-1">Frequency</label>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inputCls}>
              {MED_FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Prescribed by (optional)</label>
          <input value={form.prescribedBy} onChange={e => set('prescribedBy', e.target.value)} placeholder="Doctor name" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Notes (optional)</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Side effects, reminders..." />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!form.name.trim()} onClick={handle}>Add medication</Button>
        </div>
      </div>
    </Modal>
  )
}

function MedicationsTab({ plan, addMedication, toggleMedication, deleteMedication }) {
  const [modalOpen, setModalOpen] = useState(false)
  const active       = plan.medications.filter(m => m.active)
  const discontinued = plan.medications.filter(m => !m.active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-faint">{active.length} active medication{active.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={13} /> Add</Button>
      </div>

      {active.length === 0 && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-raised flex items-center justify-center"><Pill size={22} className="text-faint" /></div>
          <p className="text-sm text-faint">No medications tracked yet.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {active.map(m => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center flex-shrink-0">
                <Pill size={16} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">{m.name}</p>
                <p className="text-xs text-faint">{m.dosage} · {m.frequency}</p>
                {m.prescribedBy && <p className="text-[10px] text-faint mt-0.5">Prescribed by {m.prescribedBy}</p>}
                {m.notes && <p className="text-xs text-muted mt-1 italic">{m.notes}</p>}
                {m.startDate && <p className="text-[10px] text-faint mt-0.5">Since {m.startDate}</p>}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => toggleMedication(m.id)} className="text-[10px] text-faint hover:text-orange-500 transition-colors">Discontinue</button>
                <button onClick={() => deleteMedication(m.id)} className="text-faint hover:text-danger transition-colors self-end"><Trash2 size={13} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {discontinued.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-faint mb-3">Discontinued ({discontinued.length})</p>
          <div className="space-y-2">
            {discontinued.map(m => (
              <Card key={m.id} className="p-3 opacity-50">
                <div className="flex items-center gap-3">
                  <Pill size={14} className="text-faint flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted line-through">{m.name}</p>
                    <p className="text-xs text-faint">{m.dosage} · {m.frequency}</p>
                  </div>
                  <button onClick={() => toggleMedication(m.id)} className="text-[10px] text-accent hover:underline">Reactivate</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AddMedModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addMedication} />
    </div>
  )
}

// ── Session Notes ─────────────────────────────────────────────────────────────

function AddNoteModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ type: 'Psychiatrist', notes: '', moodBefore: 3, moodAfter: 3 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = () => {
    if (!form.notes.trim()) return
    onAdd(form)
    setForm({ type: 'Psychiatrist', notes: '', moodBefore: 3, moodAfter: 3 })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add session note">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-faint mb-2">Session type</label>
          <div className="flex flex-wrap gap-2">
            {SESSION_TYPES.map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.type === t
                    ? 'border-accent bg-accent-soft text-accent-soft-text'
                    : 'border-line text-faint hover:border-faint'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-faint mb-1">Mood before (1-5)</label>
            <input type="range" min="1" max="5" value={form.moodBefore} onChange={e => set('moodBefore', Number(e.target.value))} className="w-full accent-accent" />
            <p className="text-[10px] text-faint text-center">{form.moodBefore}/5</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-faint mb-1">Mood after (1-5)</label>
            <input type="range" min="1" max="5" value={form.moodAfter} onChange={e => set('moodAfter', Number(e.target.value))} className="w-full accent-accent" />
            <p className="text-[10px] text-faint text-center">{form.moodAfter}/5</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Notes and reflections</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} className={`${inputCls} resize-none`}
            placeholder="What did you discuss? Any insights or homework?" />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!form.notes.trim()} onClick={handle}>Save note</Button>
        </div>
      </div>
    </Modal>
  )
}

function NotesTab({ plan, addNote, deleteNote }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-faint">{plan.sessionNotes.length} note{plan.sessionNotes.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={13} /> Add note</Button>
      </div>

      {plan.sessionNotes.length === 0 && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-raised flex items-center justify-center"><FileText size={22} className="text-faint" /></div>
          <p className="text-sm text-faint">No session notes yet.</p>
          <p className="text-xs text-faint mt-1">Log reflections after each session to track your journey.</p>
        </div>
      )}

      <div className="space-y-3">
        {plan.sessionNotes.map(n => (
          <Card key={n.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-ink">{n.date}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-raised text-faint">{n.type}</span>
                  {n.moodBefore != null && (
                    <span className="text-[10px] text-faint">
                      Mood: {n.moodBefore}/5 → {n.moodAfter}/5
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{n.notes}</p>
              </div>
              <button onClick={() => deleteNote(n.id)} className="text-faint hover:text-danger transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <AddNoteModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addNote} />
    </div>
  )
}

// ── Symptoms ──────────────────────────────────────────────────────────────────

function AddSymptomModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', severity: 3, frequency: 'Weekly' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = () => {
    if (!form.name.trim()) return
    onAdd(form)
    setForm({ name: '', severity: 3, frequency: 'Weekly' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add symptom">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-faint mb-1">Symptom</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Intrusive thoughts, Low mood, Sleep issues" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-1">
            Severity: <span className="font-semibold text-ink">{SEVERITY_LABELS[form.severity]}</span>
          </label>
          <input type="range" min="1" max="5" value={form.severity} onChange={e => set('severity', Number(e.target.value))} className="w-full accent-accent" />
          <div className="flex justify-between text-[10px] text-faint mt-0.5">
            <span>Mild</span><span>Very severe</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-faint mb-2">Frequency</label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_FREQS.map(f => (
              <button key={f} onClick={() => set('frequency', f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.frequency === f
                    ? 'border-accent bg-accent-soft text-accent-soft-text'
                    : 'border-line text-faint hover:border-faint'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!form.name.trim()} onClick={handle}>Add symptom</Button>
        </div>
      </div>
    </Modal>
  )
}

function SymptomsTab({ plan, addSymptom, updateSymptom, deleteSymptom }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-faint">{plan.symptoms.length} symptom{plan.symptoms.length !== 1 ? 's' : ''} tracked</p>
        <Button size="sm" onClick={() => setModalOpen(true)}><Plus size={13} /> Add</Button>
      </div>

      {plan.symptoms.length === 0 && (
        <div className="py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-raised flex items-center justify-center"><Activity size={22} className="text-faint" /></div>
          <p className="text-sm text-faint">No symptoms tracked yet.</p>
          <p className="text-xs text-faint mt-1">Log symptoms to share with your practitioner.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {plan.symptoms.map(s => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[s.severity]}`}>
                    {SEVERITY_LABELS[s.severity]}
                  </span>
                </div>
                <p className="text-xs text-faint">{s.frequency}</p>
                <div className="mt-2">
                  <label className="text-[10px] text-faint mb-1 block">Update severity</label>
                  <input type="range" min="1" max="5" value={s.severity}
                    onChange={e => updateSymptom(s.id, { severity: Number(e.target.value) })}
                    className="w-full accent-accent h-1.5" />
                </div>
              </div>
              <button onClick={() => deleteSymptom(s.id)} className="text-faint hover:text-danger transition-colors flex-shrink-0 mt-0.5">
                <Trash2 size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <AddSymptomModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addSymptom} />
    </div>
  )
}

// ── Scripts (doctor-authored prescriptions, read-only to the patient) ─────────

function ScriptsTab({ scripts, loading, onAddToMeds }) {
  const [added, setAdded] = useState({})

  return (
    <div className="space-y-4">
      <p className="text-xs text-faint">
        {scripts.length} prescription{scripts.length !== 1 ? 's' : ''} from your practitioner
      </p>

      {loading ? (
        <div className="h-24 rounded-2xl bg-raised animate-pulse" />
      ) : scripts.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-raised flex items-center justify-center"><Pill size={22} className="text-faint" /></div>
          <p className="text-sm text-faint">No prescriptions yet.</p>
          <p className="text-xs text-faint mt-1">Scripts your doctor sends appear here. You manage your own current medications under the Medications tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scripts.map(rx => (
            <Card key={rx.id} className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent-soft flex items-center justify-center flex-shrink-0">
                  <Stethoscope size={15} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{rx.providerName || 'Your practitioner'}</p>
                  <p className="text-[10px] text-faint">{rx.createdAt?.toDate ? rx.createdAt.toDate().toLocaleDateString() : ''}</p>
                </div>
              </div>
              <div className="space-y-2">
                {(rx.items || []).map((it, i) => {
                  const key = `${rx.id}_${i}`
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-raised px-3 py-2">
                      <Pill size={13} className="text-accent flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{it.name}</p>
                        <p className="text-xs text-faint">{[it.dosage, it.frequency].filter(Boolean).join(' · ')}</p>
                        {it.instructions && <p className="text-xs text-muted mt-0.5 italic">{it.instructions}</p>}
                      </div>
                      <button disabled={added[key]}
                        onClick={() => { onAddToMeds(it); setAdded(a => ({ ...a, [key]: true })) }}
                        className="text-[10px] font-semibold text-accent hover:text-accent-strong disabled:text-success-500 disabled:cursor-default flex-shrink-0 mt-0.5">
                        {added[key] ? '✓ Added' : '+ To my meds'}
                      </button>
                    </div>
                  )
                })}
              </div>
              {rx.notes && <p className="text-xs text-muted mt-2.5 italic">{rx.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'goals',       label: 'Goals',       icon: Target },
  { key: 'medications', label: 'Medications',  icon: Pill },
  { key: 'scripts',     label: 'Scripts',      icon: Stethoscope },
  { key: 'notes',       label: 'Notes',        icon: FileText },
  { key: 'symptoms',    label: 'Symptoms',     icon: Activity },
]

export function TreatmentPlan() {
  const { userId, showToast } = useApp()
  const { getMyPrescriptions } = useProviders()
  const plan       = useTreatmentPlan(userId)
  const [tab, setTab] = useState('goals')

  // Doctor-authored prescriptions ("future scripts"), read-only to the patient.
  const [scripts, setScripts] = useState([])
  const [scriptsLoading, setScriptsLoading] = useState(true)
  useEffect(() => {
    if (!userId) return
    getMyPrescriptions(userId).then(rows => { setScripts(rows); setScriptsLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const addScriptToMeds = (it) => {
    plan.addMedication({ name: it.name, dosage: it.dosage || '', frequency: it.frequency || 'Once daily', prescribedBy: 'Prescribed by your doctor' })
    showToast('Added to your medications')
  }

  // Wrap a delete so removing health data shows an Undo toast and restores
  // the item in place instead of a silent permanent delete.
  const undoableDelete = (key, deleteFn, label) => (id) => {
    const list  = plan.plan[key]
    const index = list.findIndex(x => x.id === id)
    const item  = list[index]
    if (!item) return
    deleteFn(id)
    showToast(`${label} deleted`, { variant: 'info', action: { label: 'Undo', onClick: () => plan.restoreItem(key, item, index) } })
  }
  const deleteGoal       = undoableDelete('goals', plan.deleteGoal, 'Goal')
  const deleteMedication = undoableDelete('medications', plan.deleteMedication, 'Medication')
  const deleteNote       = undoableDelete('sessionNotes', plan.deleteNote, 'Note')
  const deleteSymptom    = undoableDelete('symptoms', plan.deleteSymptom, 'Symptom')

  const summary = {
    goals:       plan.plan.goals.filter(g => g.status === 'active').length,
    medications: plan.plan.medications.filter(m => m.active).length,
    scripts:     scripts.length,
    notes:       plan.plan.sessionNotes.length,
    symptoms:    plan.plan.symptoms.length,
  }

  return (
    <PageWrapper>
      <PageHeader
        icon={ClipboardList}
        eyebrow="Treatment Plan"
        title="My Treatment Plan"
        subtitle="Track goals, medications, session notes and symptoms. Share with your doctor when booking."
        className="mb-5"
      />

      {/* Summary strip */}
      <div className="grid grid-cols-5 gap-1.5 mb-5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`p-3 rounded-2xl text-center transition-all ${
              tab === key
                ? 'bg-accent text-on-accent shadow-md shadow-accent/20'
                : 'bg-surface border border-line text-faint hover:border-accent/40'
            }`}>
            <Icon size={16} className="mx-auto mb-1" />
            <p className="text-[10px] font-semibold">{summary[key]}</p>
            <p className="text-[9px] leading-tight">{label}</p>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}>
          {tab === 'goals'       && <GoalsTab       plan={plan.plan} addGoal={plan.addGoal} updateGoal={plan.updateGoal} deleteGoal={deleteGoal} />}
          {tab === 'medications' && <MedicationsTab plan={plan.plan} addMedication={plan.addMedication} toggleMedication={plan.toggleMedication} deleteMedication={deleteMedication} />}
          {tab === 'scripts'     && <ScriptsTab     scripts={scripts} loading={scriptsLoading} onAddToMeds={addScriptToMeds} />}
          {tab === 'notes'       && <NotesTab       plan={plan.plan} addNote={plan.addNote} deleteNote={deleteNote} />}
          {tab === 'symptoms'    && <SymptomsTab    plan={plan.plan} addSymptom={plan.addSymptom} updateSymptom={plan.updateSymptom} deleteSymptom={deleteSymptom} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 p-4 rounded-2xl border border-dashed border-accent/30 bg-accent-soft/60">
        <div className="flex items-start gap-2">
          <ClipboardList size={14} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-ink mb-0.5">Share with your doctor</p>
            <p className="text-xs text-faint">When booking an appointment in Connect, select "Treatment plan" to share your active goals, medications and symptoms with your practitioner.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
