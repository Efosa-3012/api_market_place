import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api'
import { describeError, relativeTime } from '../../lib/admin'
import { portal } from '../../lib/portal'
import type { AppTraffic, LogStatusFilter, RequestLog } from '../../lib/portal'
import {
  Button,
  Chip,
  CopyButton,
  EmptyState,
  ErrorNote,
  MethodBadge,
  Modal,
  Panel,
  Segmented,
  Skeleton,
  StatusCode,
} from '../dash/ui'

/**
 * The developer's own request log — the same rows the bank's audit trail holds,
 * filtered to their apps.
 *
 * Paginates on the backend's keyset cursor rather than accumulating everything
 * client-side, so "Load more" stays correct while new calls arrive at the top.
 */

const STATUS_FILTERS: { value: LogStatusFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '2xx', label: 'Success' },
  { value: 'errors', label: 'Failed' },
  { value: '4xx', label: '4xx' },
  { value: '5xx', label: '5xx' },
]

function fullTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function Logs({ apps }: { apps: AppTraffic[] }) {
  const [status, setStatus] = useState<LogStatusFilter | 'all'>('all')
  const [appId, setAppId] = useState('')
  const [rows, setRows] = useState<RequestLog[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<RequestLog | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const page = await portal.logs({
        status: status === 'all' ? undefined : status,
        appId: appId || undefined,
        limit: 25,
      })
      setRows(page.data)
      setCursor(page.meta.pagination.next_cursor)
      setHasMore(page.meta.pagination.has_more)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your request log.')
    } finally {
      setLoading(false)
    }
  }, [status, appId])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await portal.logs({
        status: status === 'all' ? undefined : status,
        appId: appId || undefined,
        limit: 25,
        cursor,
      })
      setRows((current) => [...current, ...page.data])
      setCursor(page.meta.pagination.next_cursor)
      setHasMore(page.meta.pagination.has_more)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load more.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Request log"
        subtitle="Every call your apps made through the gateway, newest first. Select a row for the full record."
        padded={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {apps.length > 1 && (
              <label className="text-xs text-muted">
                <span className="sr-only">Filter by app</span>
                <select
                  value={appId}
                  onChange={(event) => setAppId(event.target.value)}
                  className="min-h-9 cursor-pointer rounded-lg border border-line bg-white px-3 text-xs text-ink"
                >
                  <option value="">All apps</option>
                  {apps.map((app) => (
                    <option key={app.app_id} value={app.app_id}>
                      {app.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Segmented label="Filter by outcome" value={status} options={STATUS_FILTERS} onChange={setStatus} />
            <Button secondary onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="tabular-nums">
              {rows.length} {rows.length === 1 ? 'call' : 'calls'} shown
            </span>
            {hasMore && (
              <Button secondary onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </div>
        }
      >
        {error && (
          <div className="px-5 pb-4">
            <ErrorNote message={error} onRetry={() => void load()} />
          </div>
        )}

        {loading ? (
          <div className="px-5 pb-5">
            <Skeleton rows={6} />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              title={status === 'all' ? 'No calls recorded yet' : 'Nothing matches this filter'}
              message={
                status === 'all'
                  ? 'Mint a sandbox token and call an endpoint — the request shows up here within a second.'
                  : 'Try a different outcome filter, or widen it to All.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-canvas text-xs uppercase tracking-wide text-faint">
                  <th scope="col" className="px-5 py-2 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Endpoint</th>
                  <th scope="col" className="py-2 pr-3 font-medium">App</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Took</th>
                  <th scope="col" className="py-2 pr-5 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelected(log)
                      }
                    }}
                    className="cursor-pointer border-b border-canvas last:border-0 hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                  >
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <StatusCode code={log.status_code} />
                        {log.error_code && (
                          <span className="hidden text-xs text-faint sm:inline">
                            {describeError(log.error_code)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="flex items-center gap-2">
                        <MethodBadge method={log.method} />
                        <span className="max-w-[26ch] truncate font-mono text-xs text-ink lg:max-w-none">
                          {log.path}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted">{log.app_name}</td>
                    <td className="py-3 pr-3 text-right text-xs tabular-nums text-muted">{log.duration_ms}ms</td>
                    <td className="py-3 pr-5 text-right text-xs tabular-nums text-faint">
                      {relativeTime(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected && (
        <Modal title="Request detail" onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusCode code={selected.status_code} />
              <MethodBadge method={selected.method} />
              <span className="min-w-0 break-all font-mono text-xs text-ink">{selected.path}</span>
            </div>

            {selected.error_code && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold text-red-800">{describeError(selected.error_code)}</p>
                <p className="mt-1 font-mono text-xs text-red-700">{selected.error_code}</p>
              </div>
            )}

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-xs">
              {[
                ['App', <span key="app">{selected.app_name}</span>],
                ['Client ID', <code key="cid" className="font-mono text-xs">{selected.client_id}</code>],
                [
                  'Consent',
                  selected.consent_id ? (
                    <code key="consent" className="break-all font-mono text-xs">{selected.consent_id}</code>
                  ) : (
                    <span key="noconsent" className="text-faint">Not tied to a consent</span>
                  ),
                ],
                ['Duration', <span key="dur" className="tabular-nums">{selected.duration_ms}ms</span>],
                ['When', <span key="when" className="tabular-nums">{fullTime(selected.created_at)}</span>],
              ].map(([label, value]) => (
                <div key={String(label)} className="contents">
                  <dt className="text-faint">{label}</dt>
                  <dd className="min-w-0 text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink">Correlation ID</p>
                <CopyButton value={selected.correlation_id} />
              </div>
              <p className="mt-2 break-all font-mono text-xs text-body">{selected.correlation_id}</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Returned on every response as <code className="font-mono">X-Correlation-Id</code>. Quote it when you
                raise a support request and we can find this exact call.
              </p>
            </div>

            {selected.error_code === 'consent_revoked' && (
              <Chip tone="warn">
                The customer withdrew access. Send them through the consent flow again to reconnect.
              </Chip>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
