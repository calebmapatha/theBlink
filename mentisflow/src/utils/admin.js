// Super Admin helpers. The email here must match isAdmin() in firestore.rules.
export const ADMIN_EMAIL = 'calebmapatha@gmail.com'
export const isAdminUser = (user) => user?.email === ADMIN_EMAIL

// Client-side CSV export — free, no backend needed.
export function exportCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
