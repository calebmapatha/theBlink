import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck, FileText, Upload, Download, Trash2, Plus, Loader, Users, StickyNote, ArrowLeft } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useVault } from '../hooks/useVault'
import {
  generateSaltB64, deriveVaultKey, makeCheck, verifyCheck,
  encryptJSON, decryptJSON, encryptBytes, decryptBytes,
} from '../utils/vault'

const inputCls = 'w-full px-3 py-2.5  border border-line bg-raised text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent'
const MAX_FILE_BYTES = 10 * 1024 * 1024

const ts = (t) => t?.seconds || 0
const fmtSize = (n) => n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

// The password gate: create the vault on first visit, unlock it afterwards.
// Deriving the key is deliberately slow (PBKDF2), hence the busy states.
function VaultGate({ meta, onUnlocked, onCreated }) {
  const isNew = !meta
  const [pw, setPw]       = useState('')
  const [pw2, setPw2]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (isNew) {
      if (pw.length < 8) { setError('Use at least 8 characters.'); return }
      if (pw !== pw2)    { setError('The passwords do not match.'); return }
    }
    setBusy(true)
    try {
      if (isNew) {
        const salt = generateSaltB64()
        const key = await deriveVaultKey(pw, salt)
        const check = await makeCheck(key)
        await onCreated({ salt, check }, key)
      } else {
        const key = await deriveVaultKey(pw, meta.salt)
        if (await verifyCheck(key, meta.check)) onUnlocked(key)
        else setError('Wrong vault password. Try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <Card className="p-7 text-center">
        <div className="w-14 h-14  bg-accent-soft flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-accent-soft-text" />
        </div>
        <h1 className="font-serif text-2xl tracking-tight text-ink">
          {isNew ? 'Set up your vault' : 'Client files'}
        </h1>
        <p className="text-xs text-faint mt-2 leading-relaxed">
          {isNew
            ? 'Choose a vault password. Your client files are encrypted on your device before they are stored, so only this password can open them.'
            : 'Enter your vault password to unlock your encrypted client files.'}
        </p>

        <form onSubmit={e => { e.preventDefault(); submit() }} className="mt-5 space-y-3 text-left">
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus
            placeholder={isNew ? 'Vault password (min 8 characters)' : 'Vault password'} className={inputCls} />
          {isNew && (
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              placeholder="Repeat vault password" className={inputCls} />
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="pill" className="w-full" disabled={busy || !pw}>
            {busy
              ? <><Loader size={14} className="animate-spin" /> {isNew ? 'Creating vault…' : 'Unlocking…'}</>
              : isNew ? 'Create vault' : 'Unlock'}
          </Button>
        </form>

        {isNew ? (
          <div className="mt-5 p-3  bg-warm-50 dark:bg-warm-500/10 border border-warm-200 dark:border-warm-500/30 text-left">
            <p className="text-[11px] text-warm-700 dark:text-warm-500 leading-relaxed">
              <strong>There is no reset.</strong> Because files are encrypted with this password,
              a forgotten vault password cannot be recovered — by anyone. Store it in a password manager.
            </p>
          </div>
        ) : (
          <p className="mt-5 text-[11px] text-faint leading-relaxed">
            Forgot it? The vault cannot be reset — that is what keeps your client files unreadable to anyone else.
          </p>
        )}
      </Card>
      <p className="text-center text-[11px] text-faint mt-4 flex items-center justify-center gap-1.5">
        <ShieldCheck size={12} className="text-accent" /> Encrypted on your device with AES-256. Nothing readable leaves it.
      </p>
    </div>
  )
}

function NoteModal({ open, onClose, initial, onSave }) {
  const [title, setTitle] = useState('')
  const [body, setBody]   = useState('')
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    if (open) { setTitle(initial?.title || ''); setBody(initial?.body || ''); setBusy(false) }
  }, [open])

  const save = async () => {
    setBusy(true)
    await onSave({ title: title.trim() || 'Untitled note', body })
    setBusy(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit note' : 'New note'}>
      <div className="space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title, e.g. Session 4 summary" className={inputCls} autoFocus />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={9}
          placeholder="Clinical notes… encrypted before saving." className={`${inputCls} resize-none`} />
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={busy || (!title.trim() && !body.trim())} onClick={save}>
            {busy ? 'Encrypting…' : 'Save note'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function ProviderVault() {
  const { user } = useAuth()
  const { showToast } = useApp()
  const navigate = useNavigate()
  const { getVaultMeta, createVaultMeta, listVaultDocs, addVaultDoc, updateVaultDoc, deleteVaultDoc, uploadVaultFile, downloadVaultFile, deleteVaultFile } = useVault()

  const [meta, setMeta]       = useState(undefined) // undefined = loading
  const [vaultKey, setVaultKey] = useState(null)    // in memory only — gone on lock/leave
  const [docs, setDocs]       = useState([])        // [{id, kind, clientId, plain, storagePath, updatedAt}]
  const [selected, setSelected] = useState(null)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [clientModal, setClientModal] = useState(false)
  const [clientName, setClientName]   = useState('')
  const [noteModal, setNoteModal]     = useState(null) // {note?} | null
  const [busyFile, setBusyFile]       = useState('')
  const fileRef = useRef()

  useEffect(() => {
    if (user) getVaultMeta(user.uid).then(setMeta)
  }, [user?.uid])

  const decryptAll = async (key) => {
    setLoadingDocs(true)
    const raw = await listVaultDocs(user.uid)
    const out = []
    for (const d of raw) {
      const plain = await decryptJSON(key, d.data)
      if (plain) out.push({ ...d, plain })
    }
    setDocs(out)
    setLoadingDocs(false)
  }

  const handleCreated = async (newMeta, key) => {
    await createVaultMeta(user.uid, newMeta)
    setMeta(newMeta)
    setVaultKey(key)
    setDocs([])
    showToast('Vault created. Keep that password safe!')
  }

  const handleUnlocked = async (key) => {
    setVaultKey(key)
    await decryptAll(key)
  }

  const lock = () => { setVaultKey(null); setDocs([]); setSelected(null) }

  const clients = docs.filter(d => d.kind === 'client')
    .sort((a, b) => (a.plain.name || '').localeCompare(b.plain.name || ''))
  const notesFor = (cid) => docs.filter(d => d.kind === 'note' && d.clientId === cid)
    .sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt))
  const filesFor = (cid) => docs.filter(d => d.kind === 'file' && d.clientId === cid)
    .sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt))
  const client = clients.find(c => c.id === selected) || null

  const addClient = async () => {
    const name = clientName.trim()
    if (!name) return
    const data = await encryptJSON(vaultKey, { name })
    const id = await addVaultDoc(user.uid, { kind: 'client', data })
    setDocs(prev => [...prev, { id, kind: 'client', clientId: null, plain: { name }, updatedAt: { seconds: Date.now() / 1000 } }])
    setClientModal(false)
    setClientName('')
    setSelected(id)
  }

  const saveNote = async (plain) => {
    const data = await encryptJSON(vaultKey, plain)
    if (noteModal?.note) {
      await updateVaultDoc(user.uid, noteModal.note.id, data)
      setDocs(prev => prev.map(d => d.id === noteModal.note.id ? { ...d, plain, updatedAt: { seconds: Date.now() / 1000 } } : d))
    } else {
      const id = await addVaultDoc(user.uid, { kind: 'note', clientId: selected, data })
      setDocs(prev => [...prev, { id, kind: 'note', clientId: selected, plain, updatedAt: { seconds: Date.now() / 1000 } }])
    }
  }

  const deleteNote = async (note) => {
    if (!confirm('Delete this note permanently?')) return
    await deleteVaultDoc(user.uid, note.id)
    setDocs(prev => prev.filter(d => d.id !== note.id))
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_FILE_BYTES) { showToast('Files up to 10 MB only.', { variant: 'error' }); return }
    setBusyFile('upload')
    try {
      const sealed = await encryptBytes(vaultKey, await file.arrayBuffer())
      const fileId = globalThis.crypto.randomUUID()
      const path = await uploadVaultFile(user.uid, fileId, sealed)
      const plain = { name: file.name, size: file.size, type: file.type || 'application/octet-stream' }
      const data = await encryptJSON(vaultKey, plain)
      const id = await addVaultDoc(user.uid, { kind: 'file', clientId: selected, data, storagePath: path })
      setDocs(prev => [...prev, { id, kind: 'file', clientId: selected, plain, storagePath: path, updatedAt: { seconds: Date.now() / 1000 } }])
      showToast('File encrypted and stored')
    } catch {
      showToast('Could not store the file. Please try again.', { variant: 'error' })
    }
    setBusyFile('')
  }

  const openFile = async (f) => {
    setBusyFile(f.id)
    try {
      const sealed = await downloadVaultFile(f.storagePath)
      const bytes = await decryptBytes(vaultKey, sealed)
      if (!bytes) throw new Error('decrypt')
      const url = URL.createObjectURL(new Blob([bytes], { type: f.plain.type }))
      const a = document.createElement('a')
      a.href = url
      a.download = f.plain.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch {
      showToast('Could not open the file.', { variant: 'error' })
    }
    setBusyFile('')
  }

  const deleteFile = async (f) => {
    if (!confirm(`Delete "${f.plain.name}" permanently?`)) return
    await deleteVaultFile(f.storagePath)
    await deleteVaultDoc(user.uid, f.id)
    setDocs(prev => prev.filter(d => d.id !== f.id))
  }

  const deleteClient = async (c) => {
    const items = [...notesFor(c.id), ...filesFor(c.id)]
    if (!confirm(`Delete ${c.plain.name} and their ${items.length} item${items.length === 1 ? '' : 's'} permanently?`)) return
    for (const it of items) {
      if (it.storagePath) await deleteVaultFile(it.storagePath)
      await deleteVaultDoc(user.uid, it.id)
    }
    await deleteVaultDoc(user.uid, c.id)
    setDocs(prev => prev.filter(d => d.id !== c.id && d.clientId !== c.id))
    setSelected(null)
  }

  if (meta === undefined) return (
    <PageWrapper wide>
      <div className="h-40  bg-raised animate-pulse mt-6" />
    </PageWrapper>
  )

  if (!vaultKey) return (
    <PageWrapper wide>
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-faint hover:text-accent-strong transition-colors">
        <ArrowLeft size={13} /> Back to dashboard
      </button>
      <VaultGate meta={meta} onUnlocked={handleUnlocked} onCreated={handleCreated} />
    </PageWrapper>
  )

  return (
    <PageWrapper wide>
      <header className="flex items-start justify-between gap-4 pb-7 border-b border-line mb-7 flex-wrap">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight tracking-tight text-ink">Client files</h1>
          <p className="text-sm text-faint mt-1 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-accent" /> Encrypted with your vault password. Locks when you leave.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="pill" onClick={lock}><Lock size={13} /> Lock</Button>
          <Button size="pill" onClick={() => setClientModal(true)}><Plus size={14} /> Add client</Button>
        </div>
      </header>

      {loadingDocs ? (
        <div className="h-40  bg-raised animate-pulse" />
      ) : clients.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12  bg-accent-soft flex items-center justify-center mx-auto mb-3">
            <Users size={20} className="text-accent-soft-text" />
          </div>
          <p className="text-sm font-medium text-muted">No clients in your vault yet</p>
          <p className="text-xs text-faint mt-1 max-w-xs mx-auto leading-relaxed">
            Add a client to keep encrypted session notes and documents for them, all behind your vault password.
          </p>
          <Button size="pill" className="mt-5" onClick={() => setClientModal(true)}><Plus size={14} /> Add your first client</Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Client list */}
          <aside className="space-y-2">
            {clients.map(c => {
              const count = notesFor(c.id).length + filesFor(c.id).length
              return (
                <button key={c.id} onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-4 py-3  border transition-colors ${
                    selected === c.id
                      ? 'border-accent/40 bg-accent-soft'
                      : 'border-line/60 bg-surface hover:border-faint'
                  }`}>
                  <p className="text-sm font-semibold text-ink truncate">{c.plain.name}</p>
                  <p className="text-[11px] text-faint mt-0.5">{count} item{count === 1 ? '' : 's'}</p>
                </button>
              )
            })}
          </aside>

          {/* Selected client */}
          <section className="lg:col-span-2">
            {!client ? (
              <Card className="p-10 text-center">
                <p className="text-sm text-faint">Select a client to see their notes and files.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="font-serif text-xl tracking-tight text-ink">{client.plain.name}</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="soft" size="sm" onClick={() => setNoteModal({})}><StickyNote size={13} /> New note</Button>
                    <Button variant="soft" size="sm" disabled={busyFile === 'upload'} onClick={() => fileRef.current?.click()}>
                      {busyFile === 'upload' ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />} Add file
                    </Button>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                  </div>
                </div>

                {notesFor(client.id).length === 0 && filesFor(client.id).length === 0 && (
                  <Card className="p-8 text-center">
                    <p className="text-xs text-faint">Nothing here yet. Add a session note or upload a document.</p>
                  </Card>
                )}

                {notesFor(client.id).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-faint">Notes · {notesFor(client.id).length}</p>
                    {notesFor(client.id).map(n => (
                      <Card key={n.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <button className="flex-1 min-w-0 text-left" onClick={() => setNoteModal({ note: n })}>
                            <p className="text-sm font-semibold text-ink truncate">{n.plain.title}</p>
                            {n.plain.body && <p className="text-xs text-muted mt-1 line-clamp-2 whitespace-pre-wrap">{n.plain.body}</p>}
                          </button>
                          <button onClick={() => deleteNote(n)} title="Delete note"
                            className="p-1.5  text-faint hover:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {filesFor(client.id).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-faint">Files · {filesFor(client.id).length}</p>
                    {filesFor(client.id).map(f => (
                      <Card key={f.id} className="p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9  bg-accent-soft flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="text-accent-soft-text" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{f.plain.name}</p>
                          <p className="text-[11px] text-faint">{fmtSize(f.plain.size)} · encrypted</p>
                        </div>
                        <button onClick={() => openFile(f)} disabled={busyFile === f.id} title="Decrypt and download"
                          className="p-1.5  text-faint hover:text-accent-strong hover:bg-accent-soft transition-colors flex-shrink-0">
                          {busyFile === f.id ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
                        </button>
                        <button onClick={() => deleteFile(f)} title="Delete file"
                          className="p-1.5  text-faint hover:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </Card>
                    ))}
                  </div>
                )}

                <button onClick={() => deleteClient(client)}
                  className="text-xs text-faint hover:text-danger transition-colors">
                  Delete {client.plain.name} and all their items
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="Add client">
        <div className="space-y-3">
          <p className="text-xs text-faint leading-relaxed">
            The client's name is encrypted too — it is only readable inside your unlocked vault.
          </p>
          <input value={clientName} onChange={e => setClientName(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === 'Enter') addClient() }}
            placeholder="Client name, e.g. T. Mokoena" className={inputCls} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setClientModal(false)}>Cancel</Button>
            <Button className="flex-1" disabled={!clientName.trim()} onClick={addClient}>Add client</Button>
          </div>
        </div>
      </Modal>

      <NoteModal open={!!noteModal} onClose={() => setNoteModal(null)} initial={noteModal?.note?.plain} onSave={saveNote} />
    </PageWrapper>
  )
}
