import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { marketplaceApis } from '../../data/marketplace'
import type { MarketplaceApi } from '../../data/marketplace'

const categories = [
  'Payments',
  'Accounts',
  'Identity',
  'Cards',
  'Loans',
  'Forex',
  'Transfers',
  'Others',
]

const authenticationTypes = ['OAuth 2.0', 'API Key']
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
      className="group border-b border-[#e1e8f1] py-5"
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
          className="text-[#58708f] group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <fieldset className="mt-3 space-y-1">
        <legend className="sr-only">{title}</legend>

        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-[#33445d]"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="size-4 shrink-0 cursor-pointer accent-[#0450ff]"
            />

            <span>
              {option}
              {counts && (
                <span className="text-[#58708f]">
                  {' '}({counts[option] ?? 0})
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>
    </details>
  )
}

function ApiCard({ api }: { api: MarketplaceApi }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-[#e1e6ee] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-sm bg-[#f2f3f6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#4c586b]">
            {api.category === 'Identity' ? 'Identity & KYC' : api.category}
          </span>

          <span
            className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              api.pricing === 'Paid'
                ? 'bg-blue-50 text-[#1010ff]'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {api.pricing}
          </span>
        </div>

        <svg
          aria-hidden="true"
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff6268"
          strokeWidth="1.5"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6.5c4 2 10 2 14 0M5 17.5c4-2 10-2 14 0" />
        </svg>
      </div>

      <h2 className="text-base font-semibold leading-6">
        {api.title}
      </h2>

      <span
        aria-hidden="true"
        className="mb-3 mt-2 h-[3px] w-7 bg-[#ff3545]"
      />

      <p className="mb-8 text-xs leading-5 text-[#4c586b]">
        {api.description}
      </p>

      <Link
        to={`/app/marketplace/${api.id}`}
        aria-label={`Explore ${api.title}`}
        className="mt-auto flex min-h-10 items-center justify-center gap-1 bg-[#0450ff] px-4 py-2 text-xs font-bold text-white hover:bg-[#003bd0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        EXPLORE API <span aria-hidden="true">→</span>
      </Link>
    </article>
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
        className="relative isolate overflow-hidden rounded-xl bg-[#edf5ff] px-5 py-7 sm:px-6 sm:py-8"
      >
        <img
          src="/images/Marketplace.png"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
        />

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f0f6ff] via-[#edf5ff]/95 to-transparent" />

        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8299b8]">
          Marketplace
        </p>

        <h1
          id="marketplace-title"
          className="mt-2 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl"
        >
          APIs for a more connected Africa
        </h1>

        <p className="mt-3 max-w-lg text-sm leading-5 text-[#4c586b]">
          Explore, integrate, and build powerful solutions with Stanbic
          IBTC APIs.
        </p>
      </section>

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
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9bb2]"
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
            className="h-10 w-full rounded-md border border-[#e1e6ee] bg-[#fafafa] pl-10 pr-4 text-sm outline-none placeholder:text-[#8b9bb2] focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
        <aside aria-label="API filters">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              Filters
              {selectedFilterCount > 0 && (
                <span className="ml-2 text-blue-600">
                  ({selectedFilterCount})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-9 cursor-pointer text-xs font-semibold text-[#1010ff] hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Clear all
              </button>

              <button
                type="button"
                aria-expanded={mobileFiltersOpen}
                aria-controls="marketplace-filters"
                onClick={() => setMobileFiltersOpen((current) => !current)}
                className="min-h-9 cursor-pointer rounded-md border border-[#e1e6ee] px-3 text-xs text-[#465b78] focus-visible:outline-2 focus-visible:outline-blue-600 xl:hidden"
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
          <p role="status" className="sr-only">
            {filteredApis.length} APIs found.
          </p>

          {filteredApis.length > 0 ? (
            <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2">
              {filteredApis.map((api) => (
                <ApiCard key={api.id} api={api} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#d7dfeb] px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">No APIs found</h2>

              <p className="mt-2 text-sm text-[#58708f]">
                Try a different search or adjust your filters.
              </p>

              <button
                type="button"
                onClick={resetResults}
                className="mt-5 min-h-10 cursor-pointer rounded-md bg-[#0450ff] px-5 text-sm text-white hover:bg-[#003bd0]"
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