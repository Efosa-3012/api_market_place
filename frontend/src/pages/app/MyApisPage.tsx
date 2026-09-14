import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type ApiStatus = 'Active' | 'Suspended'
type ApiEnvironment = 'Production' | 'Sandbox'
type ApiFilter = 'All' | 'Active' | 'Suspended' | 'Sandbox'

interface SubscribedApi {
  id: string
  name: string
  category: string
  version: string
  status: ApiStatus
  environment: ApiEnvironment
  apiKey: string
  calls: number
  billing: string
}

// These keys and subscriptions are fictional UI data.
const initialApis: SubscribedApi[] = [
  {
    id: 'payments',
    name: 'Payments API',
    category: 'Collections & Payouts',
    version: 'v1.2',
    status: 'Active',
    environment: 'Production',
    apiKey: 'demo_only_payments_9f824a2e',
    calls: 24500,
    billing: 'Metered billing',
  },
  {
    id: 'accounts',
    name: 'Accounts API',
    category: 'Balances & Statements',
    version: 'v1.2',
    status: 'Active',
    environment: 'Production',
    apiKey: 'demo_only_accounts_8b725b3f',
    calls: 20000,
    billing: 'Metered billing',
  },
  {
    id: 'identity',
    name: 'Identity API',
    category: 'Verification',
    version: 'v1.2',
    status: 'Active',
    environment: 'Production',
    apiKey: 'demo_only_identity_7c626c4a',
    calls: 18000,
    billing: 'Metered billing',
  },
  {
    id: 'kyc',
    name: 'KYC API',
    category: 'KYC, BVN & NIN Lookup',
    version: 'v1.2',
    status: 'Active',
    environment: 'Sandbox',
    apiKey: 'demo_only_kyc_6d527d5b',
    calls: 15000,
    billing: 'Sandbox usage',
  },
  {
    id: 'forex',
    name: 'Forex API',
    category: 'Real-time Rates & Conversion',
    version: 'v1.2',
    status: 'Active',
    environment: 'Production',
    apiKey: 'demo_only_forex_5e428e6c',
    calls: 14000,
    billing: 'Metered billing',
  },
  {
    id: 'cards',
    name: 'Cards API',
    category: 'Card Services',
    version: 'v1.2',
    status: 'Active',
    environment: 'Sandbox',
    apiKey: 'demo_only_cards_4f329f7d',
    calls: 13000,
    billing: 'Sandbox usage',
  },
  {
    id: 'transfers',
    name: 'Transfers API',
    category: 'Account-to-account Transfers',
    version: 'v1.2',
    status: 'Active',
    environment: 'Sandbox',
    apiKey: 'demo_only_transfers_3a221a8e',
    calls: 10000,
    billing: 'Sandbox usage',
  },
  {
    id: 'loans',
    name: 'Loans API',
    category: 'Lending Services',
    version: 'v1.2',
    status: 'Suspended',
    environment: 'Production',
    apiKey: 'demo_only_loans_2b121b9f',
    calls: 10000,
    billing: 'Metered billing',
  },
]

const filters: ApiFilter[] = ['All', 'Active', 'Suspended', 'Sandbox']

const numberFormatter = new Intl.NumberFormat('en-NG')
const compactFormatter = new Intl.NumberFormat('en-NG', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function maskKey(value: string) {
  return `${value.slice(0, 10)}••••${value.slice(-4)}`
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V3H4v13h4" />
    </svg>
  )
}

