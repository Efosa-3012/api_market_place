import { useCallback, useEffect, useState } from 'react'
import { ApiError, portalSession } from '../../lib/api'
import {
  WINDOW_LABELS,
  admin,
  compactNumber,
  duration,
  percent,
} from '../../lib/admin'
import type {
  AnalyticsSummary,
  AnalyticsWindow,
  AuditCall,
  ClientTraffic,
  ConsentBreakdown,
  EndpointTraffic,
  TimeseriesPoint,
} from '../../lib/admin'
import { AreaChart, Button, ErrorNote, Panel, Segmented, ShareBar, Skeleton, StatTile } from '../../components/dash/ui'
import AuditFeed from '../../components/admin/AuditFeed'
import ConsentPanel from '../../components/admin/ConsentPanel'
import { PartnerTraffic, TopEndpoints } from '../../components/admin/PartnerTraffic'

/**
 * The bank's control room.
 *
 * Every figure comes from `/analytics/*`, which reads the `api_calls` audit
 * trail the gateway writes on every request, and the consents table. Nothing on
 * this page is estimated or sampled: if a number is here, a row exists behind it.
 *
 * Authenticated with the signed-in staff member's portal session, so the shared
 * admin key never reaches the browser.
 */

const WINDOW_OPTIONS = (['1h', '6h', '24h', '7d', '30d'] as const).map((value) => ({ value, label: value }))

const LIVE_POLL_MS = 3000
// Aggregates move slowly; refresh them every few feed ticks so the consent
// tiles still react during a demo without hammering the database.
const LIVE_SUMMARY_EVERY = 5

interface Data {
  summary: AnalyticsSummary
  series: { points: TimeseriesPoint[]; bucketSeconds: number }
  clients: ClientTraffic[]
  endpoints: EndpointTraffic[]
  consents: ConsentBreakdown
}

