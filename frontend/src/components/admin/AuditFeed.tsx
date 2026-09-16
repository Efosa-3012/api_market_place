import { useEffect, useRef, useState } from 'react'
import type { AuditCall } from '../../lib/admin'
import { clockTime, describeError } from '../../lib/admin'
import { Button, CopyButton, EmptyState, MethodBadge, Modal, Panel, Segmented, StatusCode } from '../dash/ui'

/**
 * The live audit trail: one row per request through the gateway.
 *
 * The rows that matter most are the rejections. A call refused because the
 * customer revoked consent still carries the partner it came from — the
 * `authenticate` middleware attributes the call before it runs its status
 * checks — so the feed can show a partner's traffic turning red the moment
 * access is withdrawn. That attribution is the whole point of this panel.
 */

type Filter = 'all' | 'errors'

export default function AuditFeed({
  calls,
  filter,
  onFilterChange,
  live,
  onLiveChange,
  onRefresh,
}: {
  calls: AuditCall[]
  filter: Filter
  onFilterChange: (next: Filter) => void
  live: boolean
  onLiveChange: (next: boolean) => void
  onRefresh: () => void
}) {
  // Rows that were not in the previous poll get a brief highlight so an
  // audience watching the feed sees the new request land.
  const seen = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(calls.map((c) => c.id))
      return
    }
    const next = calls.filter((c) => !seen.current!.has(c.id)).map((c) => c.id)
    if (next.length === 0) return
    for (const id of next) seen.current.add(id)
    setFresh(new Set(next))
    const timer = setTimeout(() => setFresh(new Set()), 4000)
    return () => clearTimeout(timer)
  }, [calls])

  const [selected, setSelected] = useState<AuditCall | null>(null)
  const rejected = calls.filter((call) => call.status_code >= 400).length

  return (
    <>
      <Panel
        title="Live audit trail"
        subtitle="Every request through the gateway, newest first."
        padded={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Filter the audit feed"
              value={filter}
              options={[
                { value: 'all', label: 'All calls' },
                { value: 'errors', label: 'Rejected only' },
              ]}
              onChange={onFilterChange}
            />
            <button
              type="button"
              onClick={() => onLiveChange(!live)}
              aria-pressed={live}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                live
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-[#dfe6f0] bg-white text-[#405371] hover:bg-blue-50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`}
              />
              {live ? 'Live' : 'Paused'}
            </button>
            <Button secondary onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        }
        footer={
          <span className="tabular-nums">
            {calls.length} most recent
            {rejected > 0 && <span className="text-red-600"> · {rejected} rejected</span>}
          </span>
        }
      >
        {calls.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              title={filter === 'errors' ? 'No rejected calls' : 'No traffic yet'}
              message={
                filter === 'errors'
                  ? 'No calls have been refused recently.'
                  : 'Requests appear here the moment a partner calls the gateway.'
              }
            />
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-[#eef2f8] text-[10px] uppercase tracking-wide text-[#8ea3c0]">
                  <th scope="col" className="px-5 py-2 font-medium">Time</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Partner</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Request</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Outcome</th>
                  <th scope="col" className="py-2 pr-5 text-right font-medium">Took</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const failed = call.status_code >= 400
                  const revocation = call.error_code === 'consent_revoked' || call.error_code === 'client_deactivated'
                  const isNew = fresh.has(call.id)
                  return (
                    <tr
                      key={call.id}
                      data-fresh={isNew || undefined}
                      onClick={() => setSelected(call)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelected(call)
                        }
                      }}
                      className={`cursor-pointer border-b border-[#f4f7fb] transition-colors duration-1000 last:border-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 ${
                        isNew ? (revocation ? 'bg-red-100' : failed ? 'bg-amber-100' : 'bg-blue-50') :
                        revocation ? 'bg-red-50/60 hover:bg-red-50' : failed ? 'hover:bg-amber-50/40' : 'hover:bg-[#f9fbfe]'
                      }`}
                    >
                      <td className="px-5 py-3 text-[11px] tabular-nums text-[#65758e]">
                        {clockTime(call.created_at)}
                      </td>
                      <td className="py-3 pr-3">
                        {call.client_name ? (
                          <span className="block max-w-[16ch] truncate text-xs font-medium text-[#142033]">
                            {call.client_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#b6c2d4]">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-2">
                          <MethodBadge method={call.method} />
                          <span className="max-w-[30ch] truncate font-mono text-[11px] text-[#465b78]">
                            {call.path}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-2">
                          <StatusCode code={call.status_code} />
                          {call.error_code && (
                            <span className={`text-[10px] ${revocation ? 'font-medium text-red-700' : 'text-[#8ea3c0]'}`}>
                              {describeError(call.error_code)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 pr-5 text-right text-[11px] tabular-nums text-[#8ea3c0]">
                        {call.duration_ms}ms
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected && (
        <Modal title="Audit record" onClose={() => setSelected(null)}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusCode code={selected.status_code} />
              <MethodBadge method={selected.method} />
              <span className="min-w-0 break-all font-mono text-xs text-[#142033]">{selected.path}</span>
            </div>

            {selected.error_code && (
              <div
                className={`rounded-xl border px-4 py-3 ${
                  selected.error_code === 'consent_revoked' || selected.error_code === 'client_deactivated'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p className="text-xs font-semibold text-[#142033]">{describeError(selected.error_code)}</p>
                <p className="mt-1 font-mono text-[11px] text-[#465b78]">{selected.error_code}</p>
              </div>
            )}

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-3 text-xs">
              {[
                ['Partner', selected.client_name ?? 'Not attributed'],
                ['Client ID', selected.client_id ?? '—'],
                ['On behalf of', selected.customer_id ?? 'No customer context'],
                ['Consent', selected.consent_id ?? 'Not tied to a consent'],
                ['Duration', `${selected.duration_ms}ms`],
                ['Source IP', selected.ip ?? '—'],
                ['When', new Date(selected.created_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="whitespace-nowrap text-[#8ea3c0]">{label}</dt>
                  <dd className="min-w-0 break-all font-mono text-[11px] text-[#142033]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-[#e1e8f2] bg-[#f7f9fc] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#142033]">Correlation ID</p>
                <CopyButton value={selected.correlation_id} />
              </div>
              <p className="mt-2 break-all font-mono text-[11px] text-[#465b78]">{selected.correlation_id}</p>
            </div>

          </div>
        </Modal>
      )}
    </>
  )
}
