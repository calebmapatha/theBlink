import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Realtime feed of the current user's in-app notifications. Documents are
// created only by Cloud Functions; the client may read its own and flip them
// to read (enforced in firestore.rules). Capped at 25 for display; the
// backend already prunes older ones.
export function useInbox(userId) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!userId) { setItems([]); return }
    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(25),
    )
    const unsub = onSnapshot(
      q,
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setItems([]), // offline or rules rejection — fail quiet
    )
    return unsub
  }, [userId])

  const unreadCount = items.reduce((n, x) => n + (x.read ? 0 : 1), 0)

  const markRead = useCallback(async (id) => {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }) } catch { /* ignore */ }
  }, [])

  const markAllRead = useCallback(async () => {
    const unread = items.filter(x => !x.read)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach(x => batch.update(doc(db, 'notifications', x.id), { read: true }))
    try { await batch.commit() } catch { /* ignore */ }
  }, [items])

  return { items, unreadCount, markRead, markAllRead }
}
