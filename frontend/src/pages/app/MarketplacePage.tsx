import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { marketplaceApis } from '../../data/marketplace'
import type { MarketplaceApi } from '../../data/marketplace'
import { compactNumber, duration } from '../../lib/admin'
import { portal, type PortalSummary } from '../../lib/portal'

const categories = [...new Set(marketplaceApis.map((api) => api.category))]

const authenticationTypes = ['OAuth 2.0']
const popularityOptions = ['Most used', 'Trending', 'New']

interface FilterGroupProps {
  title: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  counts?: Record<string, number>
  defaultOpen?: boolean
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  counts,
  defaultOpen = false,
}: FilterGroupProps) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-line py-5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
        {title}

        <svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-muted group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <fieldset className="mt-3 space-y-1">
        <legend className="sr-only">{title}</legend>

        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-body"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="size-4 shrink-0 cursor-pointer accent-primary"
            />

            <span className="flex-1">{option}</span>
            {counts && (
              <span className="font-mono text-[10px] tabular-nums text-faint">
                {String(counts[option] ?? 0).padStart(2, '0')}
              </span>
            )}
          </label>
        ))}
      </fieldset>
    </details>
  )
}

/** A green dot and a mono word: the one way "live" is said anywhere in the app. */
function LiveMark({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] ${
        live ? 'text-live' : 'text-faint'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-[5px] rounded-full ${live ? 'bg-live' : 'bg-faint'}`}
      />
      {live ? 'Live' : 'Coming soon'}
    </span>
  )
}

function ApiCard({ api }: { api: MarketplaceApi }) {
  const live = api.availability === 'live'
  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-5 transition-[border-color,box-shadow] hover:border-[#c9d2e4] hover:shadow-[0_2px_8px_rgba(14,23,38,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-muted">{api.category}</span>
        <LiveMark live={live} />
      </div>

      <h2 className="mt-3.5 text-[17px] font-semibold leading-tight tracking-[-0.02em]">
        {api.title}
      </h2>

      <p className="mt-2 text-[13px] leading-relaxed text-muted text-pretty">
        {api.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {api.scope !== '—' && <span className="code-chip">{api.scope}</span>}
        <span className="code-chip">{api.authentication}</span>
        <span className="code-chip">{api.pricing}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-4">
        <span className="font-mono text-[10px] text-faint">{api.popularity}</span>

        {live ? (
          <Link
            to={`/app/marketplace/${api.id}`}
            aria-label={`Explore ${api.title}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-ink transition-colors hover:border-blue-300 hover:bg-tint hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Explore
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <span
            aria-label={`${api.title} is coming soon`}
            className="inline-flex h-8 cursor-not-allowed items-center rounded-lg border border-line bg-canvas px-3 text-xs font-semibold text-faint"
          >
            Coming soon
          </span>
        )}
      </div>
    </article>
  )
}

/**
 * Three figures under the banner. Only numbers the signed-in developer can
 * actually see: the catalogue size, and their own traffic from /portal/summary.
 * No platform-wide uptime or latency — that lives on the staff dashboard.
 */
