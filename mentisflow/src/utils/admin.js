// Super Admin helpers. The email here must match isAdmin() in firestore.rules.
export const ADMIN_EMAIL = 'calebmapatha@gmail.com'
export const isAdminUser = (user) => user?.email === ADMIN_EMAIL

// Escape one CSV cell. Cells starting with =, +, -, @ or a tab/CR are
// prefixed with a quote so spreadsheet apps treat them as text instead of
// executing them as formulas (CSV injection) — these exports contain
// user-supplied strings like names and report reasons.
export const csvCell = (v) => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Client-side CSV export — free, no backend needed.
export function exportCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const esc = csvCell
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
