import { useCallback, useEffect, useState } from 'react'
import { Button, Chip, ErrorNote, MethodBadge, Panel, Segmented, Skeleton, StatGrid, StatTile } from '../../components/dash/ui'
import { marketplaceApis, type MarketplaceApi } from '../../data/marketplace'
import { ApiError, API_URL } from '../../lib/api'
import {
  WINDOW_LABELS,
  admin,
  compactNumber,
  duration,
  percent,
  relativeTime,
  type AnalyticsWindow,
  type EndpointUsage,
} from '../../lib/admin'

/**
 * The catalogue as the bank sees it: every product on the shelf — live or on
 * the roadmap — with what partners actually did with it in the window. The
 * product list is the same file the marketplace renders from, so the two can
 * never disagree; the usage is the gateway's audit trail, attributed to each
 * product through the routes it owns.
 */

const WINDOW_OPTIONS = (['1h', '6h', '24h', '7d', '30d'] as const).map((value) => ({ value, label: value }))

interface ProductUsage {
  api: MarketplaceApi
  calls: number
  errors: number
  partners: number
  p95: number
  lastCallAt: string | null
  endpoints: (EndpointUsage | { method: string; path: string; calls: 0; errors: 0; p95_latency_ms: 0; partners: 0; last_call_at: null })[]
}

/** Fold per-route usage into per-product usage using each product's declared routes. */
function attribute(usage: EndpointUsage[]): ProductUsage[] {
  const byRoute = new Map(usage.map((u) => [`${u.method} ${u.path}`, u]))
  return marketplaceApis.map((api) => {
    const endpoints = api.endpoints.map(
      (e) => byRoute.get(`${e.method} ${e.path}`) ?? { ...e, calls: 0 as const, errors: 0 as const, p95_latency_ms: 0 as const, partners: 0 as const, last_call_at: null },
    )
    const calls = endpoints.reduce((n, e) => n + e.calls, 0)
    const errors = endpoints.reduce((n, e) => n + e.errors, 0)
    const lastCallAt = endpoints.map((e) => e.last_call_at).filter((v): v is string => Boolean(v)).sort().at(-1) ?? null
    return {
      api,
      calls,
      errors,
      // Distinct partners per route is the best the endpoint rows can give; the max is a floor, never an overcount.
      partners: Math.max(0, ...endpoints.map((e) => e.partners)),
      p95: Math.max(0, ...endpoints.map((e) => e.p95_latency_ms)),
      lastCallAt,
      endpoints,
    }
  })
}