function LiveNumbers({ liveCount }: { liveCount: number }) {
  const [summary, setSummary] = useState<PortalSummary | null | undefined>(undefined)

  useEffect(() => {
    portal
      .summary('24h')
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const calls = summary === undefined ? '…' : summary === null ? '—' : compactNumber(summary.calls)
  const p95 =
    summary === undefined ? '…' : !summary || summary.calls === 0 ? '—' : duration(summary.p95_latency_ms)

  const items: [string, string][] = [
    [String(liveCount).padStart(2, '0'), 'Live products'],
    [calls, 'Your calls · 24h'],
    [p95, 'p95 latency · 24h'],
  ]

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-b border-line py-5">
      {items.map(([value, label]) => (
        <div key={label}>
          <dd className="font-mono text-[26px] font-medium leading-none tracking-[-0.03em] text-ink">{value}</dd>
          <dt className="eyebrow mt-1.5">{label}</dt>
        </div>
      ))}
    </dl>
  )
}

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAuthentication, setSelectedAuthentication] = useState<string[]>([])
  const [selectedPopularity, setSelectedPopularity] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  function toggleValue(values: string[], value: string) {
    return values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]
  }

  function updateSearch(value: string) {
    const nextParams = new URLSearchParams(searchParams)

    if (value) {
      nextParams.set('q', value)
    } else {
      nextParams.delete('q')
    }

    setSearchParams(nextParams, { replace: true })
  }

  function clearFilters() {
    setSelectedCategories([])
    setSelectedAuthentication([])
    setSelectedPopularity([])
  }

  function resetResults() {
    clearFilters()
    updateSearch('')
  }

  const categoryCounts = marketplaceApis.reduce<Record<string, number>>(
    (counts, api) => {
      counts[api.category] = (counts[api.category] ?? 0) + 1
      return counts
    },
    {},
  )

  const normalizedQuery = query.trim().toLowerCase()

  const filteredApis = marketplaceApis.filter((api) => {
    const searchableText =
      `${api.title} ${api.description} ${api.category} ${api.pricing}`
        .toLowerCase()

    const matchesSearch = searchableText.includes(normalizedQuery)

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(api.category)

    const matchesAuthentication =
      selectedAuthentication.length === 0 ||
      selectedAuthentication.includes(api.authentication)

    const matchesPopularity =
      selectedPopularity.length === 0 ||
      selectedPopularity.includes(api.popularity)

    return (
      matchesSearch &&
      matchesCategory &&
      matchesAuthentication &&
      matchesPopularity
    )
  })

  const selectedFilterCount =
    selectedCategories.length +
    selectedAuthentication.length +
    selectedPopularity.length

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
      <section
        aria-labelledby="marketplace-title"
        className="relative isolate overflow-hidden rounded-xl bg-tint px-5 py-7 sm:px-6 sm:py-8"
      >
        <img
          src="/images/Marketplace.png"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-tint via-tint/95 to-transparent" />

        <p className="eyebrow">Marketplace</p>

        <h1
          id="marketplace-title"
          className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
        >
          APIs for a more connected Africa
        </h1>

        <p className="mt-3 max-w-lg text-sm leading-6 text-muted text-pretty">
          Discover, test and integrate Stanbic IBTC banking capabilities. Live
          products are callable from the sandbox today; the rest is the roadmap.
        </p>
      </section>

      <LiveNumbers liveCount={marketplaceApis.filter((api) => api.availability === 'live').length} />

      <div className="mt-6">
        <label
          htmlFor="marketplace-search"
          className="mb-2 block text-sm font-semibold"
        >
          Search APIs
        </label>

        <div className="relative">
          <svg
            aria-hidden="true"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          >
            <circle cx="10.5" cy="10.5" r="7" />
            <path d="m16 16 5 5" />
          </svg>

          <input
            id="marketplace-search"
            type="search"
            value={query}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-lg border border-line bg-canvas pl-10 pr-4 text-sm outline-none placeholder:text-faint focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside aria-label="API filters">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow">
              Filters
              {selectedFilterCount > 0 && (
                <span className="ml-2 text-primary">
                  ({selectedFilterCount})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-9 cursor-pointer text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Clear all
              </button>

              <button
                type="button"
                aria-expanded={mobileFiltersOpen}
                aria-controls="marketplace-filters"
                onClick={() => setMobileFiltersOpen((current) => !current)}
                className="min-h-9 cursor-pointer rounded-lg border border-line px-3 text-xs text-body focus-visible:outline-2 focus-visible:outline-blue-600 xl:hidden"
              >
                {mobileFiltersOpen ? 'Hide filters' : 'Show filters'}
              </button>
            </div>
          </div>

          <div
            id="marketplace-filters"
            className={mobileFiltersOpen ? 'block' : 'hidden xl:block'}
          >
            <FilterGroup
              title="Category"
              options={categories}
              selected={selectedCategories}
              counts={categoryCounts}
              defaultOpen
              onToggle={(value) =>
                setSelectedCategories((current) =>
                  toggleValue(current, value),
                )
              }
            />

            <FilterGroup
              title="Authentication Type"
              options={authenticationTypes}
              selected={selectedAuthentication}
              onToggle={(value) =>
                setSelectedAuthentication((current) =>
                  toggleValue(current, value),
                )
              }
            />

            <FilterGroup
              title="Popularity"
              options={popularityOptions}
              selected={selectedPopularity}
              onToggle={(value) =>
                setSelectedPopularity((current) =>
                  toggleValue(current, value),
                )
              }
            />
          </div>
        </aside>

        <section aria-label="Available APIs" className="min-w-0">
          <p role="status" className="mb-3.5 text-xs text-faint">
            <span className="font-mono text-ink">{filteredApis.length}</span>{' '}
            {filteredApis.length === 1 ? 'product' : 'products'}
            {(() => {
              const live = filteredApis.filter((api) => api.availability === 'live').length
              if (filteredApis.length === 0) return null
              if (live === filteredApis.length) return ' · all live in sandbox'
              return ` · ${live} live · ${filteredApis.length - live} on the roadmap`
            })()}
          </p>

          {filteredApis.length > 0 ? (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2">
              {filteredApis.map((api) => (
                <ApiCard key={api.id} api={api} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">No APIs found</h2>

              <p className="mt-2 text-sm text-muted">
                Try a different search or adjust your filters.
              </p>

              <button
                type="button"
                onClick={resetResults}
                className="mt-5 min-h-10 cursor-pointer rounded-lg bg-primary px-5 text-sm text-white hover:bg-primary-hover"
              >
                Reset search and filters
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}