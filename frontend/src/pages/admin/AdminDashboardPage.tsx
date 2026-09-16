import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ConsumptionChart from '../../components/admin/ConsumptionChart'
import {
  apiDefinitions,
  apiSummary,
  buildRecords,
  buildSeries,
  compact,
  dateCount,
  exportReport,
  integer,
  isoDate,
  money,
  partnerDefinitions,
  partnerSummary,
  selectRecords,
  shiftDate,
  summarize,
} from '../../components/admin/analytics'
import type { Filters } from '../../components/admin/analytics'

function Card({
  title,
  subtitle,
  action,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#e0e5ef] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-[#151515]">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-[#6d7890]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
      {footer && (
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-[#465b78]">
          {footer}
        </div>
      )}
    </section>
  )
}
const button =
  'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-[#0450ff] px-4 py-2 text-xs font-medium text-white hover:bg-[#003bd0] disabled:cursor-not-allowed disabled:opacity-50'
const secondary =
  'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-[#e2e7ef] bg-white px-3 py-2 text-xs text-[#465b78] hover:bg-blue-50'
const colors = ['#0040c8', '#0450ff', '#006345', '#bec5da']
export default function AdminDashboardPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [today] = useState(() => isoDate(new Date()))
  const [records] = useState(() => buildRecords(today))
  const [api, setApi] = useState('all')
  const [partner, setPartner] = useState('all')
  const [environment, setEnvironment] = useState('all')
  const [start, setStart] = useState(() => shiftDate(today, -6))
  const [end, setEnd] = useState(today)
  const [lastSync, setLastSync] = useState(() => new Date())
  const [notice, setNotice] = useState('')
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [modal, setModal] = useState<'dates' | 'report' | 'alerts' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)
  const [dateError, setDateError] = useState('')
  useEffect(() => {
    const element = dialog.current
    if (modal && !element?.open) element?.showModal()
  }, [modal])
  const filters: Filters = useMemo(
    () => ({ api, partner, environment, start, end, query }),
    [api, partner, environment, start, end, query],
  )
  const selected = useMemo(
    () => selectRecords(records, filters),
    [records, filters],
  )
  const summary = useMemo(() => summarize(selected), [selected])
  const apis = useMemo(() => apiSummary(selected), [selected])
  const partners = useMemo(() => partnerSummary(selected), [selected])
  const series = useMemo(
    () => buildSeries(selected, start, end),
    [selected, start, end],
  )
  const days = dateCount(start, end)
  const previousStart = shiftDate(start, -days)
  const previousEnd = shiftDate(start, -1)
  const previous = useMemo(
    () =>
      summarize(
        selectRecords(records, {
          ...filters,
          start: previousStart,
          end: previousEnd,
        }),
      ),
    [records, filters, previousStart, previousEnd],
  )
  const comparisonAvailable =
    previousStart >= records[0].date && previous.calls > 0 && summary.calls > 0
  const revenueSorted = [...apis].sort((a, b) => b.revenue - a.revenue)
  const revenueGroups = [
    ...revenueSorted
      .slice(0, 3)
      .map((item) => ({ name: item.name, value: item.revenue })),
    ...(revenueSorted.length > 3
      ? [
          {
            name: 'Other APIs',
            value: revenueSorted
              .slice(3)
              .reduce((sum, item) => sum + item.revenue, 0),
          },
        ]
      : []),
  ].filter((item) => item.value > 0)
  let position = 0
  const gradient = revenueGroups
    .map((item, index) => {
      const from = position
      position += (item.value / summary.revenue) * 100
      return `${colors[index]} ${from}% ${position}%`
    })
    .join(',')
  const degraded = apis.filter(
    (item) => (item.failures / item.calls) * 100 >= 3 || item.uptime < 98,
  )
  const pending = degraded.filter((item) => !acknowledged.includes(item.id))
  const signed = (value: number, suffix = '') =>
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}${suffix}`
  const callDelta = previous.calls
      ? ((summary.calls - previous.calls) / previous.calls) * 100
      : 0,
    successDelta = summary.successRate - previous.successRate,
    latencyDelta = summary.latency - previous.latency,
    developerDelta = summary.developers - previous.developers
  const metrics = [
    {
      label: 'Total API Calls',
      value: compact(summary.calls),
      change: signed(callDelta, '%'),
      positive: callDelta >= 0,
      help: 'Total calls within the selected scope.',
    },
    {
      label: 'Success Rate',
      value: summary.calls ? `${summary.successRate.toFixed(1)}%` : '—',
      change: signed(successDelta, ' pts'),
      positive: successDelta >= 0,
      help: 'Successful calls divided by all calls; not uptime.',
    },
    {
      label: 'Avg Latency',
      value: summary.calls ? `${summary.latency.toFixed(1)} ms` : '—',
      change: signed(latencyDelta, ' ms'),
      positive: latencyDelta <= 0,
      help: 'Call-weighted mean latency, in milliseconds.',
    },
    {
      label: 'Active Developers',
      value: integer(summary.developers),
      change: `${developerDelta >= 0 ? '+' : ''}${developerDelta} developers`,
      positive: developerDelta >= 0,
      help: 'Distinct developer IDs in this selection.',
    },
  ]
  function close() {
    dialog.current?.close()
    setModal(null)
  }
  function openDates() {
    setDraftStart(start)
    setDraftEnd(end)
    setDateError('')
    setModal('dates')
  }
  function applyDates() {
    if (
      !draftStart ||
      !draftEnd ||
      draftStart > draftEnd ||
      draftStart < records[0].date ||
      draftEnd > today
    ) {
      setDateError('Choose a valid range within the available dates.')
      return
    }
    setStart(draftStart)
    setEnd(draftEnd)
    close()
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([exportReport(selected, filters)], {
        type: 'text/csv;charset=utf-8',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `portal-overview-${start}-to-${end}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(
      'Report downloaded with selected filters, summary metrics and daily records.',
    )
    close()
  }
  function clearSearch() {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('q')
      return next
    })
  }
  function reset() {
    setApi('all')
    setPartner('all')
    setEnvironment('all')
    setStart(shiftDate(today, -6))
    setEnd(today)
    clearSearch()
  }
  const rangeText = `${start} – ${end}`
  return (
    <div className="p-4 sm:p-6 lg:p-8 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-blue-600 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-blue-600">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10243a]">
              Portal Overview
            </h1>
            <p className="mt-2 text-sm text-[#465b78]">
              An overview of the portal
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[#65748d]">
              ↻ Synced{' '}
              {lastSync.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <button
              className={`${secondary} border-transparent bg-blue-50 text-blue-600`}
              onClick={() => {
                setLastSync(new Date())
                setNotice(
                  'Dashboard refreshed.',
                )
              }}
            >
              ⟳ Refresh
            </button>
            <button className={button} onClick={() => setModal('report')}>
              Create Report
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <h2 className="text-lg font-semibold">Insights</h2>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="admin-api">
              API filter
            </label>
            <select
              id="admin-api"
              value={api}
              onChange={(event) => setApi(event.target.value)}
              className={secondary}
            >
              <option value="all">All APIs</option>
              {apiDefinitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="admin-environment">
              Environment filter
            </label>
            <select
              id="admin-environment"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className={secondary}
            >
              <option value="all">All environments</option>
              <option>Production</option>
              <option>Sandbox</option>
            </select>
            <label className="sr-only" htmlFor="admin-partner">
              Partner filter
            </label>
            <select
              id="admin-partner"
              value={partner}
              onChange={(event) => setPartner(event.target.value)}
              className={secondary}
            >
              <option value="all">All partners</option>
              {partnerDefinitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className={secondary} onClick={openDates}>
              ▦ {rangeText}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            All panels use the selected period and filters
            
          </span>
          <button className="text-blue-600" onClick={reset}>
            Reset filters
          </button>
        </div>
        {query && (
          <p className="text-xs text-slate-600">
            Search: <strong>{query}</strong>{' '}
            <button className="ml-2 text-blue-600" onClick={clearSearch}>
              Clear search
            </button>
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700"
          >
            {notice}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-xl border border-[#e0e5ef] bg-white p-4 shadow-sm"
            >
              <h3 className="flex items-center justify-between gap-2 text-xs font-normal text-[#465b78]">
                {metric.label}
                <span
                  tabIndex={0}
                  title={metric.help}
                  aria-label={metric.help}
                  className="text-slate-400"
                >
                  ⓘ
                </span>
              </h3>
              <p className="mt-3 text-2xl font-bold">{metric.value}</p>
              <p
                className={`mt-3 border-t border-slate-100 pt-3 text-xs ${comparisonAvailable ? (metric.positive ? 'text-emerald-700' : 'text-red-600') : 'text-slate-500'}`}
              >
                {comparisonAvailable
                  ? `${metric.change} vs prior ${days} day${days === 1 ? '' : 's'}`
                  : 'Prior-period comparison unavailable'}
              </p>
            </article>
          ))}
        </div>
        {!selected.length && (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            No data matches this selection. Adjust or reset your filters.
          </p>
        )}
        <div className="grid items-stretch gap-4 xl:grid-cols-[2fr_1fr]">
          <Card
            title="API Consumption Over Time"
            subtitle="Total calls across selected partners"
            action={
              <div
                role="group"
                aria-label="Chart period"
                className="flex rounded-lg bg-slate-50 p-1"
              >
                {[
                  { label: '24h', value: 1 },
                  { label: '7d', value: 7 },
                  { label: '30d', value: 30 },
                ].map((item) => (
                  <button
                    key={item.value}
                    disabled={shiftDate(end, -item.value + 1) < records[0].date}
                    aria-pressed={days === item.value}
                    onClick={() => setStart(shiftDate(end, -item.value + 1))}
                    className={`rounded px-3 py-1 text-xs disabled:opacity-30 ${days === item.value ? 'bg-white font-semibold shadow-sm' : 'text-slate-500'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <ConsumptionChart points={series} />
          </Card>
          <Card
            title="Success vs. Failure"
            subtitle="Selected period"
            action={
              <Link className="text-xs text-blue-600" to="/admin/apis">
                View API Catalog ↗
              </Link>
            }
            footer={
              <div className="space-y-2">
                <p>Request success target: ≥ 98.0%</p>
                <p
                  className={
                    summary.calls && summary.successRate >= 98
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-red-600'
                  }
                >
                  {summary.calls
                    ? `${summary.successRate >= 98 ? 'Above' : 'Below'} target: ${Math.abs(summary.successRate - 98).toFixed(2)} percentage points`
                    : 'No requests in selected period'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Request success is distinct from service uptime.
                </p>
              </div>
            }
          >
            <div
              className="mt-3 flex h-4 overflow-hidden rounded-md bg-slate-100"
              role="img"
              aria-label={
                summary.calls
                  ? `${summary.successRate.toFixed(2)} percent successful requests`
                  : 'No requests'
              }
            >
              {summary.calls > 0 && (
                <>
                  <div
                    className="h-full bg-[#006345]"
                    style={{ width: `${summary.successRate}%` }}
                  />
                  <div
                    className="h-full bg-[#c5222b]"
                    style={{ width: `${100 - summary.successRate}%` }}
                  />
                </>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-600">
              <span>
                <span className="text-[#006345]">●</span> Success{' '}
                {summary.calls ? summary.successRate.toFixed(1) : '0'}%
              </span>
              <span>
                <span className="text-red-600">●</span> Failure{' '}
                {summary.calls ? (100 - summary.successRate).toFixed(1) : '0'}%
              </span>
            </div>
            <p className="mb-3 mt-6 text-xs font-medium text-[#465b78]">
              Error breakdown
            </p>
            <dl className="space-y-1">
              {[
                { label: '4xx (client errors)', value: summary.clientErrors },
                { label: '5xx (server errors)', value: summary.serverErrors },
                { label: 'Timeouts', value: summary.timeouts },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between rounded bg-[#f7f8fa] px-3 py-2 text-xs"
                >
                  <dt>{item.label}</dt>
                  <dd className="font-semibold">
                    {summary.calls
                      ? ((item.value / summary.calls) * 100).toFixed(2)
                      : '0.00'}
                    %
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <Card
            title="Most consumed APIs"
            subtitle="By call volume, selected period"
            action={
              <Link className="text-xs text-blue-600" to="/admin/apis">
                View API Catalog ↗
              </Link>
            }
            footer={
              <div className="flex flex-wrap justify-between gap-2">
                <span>{apis.length} services in selected scope</span>
                <Link to="/admin/apis" className="text-blue-600">
                  Manage API catalog →
                </Link>
              </div>
            }
          >
            <ol className="space-y-5 pt-2">
              {apis.slice(0, 5).map((item, index) => (
                <li key={item.id}>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                    <span>
                      <strong className="mr-2 text-blue-600">
                        #{index + 1}
                      </strong>
                      {item.name}
                    </span>
                    <strong>
                      {integer(item.calls)} calls (
                      {((item.calls / summary.calls) * 100).toFixed(1)}%)
                    </strong>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                    <div
                      className="h-full rounded-full bg-[#0340c8]"
                      style={{
                        width: `${(item.calls / (apis[0]?.calls || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[10px] text-slate-400">
              Percentages show share of all selected calls. Bars are scaled to
              the highest-volume API.
            </p>
          </Card>
          <Card
            title="Revenue by API"
            subtitle="Gross billed revenue, selected period"
            footer={
              <div className="flex justify-between gap-3">
                <span>Billing totals</span>
                <Link className="text-blue-600" to="/admin/billing">
                  Billing Ledger →
                </Link>
              </div>
            }
          >
            <div className="flex flex-col items-center gap-6 py-3 sm:flex-row">
              <div
                role="img"
                aria-label={`Gross revenue ${money(summary.revenue)}`}
                className="grid size-40 shrink-0 place-items-center rounded-full p-2"
                style={{
                  background: gradient
                    ? `conic-gradient(${gradient})`
                    : '#e8edf5',
                }}
              >
                <div className="grid size-full place-content-center rounded-full bg-white text-center">
                  <span className="text-xs uppercase text-[#465b78]">
                    Gross
                  </span>
                  <strong className="mt-1 text-xl">
                    {money(summary.revenue)}
                  </strong>
                </div>
              </div>
              <ul className="w-full flex-1 space-y-4">
                {revenueGroups.map((item, index) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: colors[index] }}
                      />
                      <span>
                        {item.name}
                        <span className="block text-xs text-slate-500">
                          ({((item.value / summary.revenue) * 100).toFixed(1)}%)
                        </span>
                      </span>
                    </span>
                    <strong>{money(item.value)}</strong>
                  </li>
                ))}
                {!revenueGroups.length && (
                  <li className="text-sm text-slate-500">
                    No billed revenue in this selection. Sandbox activity has no
                    charges.
                  </li>
                )}
              </ul>
            </div>
          </Card>
        </div>
        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <Card
            title="API Health Summary"
            subtitle="Availability and request quality, selected period"
            action={
              <Link className="text-xs text-blue-600" to="/admin/apis">
                View all APIs ↗
              </Link>
            }
            footer={
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {degraded.length
                      ? `${degraded.length} degraded service${degraded.length === 1 ? '' : 's'} · ${pending.length} unacknowledged`
                      : 'No degraded services in this selection'}
                  </span>
                  <button
                    disabled={!pending.length}
                    onClick={() => setModal('alerts')}
                    className="text-blue-600 disabled:text-slate-400"
                  >
                    Acknowledge Alerts
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Degraded if failures ≥ 3% or availability &lt; 98%.
                  Acknowledgement does not resolve an incident.
                </p>
              </div>
            }
          >
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[470px] text-left text-xs">
                <thead className="bg-[#f7f8fa] text-[10px] uppercase tracking-wide text-[#58708f]">
                  <tr>
                    {[
                      'Service name',
                      'Uptime',
                      'Latency',
                      'Error',
                      'Status',
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apis.map((item) => {
                    const bad = degraded.some(
                      (service) => service.id === item.id,
                    )
                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-slate-100 ${bad ? 'bg-red-50' : ''}`}
                      >
                        <th scope="row" className="px-4 py-4 font-semibold">
                          {item.name}
                          {acknowledged.includes(item.id) && bad && (
                            <span className="mt-1 block text-[10px] font-normal text-slate-500">
                              Acknowledged
                            </span>
                          )}
                        </th>
                        <td
                          className={`px-4 py-4 ${bad ? 'text-red-600' : 'text-[#58708f]'}`}
                        >
                          {item.uptime.toFixed(2)}%
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-[#58708f]">
                          {Math.round(item.latency)} ms
                        </td>
                        <td className="px-4 py-4 text-[#58708f]">
                          {((item.failures / item.calls) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-medium ${bad ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}
                          >
                            {bad ? 'Degraded' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {!apis.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center text-slate-500"
                      >
                        No matching services.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card
            title="Top Consumers"
            subtitle="Top partners by call count and revenue"
            action={
              <Link className="text-xs text-blue-600" to="/admin/developers">
                View partners ↗
              </Link>
            }
            footer={
              <div className="flex flex-wrap justify-between gap-3">
                <span>
                  Top {Math.min(4, partners.length)} partners generate{' '}
                  {summary.calls
                    ? (
                        (partners
                          .slice(0, 4)
                          .reduce((sum, item) => sum + item.calls, 0) /
                          summary.calls) *
                        100
                      ).toFixed(1)
                    : '0'}
                  % of selected API volume
                </span>
                <Link className="text-blue-600" to="/admin/developers">
                  Manage Partners
                </Link>
              </div>
            }
          >
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-xs">
                <thead className="bg-[#f7f8fa] text-[10px] uppercase tracking-wide text-[#58708f]">
                  <tr>
                    <th className="px-4 py-3">Partner name</th>
                    <th className="px-4 py-3">Calls</th>
                    <th className="px-4 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.slice(0, 4).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <th scope="row" className="px-4 py-5 font-semibold">
                        {item.name}
                      </th>
                      <td className="px-4 py-5 font-mono text-[#58708f]">
                        {integer(item.calls)}
                      </td>
                      <td className="px-4 py-5 font-mono text-[#58708f]">
                        {money(item.revenue)}
                      </td>
                    </tr>
                  ))}
                  {!partners.length && (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-6 text-center text-slate-500"
                      >
                        No matching partners.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <dialog
          ref={dialog}
          aria-labelledby="admin-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
          className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-lg overflow-auto rounded-2xl border-0 bg-white p-6 text-[#142033] shadow-xl backdrop:bg-black/40"
        >
          <div className="mb-5 flex justify-between gap-3">
            <h2 id="admin-dialog-title" className="text-lg font-semibold">
              {modal === 'dates'
                ? 'Select date range'
                : modal === 'report'
                  ? 'Create overview report'
                  : 'Acknowledge alerts'}
            </h2>
            <button
              onClick={close}
              aria-label="Close dialog"
              className="size-8 rounded hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          {modal === 'dates' && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                applyDates()
              }}
              className="space-y-4"
            >
              <p className="text-xs text-slate-500">
                Available dates: {records[0].date} to {today}
              </p>
              <label className="block text-sm">
                Start date
                <input
                  autoFocus
                  type="date"
                  required
                  min={records[0].date}
                  max={today}
                  value={draftStart}
                  onChange={(event) => setDraftStart(event.target.value)}
                  className="mt-2 block min-h-10 w-full rounded border border-slate-200 px-3"
                />
              </label>
              <label className="block text-sm">
                End date
                <input
                  type="date"
                  required
                  min={draftStart || records[0].date}
                  max={today}
                  value={draftEnd}
                  onChange={(event) => setDraftEnd(event.target.value)}
                  className="mt-2 block min-h-10 w-full rounded border border-slate-200 px-3"
                />
              </label>
              {dateError && (
                <p role="alert" className="text-xs text-red-600">
                  {dateError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={close} className={secondary}>
                  Cancel
                </button>
                <button type="submit" className={button}>
                  Apply dates
                </button>
              </div>
            </form>
          )}
          {modal === 'report' && (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                Export the selected filters, summary metrics and daily records to CSV.
              </p>
              <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-xs">
                <div className="flex justify-between">
                  <dt>Period</dt>
                  <dd>{rangeText}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Total calls</dt>
                  <dd>{integer(summary.calls)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Daily records</dt>
                  <dd>{integer(selected.length)}</dd>
                </div>
              </dl>
              <div className="flex justify-end gap-3">
                <button onClick={close} className={secondary}>
                  Cancel
                </button>
                <button onClick={download} className={button}>
                  Download CSV
                </button>
              </div>
            </div>
          )}
          {modal === 'alerts' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">
                Acknowledge these alerts. Service status
                will remain degraded.
              </p>
              <ul className="space-y-2 text-sm">
                {pending.map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
              <div className="flex justify-end gap-3">
                <button onClick={close} className={secondary}>
                  Cancel
                </button>
                <button
                  className={button}
                  onClick={() => {
                    setAcknowledged((current) => [
                      ...new Set([
                        ...current,
                        ...pending.map((item) => item.id),
                      ]),
                    ])
                    setNotice(
                      'Alerts acknowledged.',
                    )
                    close()
                  }}
                >
                  Acknowledge
                </button>
              </div>
            </div>
          )}
        </dialog>
      </div>
    </div>
  )
}
