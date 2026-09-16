import { Link } from 'react-router-dom'
import { compactNumber, describeError, duration, percent, relativeTime } from '../../lib/admin'
import type { PortalSummary, RequestLog } from '../../lib/portal'
import { Chip, EmptyState, MethodBadge, Panel, ShareBar, StatTile, StatusCode } from '../dash/ui'

/**
 * What the developer's integration actually did, from the gateway's audit trail.
 * Scoped to their own apps by the backend — this page cannot see anyone else's
 * traffic even if it asked.
 */
export default function Activity({
  summary,
  recent,
  windowLabel,
}: {
  summary: PortalSummary
  recent: RequestLog[]
  windowLabel: string
}) {
  const busiest = Math.max(...summary.by_app.map((a) => a.calls), 1)
  const healthy = summary.error_rate <= 0.05

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="API calls"
          value={compactNumber(summary.calls)}
          detail={windowLabel.toLowerCase()}
          tone="accent"
          hint="Every request your apps made through the gateway in this window."
        />
        <StatTile
          label="Error rate"
          value={summary.calls === 0 ? '—' : percent(summary.error_rate)}
          detail={
            summary.calls === 0
              ? 'No calls in this window'
              : `${summary.client_errors} rejected · ${summary.server_errors} server`
          }
          tone={summary.calls === 0 ? 'neutral' : healthy ? 'ok' : 'warn'}
          hint="Share of calls the gateway answered with status 400 or above."
        />
        <StatTile
          label="p95 latency"
          value={summary.calls === 0 ? '—' : duration(summary.p95_latency_ms)}
          detail="95% of calls were faster than this"
          tone="neutral"
          hint="The 95th percentile, not the average — averages hide the slow tail."
        />
        <StatTile
          label="Live consents"
          value={summary.active_consents}
          detail={`${summary.sandbox_consents} sandbox · ${summary.revoked_consents} revoked`}
          tone={summary.active_consents > 0 ? 'ok' : 'neutral'}
          hint="Customers who currently allow your apps to read their accounts."
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel
          title="Traffic by app"
          subtitle={`Calls per registered app, ${windowLabel.toLowerCase()}.`}
          footer={
            <Link to="/app/my-apis" className="font-medium text-[#0450ff] hover:underline">
              Manage apps →
            </Link>
          }
        >
          {summary.by_app.length === 0 ? (
            <EmptyState
              title="No apps yet"
              message="Register an app to get a client ID and secret, then its traffic shows up here."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {summary.by_app.map((app) => (
                <li key={app.app_id} className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-[#142033]">{app.name}</span>
                      {app.status === 'deactivated' && <Chip tone="bad">Deactivated</Chip>}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[#65758e]">
                      {app.calls.toLocaleString()} calls
                      {app.errors > 0 && <span className="text-red-600"> · {app.errors} failed</span>}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ShareBar fraction={app.calls / busiest} tone={app.status === 'deactivated' ? 'neutral' : 'accent'} />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-[#8ea3c0]">{app.client_id}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent requests"
          subtitle="The last calls your apps made, newest first."
          padded={false}
          footer={
            <Link to="/app/developer-portal?tab=logs" className="font-medium text-[#0450ff] hover:underline">
              Open full logs →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title="Nothing here yet"
                message="Make a call from the Sandbox and it will appear here within a second."
                action={
                  <Link
                    to="/app/sandbox"
                    className="inline-flex min-h-9 items-center rounded-lg border border-[#dfe6f0] bg-white px-3 text-xs font-semibold text-[#405371] hover:bg-blue-50"
                  >
                    Open the Sandbox →
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-[#eef2f8]">
              {recent.slice(0, 7).map((log) => (
                <li key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <StatusCode code={log.status_code} />
                  <MethodBadge method={log.method} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] text-[#142033]">{log.path}</span>
                    {log.error_code && (
                      <span className="text-[10px] text-red-700">{describeError(log.error_code)}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-[10px] tabular-nums text-[#8ea3c0]">
                    <span className="block">{relativeTime(log.created_at)}</span>
                    <span className="block">{log.duration_ms}ms</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
