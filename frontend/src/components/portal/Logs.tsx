import { useState } from 'react'
import type { Environment, RequestLog } from './model'
import { codeExample, dateTime, endpoints } from './model'
import { Badge, Button, CodeBlock, Field, Panel } from './ui'

export default function Logs({
  logs,
  environment,
  onReplay,
  onRetry,
}: {
  logs: RequestLog[]
  environment: Environment
  onReplay: (log: RequestLog) => void
  onRetry: (log: RequestLog) => boolean
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [api, setApi] = useState('all')
  const [days, setDays] = useState('7')
  const [page, setPage] = useState(1)
  const [ascending, setAscending] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('Request')
  const [notice, setNotice] = useState('')
  const [now] = useState(() => Date.now())
  const filtered = logs
    .filter(
      (log) =>
        log.environment === environment &&
        `${log.path} ${log.id}`.toLowerCase().includes(query.toLowerCase()) &&
        (status === 'all' ||
          (status === 'success' ? log.status < 400 : log.status >= 400)) &&
        (api === 'all' || api === log.api) &&
        (days === 'all' ||
          new Date(log.time).getTime() >= now - Number(days) * 86400000),
    )
    .sort(
      (a, b) =>
        (new Date(a.time).getTime() - new Date(b.time).getTime()) *
        (ascending ? 1 : -1),
    )
  const pages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10)
  const selected = filtered.find((log) => log.id === selectedId)
  function exportCsv() {
    const quote = (value: unknown) =>
      `"${String(value)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`
    const rows = [
      [
        'Time',
        'Request ID',
        'Environment',
        'Method',
        'Endpoint',
        'Status',
        'Latency ms',
      ],
      ...filtered.map((log) => [
        log.time,
        log.id,
        log.environment,
        log.method,
        log.path,
        log.status,
        log.latency,
      ]),
    ]
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `portal-${environment.toLowerCase()}-logs.csv`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${filtered.length} filtered requests.`)
  }
  const endpoint = selected
    ? endpoints.find((item) => item.id === selected.endpointId)
    : null
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button secondary onClick={exportCsv}>
          ↓ Export CSV
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
        <Field label="Search endpoint or request ID">
          <input
            type="search"
            placeholder="Search endpoint or request ID..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All statuses</option>
            <option value="success">Successful</option>
            <option value="error">Errors</option>
          </select>
        </Field>
        <Field label="API">
          <select
            value={api}
            onChange={(e) => {
              setApi(e.target.value)
              setPage(1)
            }}
          >
            <option value="all">All APIs</option>
            {[...new Set(logs.map((log) => log.api))].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Field label="Time range">
          <select
            value={days}
            onChange={(e) => {
              setDays(e.target.value)
              setPage(1)
            }}
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </Field>
      </div>
      {notice && (
        <p role="status" className="text-xs text-blue-700">
          {notice}
        </p>
      )}
      <div
        className={`grid items-start gap-5 ${selected ? 'xl:grid-cols-[1.4fr_1fr]' : ''}`}
      >
        <section
          aria-label="Request logs"
          className="min-w-0 overflow-hidden rounded-xl border border-[#e1e8f2] bg-white"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th
                    className="p-4"
                    aria-sort={ascending ? 'ascending' : 'descending'}
                  >
                    <button onClick={() => setAscending(!ascending)}>
                      Time {ascending ? '↑' : '↓'}
                    </button>
                  </th>
                  {['Method', 'Endpoint', 'Status', 'Latency', 'Details'].map(
                    (label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-t border-slate-100 ${selectedId === log.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-3 text-[11px] text-slate-500">
                      {dateTime(log.time)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-1 text-[10px] ${log.method === 'GET' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="max-w-48 break-all p-3 text-slate-600">
                      {log.path}
                    </td>
                    <td className="p-3">
                      <Badge bad={log.status >= 400} amber={log.status === 429}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap p-3 text-slate-500">
                      {log.latency} ms
                    </td>
                    <td className="p-3">
                      <button
                        aria-label={`Inspect ${log.id}`}
                        onClick={() => {
                          setSelectedId(log.id)
                          setDetailTab('Request')
                        }}
                        className="rounded p-2 text-blue-600"
                      >
                        →
                      </button>
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      No requests match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
            <span>
              Showing {filtered.length ? (currentPage - 1) * 10 + 1 : 0}–
              {Math.min(currentPage * 10, filtered.length)} of {filtered.length}{' '}
              requests
            </span>
            <div className="flex items-center gap-2">
              <Button
                secondary
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ‹
              </Button>
              <span>
                Page {currentPage} of {pages}
              </span>
              <Button
                secondary
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                ›
              </Button>
            </div>
          </div>
        </section>
        {selected && (
          <Panel
            title="Request details"
            action={
              <button
                aria-label="Close request details"
                onClick={() => setSelectedId(null)}
              >
                ✕
              </button>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge bad={selected.status >= 400}>
                  {selected.status}{' '}
                  {selected.status < 400 ? 'Success' : 'Error'}
                </Badge>
                <span>{selected.latency} ms</span>
                <span>{dateTime(selected.time)}</span>
              </div>
              <CodeBlock
                title="Endpoint"
                text={`${selected.method} ${selected.path}`}
              />
              <CodeBlock title="Request ID" text={selected.id} />
              <div
                role="group"
                aria-label="Request detail view"
                className="flex gap-5 border-b border-slate-100"
              >
                {['Request', 'Response', 'Headers'].map((tab) => (
                  <button
                    key={tab}
                    aria-pressed={detailTab === tab}
                    onClick={() => setDetailTab(tab)}
                    className={`pb-3 text-xs ${detailTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <CodeBlock
                title={detailTab}
                text={JSON.stringify(
                  detailTab === 'Request'
                    ? { body: selected.request, query: selected.query }
                    : detailTab === 'Response'
                      ? selected.response
                      : {
                          request: selected.headers,
                          response: {
                            'Content-Type': 'application/json',
                            'X-Request-ID': selected.id,
                          },
                        },
                  null,
                  2,
                )}
              />
              {endpoint && (
                <CodeBlock
                  title="cURL"
                  text={codeExample(
                    'cURL',
                    endpoint,
                    selected.request,
                    selected.environment,
                    selected.headers,
                    selected.query,
                  )}
                />
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  secondary
                  disabled={!endpoint}
                  onClick={() => onReplay(selected)}
                >
                  Open in API Explorer ↗
                </Button>
                <Button
                  disabled={!endpoint || environment === 'Production'}
                  onClick={() => {
                    setNotice(
                      onRetry(selected)
                        ? 'Retry added as a new request.'
                        : 'Retry unavailable. An active sandbox key is required.',
                    )
                  }}
                >
                  Retry Request ⟳
                </Button>
              </div>
              {!endpoint && (
                <p className="text-xs text-slate-500">
                  Webhook deliveries can be tested from the Webhooks tab.
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