export default function MyApisPage() {
  const [apis, setApis] = useState<SubscribedApi[]>(initialApis)
  const [filter, setFilter] = useState<ApiFilter>('All')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | ApiStatus>('All')
  const [notice, setNotice] = useState('')
  const [rotationTarget, setRotationTarget] = useState<string | null>(null)

  const rotationDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = rotationDialogRef.current

    if (rotationTarget && dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [rotationTarget])

  const counts: Record<ApiFilter, number> = {
    All: apis.length,
    Active: apis.filter((api) => api.status === 'Active').length,
    Suspended: apis.filter((api) => api.status === 'Suspended').length,
    Sandbox: apis.filter((api) => api.environment === 'Sandbox').length,
  }

  const totalCalls = apis.reduce((total, api) => total + api.calls, 0)
  const suspendedApis = apis.filter((api) => api.status === 'Suspended')
  const normalizedQuery = query.trim().toLowerCase()

  const visibleApis = apis.filter((api) => {
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Sandbox'
        ? api.environment === 'Sandbox'
        : api.status === filter)

    const matchesStatus = status === 'All' || api.status === status

    const matchesSearch =
      `${api.name} ${api.category} ${api.environment}`
        .toLowerCase()
        .includes(normalizedQuery)

    return matchesFilter && matchesStatus && matchesSearch
  })

  const selectedApi = apis.find((api) => api.id === rotationTarget)

  async function copyKey(api: SubscribedApi) {
    try {
      await navigator.clipboard.writeText(api.apiKey)
      setNotice(`${api.name} demo key copied.`)
    } catch {
      setNotice(
        'Copy failed. Clipboard access requires browser permission and HTTPS or localhost.',
      )
    }
  }

  function toggleStatus(api: SubscribedApi) {
    const nextStatus: ApiStatus =
      api.status === 'Active' ? 'Suspended' : 'Active'

    setApis((current) =>
      current.map((item) =>
        item.id === api.id ? { ...item, status: nextStatus } : item,
      ),
    )

    setNotice(
      `${api.name} ${nextStatus === 'Active' ? 'resumed' : 'suspended'} in this preview.`,
    )
  }

  function closeRotationDialog() {
    rotationDialogRef.current?.close()
    setRotationTarget(null)
  }

  function rotateKeys() {
    if (!rotationTarget) return

    const target = rotationTarget

    // Only fictional local keys are changed.
    // Real rotation must use a backend endpoint.
    const replacements = new Map(
      apis
        .filter((api) => target === 'all' || api.id === target)
        .map((api) => [
          api.id,
          `demo_only_${api.id}_${crypto.randomUUID().replace(/-/g, '')}`,
        ]),
    )

    setApis((current) =>
      current.map((api) => ({
        ...api,
        apiKey: replacements.get(api.id) ?? api.apiKey,
      })),
    )

    setNotice(
      target === 'all'
        ? 'All demo keys rotated.'
        : `${selectedApi?.name ?? 'API'} demo key rotated.`,
    )

    closeRotationDialog()
  }

  function resetFilters() {
    setFilter('All')
    setStatus('All')
    setQuery('')
  }

  const focusClass =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      {/* Heading */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#58708f]">
        <ol className="flex items-center gap-2">
          <li>
            <Link
              to="/app/developer-portal"
              className="hover:text-blue-600 hover:underline"
            >
              Developer Portal
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[#151c2d]">
            My APIs
          </li>
        </ol>
      </nav>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#10243a]">
            My APIs
          </h1>

          <p className="mt-2 text-sm text-[#465b78]">
            Manage your API access, credentials, and usage.
          </p>
        </div>

        <Link
          to="/app/marketplace"
          className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-[#0450ff] px-4 text-sm font-medium text-white hover:bg-[#003bd0] ${focusClass}`}
        >
          Add API
        </Link>
      </div>

      {/* Summary */}
      <section
        aria-label="API subscription overview"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">
            Active APIs
          </h2>

          <p className="mt-3 text-2xl font-bold">
            {counts.Active} Active
          </p>

          <p className="mt-3 text-xs text-[#0450ff]">
            ↗ +2 new this month
          </p>
        </article>

        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">
            API calls this month
          </h2>

          <p className="mt-3 text-2xl font-bold">
            {compactFormatter.format(totalCalls)}
          </p>

          <p className="mt-3 text-xs text-emerald-700">
            ↗ ↑ 12% from last month
          </p>
        </article>

        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">
            Current period spend
          </h2>

          <p className="mt-3 text-2xl font-bold">₦245,000</p>

          <p className="mt-3 text-xs text-[#465b78]">
            ↗ Next invoice: Oct 31, 2026
          </p>
        </article>

        <article className="rounded-xl border border-red-100 bg-red-50/30 p-4">
          <h2 className="text-[10px] font-medium uppercase text-red-700">
            Attention needed
          </h2>

          <p className="mt-3 text-2xl font-bold text-red-700">
            {suspendedApis.length}{' '}
            {suspendedApis.length === 1 ? 'Warning' : 'Warnings'}
          </p>

          <p className="mt-3 text-xs text-red-600">
            {suspendedApis.length === 1
              ? `${suspendedApis[0].name}: Access suspended`
              : suspendedApis.length > 1
                ? 'Review suspended API access'
                : 'No access warnings'}
          </p>
        </article>
      </section>

      {/* Security tip */}
      <div className="mt-5 flex flex-col gap-3 rounded-r-lg border border-l-[3px] border-[#4040ff] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <svg
            aria-hidden="true"
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="shrink-0 text-[#1010ff]"
          >
            <path d="m12 3 7 3v6c0 5-7 9-7 9s-7-4-7-9V6l7-3Z" />
          </svg>

          <p className="text-xs leading-5">
            <strong>Security Tip:</strong> Keep your API keys confidential.
            Rotate production keys periodically or immediately if compromised.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRotationTarget('all')}
          className={`min-h-8 shrink-0 cursor-pointer rounded text-xs font-semibold text-[#1010ff] hover:underline ${focusClass}`}
        >
          Rotate All Keys <span aria-hidden="true">→</span>
        </button>
      </div>

      <p
        role="status"
        className={
          notice
            ? 'mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800'
            : 'sr-only'
        }
      >
        {notice}
      </p>

      {/* Subscriptions */}
      <section
        aria-label="Subscribed APIs"
        className="mt-5 rounded-xl border border-[#e6ebf3] bg-white"
      >
        <div className="flex flex-col gap-4 p-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div
            role="group"
            aria-label="Filter subscriptions"
            className="flex flex-wrap gap-1"
          >
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                onClick={() => {
                  setFilter(item)
                  setStatus('All')
                }}
                className={`min-h-9 cursor-pointer rounded-md px-3 text-xs font-medium ${focusClass} ${
                  filter === item
                    ? 'bg-[#eef5ff] text-[#1010ff]'
                    : 'text-[#465b78] hover:bg-[#f7f9fc]'
                }`}
              >
                {item}
                {item === 'Suspended' && counts.Suspended > 0 && (
                  <span
                    aria-hidden="true"
                    className="ml-1 inline-block size-1.5 rounded-full bg-red-600"
                  />
                )}{' '}
                ({counts[item]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="my-api-search" className="sr-only">
              Search your APIs
            </label>

            <input
              id="my-api-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your APIs..."
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#e6ebf3] bg-[#f8f9fb] px-3 text-xs outline-none placeholder:text-[#8190a7] focus:border-blue-500 sm:w-52"
            />

            <label htmlFor="api-status" className="sr-only">
              Filter by status
            </label>

            <select
              id="api-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'All' | ApiStatus)
              }
              className="h-10 rounded-lg border border-[#e6ebf3] bg-white px-3 text-xs text-[#33445d] outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <p role="status" className="sr-only">
          {visibleApis.length} API subscriptions found.
        </p>

        <div
          role="region"
          aria-label="API subscriptions table"
          tabIndex={0}
          className={`overflow-x-auto rounded-b-xl ${focusClass}`}
        >
          <table className="w-full min-w-[850px] border-collapse text-left">
            <caption className="sr-only">
              Your API subscriptions, credentials, usage, and actions.
            </caption>

            <thead className="border-y border-[#edf0f5] bg-[#f8f9fb]">
              <tr className="text-[10px] uppercase tracking-wider text-[#58708f]">
                <th scope="col" className="px-4 py-3 font-semibold">
                  API name & category
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Version
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  API key
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Usage this month
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf0f5]">
              {visibleApis.map((api) => (
                <tr key={api.id} className="align-top hover:bg-[#fafcff]">
                  <th scope="row" className="px-4 py-5 font-normal">
                    <span className="block text-xs font-semibold">
                      {api.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-[#58708f]">
                      {api.category}
                    </span>
                    {api.environment === 'Sandbox' && (
                      <span className="mt-2 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600">
                        Sandbox
                      </span>
                    )}
                  </th>

                  <td className="px-3 py-5 text-xs text-[#58708f]">
                    {api.version}
                  </td>

                  <td className="px-3 py-5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
                        api.status === 'Active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-current"
                      />
                      {api.status}
                    </span>
                  </td>

                  <td className="px-3 py-5">
                    <button
                      type="button"
                      onClick={() => void copyKey(api)}
                      aria-label={`Copy ${api.name} demo key`}
                      className={`flex min-h-8 cursor-pointer items-center gap-2 rounded border border-[#e8ebf0] bg-[#f7f8fa] px-2 text-[#58708f] hover:bg-blue-50 ${focusClass}`}
                    >
                      <code className="whitespace-nowrap text-[10px]">
                        {maskKey(api.apiKey)}
                      </code>
                      <CopyIcon />
                    </button>
                  </td>

                  <td className="px-3 py-5">
                    <span className="block whitespace-nowrap text-xs font-semibold">
                      {numberFormatter.format(api.calls)} calls
                    </span>
                    <span className="mt-1 block text-[11px] text-[#58708f]">
                      {api.billing}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-start justify-end gap-2">
                      <Link
                        to="/app/developer-portal"
                        aria-label={`${api.name} documentation`}
                        className={`inline-flex min-h-9 items-center rounded text-xs text-[#465b78] hover:text-blue-600 ${focusClass}`}
                      >
                        Docs
                      </Link>

                      <details className="min-w-8">
                        <summary
                          aria-label={`Actions for ${api.name}`}
                          className={`ml-auto grid size-9 cursor-pointer list-none place-items-center rounded text-lg hover:bg-blue-50 ${focusClass} [&::-webkit-details-marker]:hidden`}
                        >
                          <span aria-hidden="true">⋮</span>
                        </summary>

                        <div className="mt-1 flex min-w-28 flex-col gap-1 rounded-lg border border-[#e6ebf3] bg-white p-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open')
                              setRotationTarget(api.id)
                            }}
                            className="min-h-9 cursor-pointer rounded px-2 text-left text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Rotate key
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open')
                              toggleStatus(api)
                            }}
                            className={`min-h-9 cursor-pointer rounded px-2 text-left text-xs hover:bg-[#f7f9fc] ${
                              api.status === 'Active'
                                ? 'text-red-600'
                                : 'text-green-700'
                            }`}
                          >
                            {api.status === 'Active' ? 'Suspend' : 'Resume'}
                          </button>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}

              {visibleApis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="text-sm font-semibold">
                      No APIs match your filters
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 min-h-10 cursor-pointer rounded px-3 text-sm text-blue-600 hover:underline"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demo key rotation */}
      <dialog
        ref={rotationDialogRef}
        aria-labelledby="rotation-title"
        aria-describedby="rotation-description"
        onCancel={(event) => {
          event.preventDefault()
          closeRotationDialog()
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[calc(100%_-_48px)] max-w-md overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 id="rotation-title" className="text-lg font-semibold">
          {rotationTarget === 'all'
            ? 'Rotate all demo keys?'
            : `Rotate ${selectedApi?.name ?? 'API'} demo key?`}
        </h2>

        <p
          id="rotation-description"
          className="mt-3 text-sm leading-6 text-[#58708f]"
        >
          This replaces the fictional keys in this preview only.
          No live credentials or integrations will change.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={closeRotationDialog}
            className={`min-h-10 cursor-pointer rounded-lg border border-[#e1e6ee] px-4 text-sm ${focusClass}`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={rotateKeys}
            className={`min-h-10 cursor-pointer rounded-lg bg-[#0450ff] px-4 text-sm font-medium text-white hover:bg-[#003bd0] ${focusClass}`}
          >
            Rotate
          </button>
        </div>
      </dialog>
    </div>
  )
}