/** Bucket labels: a time of day for short windows, a date once it spans days. */
function bucketLabeller(bucketSeconds: number) {
  const byDay = bucketSeconds >= 3600
  return (iso: string) => {
    const date = new Date(iso)
    return byDay
      ? date.toLocaleDateString([], { day: '2-digit', month: 'short' })
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

export default function AdminDashboardPage() {
  const staff = portalSession.developer()
  const [range, setRange] = useState<AnalyticsWindow>('24h')
  const [data, setData] = useState<Data | null>(null)
  const [calls, setCalls] = useState<AuditCall[]>([])
  const [feedFilter, setFeedFilter] = useState<'all' | 'errors'>('all')
  const [live, setLive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)

  const loadFeed = useCallback(async () => {
    const recent = await admin.recentCalls({ limit: 60, errorsOnly: feedFilter === 'errors' })
    setCalls(recent.data)
  }, [feedFilter])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [summary, series, clients, endpoints, consents] = await Promise.all([
        admin.summary(range),
        admin.timeseries(range),
        admin.callsPerClient(),
        admin.topEndpoints(range),
        admin.consents(),
      ])
      setData({
        summary,
        series: { points: series.data, bucketSeconds: series.bucket_seconds },
        clients: clients.data,
        endpoints: endpoints.data,
        consents,
      })
      await loadFeed()
      setSyncedAt(new Date())
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 403
            ? 'This account does not have dashboard access.'
            : err.message
          : 'Could not reach the analytics service.',
      )
    } finally {
      setLoading(false)
    }
  }, [range, loadFeed])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // Live mode mostly refreshes the feed. The aggregate tiles only refresh every
  // LIVE_SUMMARY_EVERY ticks, since re-running every aggregate every few seconds
  // would hammer the database for numbers that barely move.
  useEffect(() => {
    if (!live) return
    let tick = 0
    const timer = setInterval(() => {
      tick += 1
      const refreshTiles = tick % LIVE_SUMMARY_EVERY === 0
      void Promise.all([
        loadFeed(),
        refreshTiles
          ? Promise.all([admin.summary(range), admin.consents(), admin.callsPerClient()]).then(([summary, consents, clients]) =>
              setData((current) => (current ? { ...current, summary, consents, clients: clients.data } : current)),
            )
          : Promise.resolve(),
      ])
        .then(() => setSyncedAt(new Date()))
        .catch(() => {
          /* transient poll failure — the next tick retries */
        })
    }, LIVE_POLL_MS)
    return () => clearInterval(timer)
  }, [live, range, loadFeed])

  useEffect(() => {
    if (!loading) void loadFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedFilter])

  const summary = data?.summary
  const successRate = summary && summary.calls > 0 ? 1 - summary.error_rate : null

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-[#f8f9fc] px-4 py-6 text-[#142033] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea3c0]">Control room</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">API &amp; consent oversight</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#465b78]">
              Who is calling the bank's APIs, on whose behalf, and under which consent. Drawn live from the gateway's
              audit trail{staff ? `, for ${staff.name}` : ''}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {syncedAt && (
              <span className="text-[11px] tabular-nums text-[#8ea3c0]">
                Synced {syncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <Segmented label="Reporting window" value={range} options={WINDOW_OPTIONS} onChange={setRange} />
            <Button secondary onClick={() => void loadAll()} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </header>

        {error && <ErrorNote message={error} onRetry={() => void loadAll()} />}

        {!data && loading && <Skeleton rows={10} />}

        {data && summary && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="API calls"
                value={compactNumber(summary.calls)}
                detail={WINDOW_LABELS[range].toLowerCase()}
                tone="accent"
                hint="All requests through the gateway, including rejected ones."
              />
              <StatTile
                label="Success rate"
                value={successRate === null ? '—' : percent(successRate)}
                detail={
                  summary.calls === 0
                    ? 'No traffic in this window'
                    : `${summary.client_errors} rejected · ${summary.server_errors} server errors`
                }
                tone={successRate === null ? 'neutral' : successRate >= 0.95 ? 'ok' : successRate >= 0.9 ? 'warn' : 'bad'}
                hint="Share of calls answered with status 400 or above."
              />
              <StatTile
                label="p95 latency"
                value={summary.calls === 0 ? '—' : duration(summary.p95_latency_ms)}
                detail={summary.calls === 0 ? '—' : `average ${duration(summary.avg_latency_ms)}`}
                tone="neutral"
                hint="95% of calls completed faster than this."
              />
              <StatTile
                label="Live consents"
                value={summary.active_consents}
                detail={`${summary.new_consents} granted · ${summary.revocations} withdrawn in window`}
                tone={summary.revocations > 0 ? 'warn' : 'ok'}
                hint="Customers who currently allow a partner to read their accounts."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Panel
                title="API traffic"
                subtitle={`Calls per ${data.series.bucketSeconds >= 3600 ? `${data.series.bucketSeconds / 3600} hour` : `${data.series.bucketSeconds / 60} minute`} bucket, ${WINDOW_LABELS[range].toLowerCase()}.`}
              >
                <AreaChart
                  points={data.series.points}
                  labelFor={bucketLabeller(data.series.bucketSeconds)}
                  height={240}
                />
              </Panel>

              <div className="flex flex-col gap-6">
                <Panel title="Outcomes" subtitle="How the gateway answered, by status class.">
                  {summary.calls === 0 ? (
                    <p className="text-xs text-[#65758e]">No calls in this window.</p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {[
                        {
                          label: 'Succeeded',
                          value: summary.calls - summary.errors,
                          tone: 'ok' as const,
                          note: '2xx',
                        },
                        {
                          label: 'Rejected by the gateway',
                          value: summary.client_errors,
                          tone: 'warn' as const,
                          note: '4xx — consent, scope, quota or bad request',
                        },
                        {
                          label: 'Server errors',
                          value: summary.server_errors,
                          tone: 'bad' as const,
                          note: '5xx — our fault',
                        },
                      ].map((row) => (
                        <li key={row.label}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-xs font-medium text-[#142033]">{row.label}</span>
                            <span className="text-xs tabular-nums text-[#65758e]">
                              {row.value.toLocaleString()}{' '}
                              <span className="text-[#b6c2d4]">
                                ({percent(summary.calls === 0 ? 0 : row.value / summary.calls, 0)})
                              </span>
                            </span>
                          </div>
                          <div className="mt-2">
                            <ShareBar fraction={summary.calls === 0 ? 0 : row.value / summary.calls} tone={row.tone} />
                          </div>
                          <p className="mt-1.5 text-[10px] text-[#8ea3c0]">{row.note}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Ecosystem" subtitle="Who is registered, and who is actually building.">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    {[
                      ['Developers', summary.developers, 'signed up on the portal'],
                      ['Registered apps', summary.clients_total, `${summary.clients_active} active`],
                      ['Calling now', summary.clients_calling, 'apps with traffic in window'],
                      ['Total consents', summary.total_consents, 'all time'],
                    ].map(([label, value, note]) => (
                      <div key={String(label)}>
                        <dt className="text-[11px] text-[#65758e]">{label}</dt>
                        <dd className="mt-1 text-xl font-semibold tabular-nums text-[#142033]">{value}</dd>
                        <p className="mt-0.5 text-[10px] text-[#8ea3c0]">{note}</p>
                      </div>
                    ))}
                  </dl>
                </Panel>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <ConsentPanel consents={data.consents} />
              <AuditFeed
                calls={calls}
                filter={feedFilter}
                onFilterChange={setFeedFilter}
                live={live}
                onLiveChange={setLive}
                onRefresh={() => void loadFeed().then(() => setSyncedAt(new Date()))}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <PartnerTraffic clients={data.clients} />
              <TopEndpoints endpoints={data.endpoints} windowLabel={WINDOW_LABELS[range]} />
            </div>

          </>
        )}
      </div>
    </div>
  )
}
