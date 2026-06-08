import { useCallback } from 'react'
import { useUserLocalStorage } from './useLocalStorage'

const DEFAULT_PLAN = {
  goals:        [],
  medications:  [],
  sessionNotes: [],
  symptoms:     [],
}

export function useTreatmentPlan(userId) {
  const [plan, setPlan] = useUserLocalStorage(userId, 'treatment_plan', DEFAULT_PLAN)

  // Goals
  const addGoal = useCallback((goal) => {
    setPlan(p => ({
      ...p,
      goals: [...p.goals, { id: Date.now(), progress: 0, status: 'active', createdAt: new Date().toISOString(), ...goal }],
    }))
  }, [setPlan])

  const updateGoal = useCallback((id, updates) => {
    setPlan(p => ({ ...p, goals: p.goals.map(g => g.id === id ? { ...g, ...updates } : g) }))
  }, [setPlan])

  const deleteGoal = useCallback((id) => {
    setPlan(p => ({ ...p, goals: p.goals.filter(g => g.id !== id) }))
  }, [setPlan])

  // Medications
  const addMedication = useCallback((med) => {
    setPlan(p => ({
      ...p,
      medications: [...p.medications, { id: Date.now(), active: true, startDate: new Date().toISOString().split('T')[0], ...med }],
    }))
  }, [setPlan])

  const toggleMedication = useCallback((id) => {
    setPlan(p => ({ ...p, medications: p.medications.map(m => m.id === id ? { ...m, active: !m.active } : m) }))
  }, [setPlan])

  const deleteMedication = useCallback((id) => {
    setPlan(p => ({ ...p, medications: p.medications.filter(m => m.id !== id) }))
  }, [setPlan])

  // Session notes
  const addNote = useCallback((note) => {
    setPlan(p => ({
      ...p,
      sessionNotes: [{ id: Date.now(), date: new Date().toISOString().split('T')[0], ...note }, ...p.sessionNotes],
    }))
  }, [setPlan])

  const deleteNote = useCallback((id) => {
    setPlan(p => ({ ...p, sessionNotes: p.sessionNotes.filter(n => n.id !== id) }))
  }, [setPlan])

  // Symptoms
  const addSymptom = useCallback((symptom) => {
    setPlan(p => ({
      ...p,
      symptoms: [...p.symptoms, { id: Date.now(), ...symptom }],
    }))
  }, [setPlan])

  const updateSymptom = useCallback((id, updates) => {
    setPlan(p => ({ ...p, symptoms: p.symptoms.map(s => s.id === id ? { ...s, ...updates } : s) }))
  }, [setPlan])

  const deleteSymptom = useCallback((id) => {
    setPlan(p => ({ ...p, symptoms: p.symptoms.filter(s => s.id !== id) }))
  }, [setPlan])

  // Build a snapshot for sharing with a doctor
  const buildSnapshot = useCallback(() => ({
    goals:        plan.goals.filter(g => g.status === 'active'),
    medications:  plan.medications.filter(m => m.active),
    recentNotes:  plan.sessionNotes.slice(0, 3),
    symptoms:     plan.symptoms,
  }), [plan])

  return {
    plan,
    addGoal, updateGoal, deleteGoal,
    addMedication, toggleMedication, deleteMedication,
    addNote, deleteNote,
    addSymptom, updateSymptom, deleteSymptom,
    buildSnapshot,
  }
}
