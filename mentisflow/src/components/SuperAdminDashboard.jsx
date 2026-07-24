import { BarChart } from './ui/charts'

/**
 * SuperAdminDashboard
 *
 * A proper platform control centre for the Overview tab. The rule a
 * good admin dashboard follows: lead with what needs a decision, then
 * show how the platform is doing, then who is driving it.
 *
 *   1. Needs attention  — verification queue, flagged reports,
 *      expiring trials, suspended accounts. Actionable, not decorative.
 *   2. KPI grid         — with deltas vs the previous period, because
 *      a number without a trend is noise.
 *   3. HPCSA verification queue — approve or reject inline. This is
 *      the one queue a health marketplace can never let pile up.
 *   4. Bookings, 12 months.
 *   5. Top practitioners — who is generating the bookings.
 *   6. Recent activity   — last audit log entries, linking to the
 *      full Audit log tab.
 *
 * Uses the semantic theme tokens (bg-surface, text-ink, border-line,
 * bg-accent, warn/warn-soft) so light and dark mode both work.
 */

function Card({ title, action, children }) {
  return (
    <section className=" border border-line bg-surface p-5">
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              {title}
            </h3>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

function Delta({ value }) {
  const up = value >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-accent-soft-text' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {Math.abs(value)}% vs last month
    </span>
  )
}

export default function SuperAdminDashboard({
  kpis,
  attention,
  verificationQueue,
  monthlyBookings,
  topPractitioners,
  activity,
  onApprove,
  onReject,
  onOpenAuditLog,
  onExportBookings,
  onExportDoctors,
}) {
  const openAttention = attention.filter(a => a.count > 0)

  return (
    <div className="space-y-6">
      {/* 1. Needs attention — the reason an admin opens this page */}
      {openAttention.length > 0 && (
        <Card title="Needs attention">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {openAttention.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.onOpen}
                  className={`flex w-full items-center justify-between  border px-4 py-3 text-left text-sm transition-colors motion-reduce:transition-none ${
                    item.urgent
                      ? 'border-danger/40 text-danger hover:bg-danger/10'
                      : 'border-warn/40 text-warn hover:bg-warn-soft'
                  }`}
                >
                  <span className="pr-3">{item.label}</span>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center  px-1.5 text-xs font-semibold ${
                      item.urgent ? 'bg-danger/15 text-danger' : 'bg-warn-soft text-warn'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 2. KPI grid with deltas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className=" border border-line bg-surface p-4">
            <p className="text-xs text-faint">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{kpi.value}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {kpi.sub && <p className="text-xs text-muted">{kpi.sub}</p>}
              {typeof kpi.delta === 'number' && <Delta value={kpi.delta} />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 3. HPCSA verification queue */}
        <Card title={`Verification queue (${verificationQueue.length})`}>
          {verificationQueue.length === 0 ? (
            <p className="text-sm text-muted">
              No practitioners waiting. New sign-ups appear here until their
              HPCSA number is checked.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {verificationQueue.map(request => (
                <li key={request.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{request.name}</p>
                    <p className="text-xs text-muted">
                      {request.practitionerType}
                      {request.hpcsaNumber ? ` · HPCSA ${request.hpcsaNumber}` : ''}
                      {request.submitted ? ` · submitted ${request.submitted}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onApprove(request.id)}
                      className=" bg-accent px-3.5 py-1.5 text-xs font-medium text-on-accent hover:bg-accent-strong"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(request.id)}
                      className=" border border-line px-3.5 py-1.5 text-xs font-medium text-muted hover:text-danger"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 4. Bookings trend */}
        <Card title="Bookings, last 12 months">
          <BarChart data={monthlyBookings} />
        </Card>

        {/* 5. Top practitioners */}
        <Card title="Top practitioners">
          {topPractitioners.length === 0 ? (
            <p className="text-sm text-muted">No completed bookings yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-faint">
                  <th className="pb-2 font-medium">Practitioner</th>
                  <th className="pb-2 font-medium">Bookings</th>
                  <th className="pb-2 font-medium">Completion</th>
                  <th className="pb-2 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topPractitioners.map(doctor => (
                  <tr key={doctor.id}>
                    <td className="py-2.5 text-ink">{doctor.name}</td>
                    <td className="py-2.5 text-muted">{doctor.bookings}</td>
                    <td className="py-2.5 text-muted">
                      {doctor.completion === null ? '—' : `${doctor.completion}%`}
                    </td>
                    <td className="py-2.5 text-right text-ink">{doctor.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* 6. Recent activity — audit log preview */}
        <Card
          title="Recent activity"
          action={
            <button
              type="button"
              onClick={onOpenAuditLog}
              className="text-xs font-medium text-accent-soft-text hover:underline"
            >
              Full audit log
            </button>
          }
        >
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map(entry => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <span className="w-16 shrink-0 text-xs text-faint">{entry.when}</span>
                  <p className="text-muted min-w-0">
                    <span className="font-medium text-ink">{entry.actor}</span>{' '}
                    {entry.action}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Exports */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onExportBookings}
          className=" bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent-soft-text hover:opacity-90"
        >
          Export bookings CSV
        </button>
        <button
          type="button"
          onClick={onExportDoctors}
          className=" bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent-soft-text hover:opacity-90"
        >
          Export doctors CSV
        </button>
      </div>
    </div>
  )
}