export default function AdminCatalogPage() {
  const [range, setRange] = useState<AnalyticsWindow>('24h')
  const [usage, setUsage] = useState<EndpointUsage[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(
    (window: AnalyticsWindow) =>
      admin
        .endpoints(window)
        .then((res) => {
          setUsage(res.data)
          setError('')
        })
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load the catalogue.'))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    void load(range)
  }, [load, range])

  function refresh() {
    setLoading(true)
    void load(range)
  }

  const products = usage ? attribute(usage) : null
  const live = products?.filter((p) => p.api.availability === 'live') ?? []
  const roadmap = products?.filter((p) => p.api.availability !== 'live') ?? []
  const totalCalls = live.reduce((n, p) => n + p.calls, 0)
  const totalErrors = live.reduce((n, p) => n + p.errors, 0)
  const windowLabel = WINDOW_LABELS[range].toLowerCase()

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-canvas px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-350 flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Control room</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">APIs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
              What is on the shelf and what partners are doing with it. The product list is the one the marketplace
              shows; the usage is the gateway&apos;s audit trail, {windowLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Reporting window" value={range} options={WINDOW_OPTIONS} onChange={setRange} />
            <Button secondary onClick={refresh} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
            <a
              href={`${API_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-body hover:bg-canvas"
            >
              OpenAPI reference ↗
            </a>
          </div>
        </header>

        {error && <ErrorNote message={error} onRetry={refresh} />}

        {!products && loading && <Skeleton rows={8} />}

        {products && (
          <>
            <StatGrid>
              <StatTile label="Live products" value={live.length} detail={`${roadmap.length} on the roadmap`} tone="accent" />
              <StatTile label="Product calls" value={compactNumber(totalCalls)} detail={windowLabel} />
              <StatTile
                label="Rejected"
                value={totalCalls === 0 ? '—' : percent(totalErrors / totalCalls)}
                detail={totalCalls === 0 ? 'No traffic in this window' : `${totalErrors} of ${totalCalls} calls`}
                tone={totalCalls === 0 ? 'neutral' : totalErrors / totalCalls <= 0.1 ? 'ok' : 'warn'}
              />
              <StatTile
                label="Most used"
                value={
                  live.some((p) => p.calls > 0) ? (
                    <span className="font-sans text-xl font-semibold tracking-tight">{live.slice().sort((a, b) => b.calls - a.calls)[0]!.api.title}</span>
                  ) : (
                    '—'
                  )
                }
                detail={live.some((p) => p.calls > 0) ? 'by calls in this window' : 'Nothing called yet'}
              />
            </StatGrid>

            <Panel
              title="Live products"
              subtitle="Callable on the gateway now. Select a product to see its routes."
              padded={false}
            >
              <ul className="divide-y divide-canvas">
                {live.map((p) => (
                  <ProductRow key={p.api.id} product={p} expanded={open === p.api.id} onToggle={() => setOpen(open === p.api.id ? null : p.api.id)} />
                ))}
              </ul>
            </Panel>

            <Panel
              title="Roadmap"
              subtitle="Listed on the marketplace as coming soon. Each needs a capability the core does not expose yet."
              padded={false}
            >
              <ul className="divide-y divide-canvas">
                {roadmap.map((p) => (
                  <li key={p.api.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{p.api.title}</span>
                        <Chip tone="neutral">Coming soon</Chip>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">{p.api.description}</span>
                    </span>
                    <span className="eyebrow">{p.api.category}</span>
                    <span className="code-chip">{p.api.scope}</span>
                    <span className="code-chip">{p.api.pricing}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}

function ProductRow({
  product: p,
  expanded,
  onToggle,
}: {
  product: ProductUsage
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full cursor-pointer items-center gap-6 px-5 py-4 text-left transition-colors hover:bg-canvas/60 ${expanded ? 'bg-tint/60' : ''}`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{p.api.title}</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-live">
              <span aria-hidden="true" className="size-[5px] rounded-full bg-live" />
              Live
            </span>
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            <span className="eyebrow">{p.api.category}</span>
            {p.api.scope !== '—' && <span className="code-chip">{p.api.scope}</span>}
          </span>
        </span>
        <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums">
          {compactNumber(p.calls)}
          <span className="block text-[10px] font-normal text-faint">calls</span>
        </span>
        <span className={`w-16 shrink-0 text-right font-mono text-sm tabular-nums ${p.errors > 0 ? 'text-amber-700' : ''}`}>
          {p.errors}
          <span className="block text-[10px] font-normal text-faint">rejected</span>
        </span>
        <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted">
          {p.lastCallAt ? relativeTime(p.lastCallAt) : '—'}
          <span className="block text-[10px] text-faint">{p.calls > 0 ? `p95 ${duration(p.p95)}` : 'no traffic'}</span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-canvas bg-canvas/40 px-5 py-4">
          <p className="text-xs leading-5 text-muted">{p.api.description}</p>
          <ul className="mt-3 divide-y divide-canvas rounded-xl border border-line bg-white">
            {p.endpoints.map((e) => (
              <li key={`${e.method} ${e.path}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5">
                <MethodBadge method={e.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{e.path}</span>
                <span className="text-xs tabular-nums text-muted">
                  <span className="font-mono text-ink">{compactNumber(e.calls)}</span> calls
                </span>
                <span className="text-xs tabular-nums text-muted">
                  <span className={`font-mono ${e.errors > 0 ? 'text-amber-700' : 'text-ink'}`}>{e.errors}</span> rejected
                </span>
                <span className="text-xs tabular-nums text-muted">
                  <span className="font-mono text-ink">{e.partners}</span> {e.partners === 1 ? 'partner' : 'partners'}
                </span>
                <span className="text-xs tabular-nums text-muted">
                  {e.calls > 0 ? `p95 ${duration(e.p95_latency_ms)}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
