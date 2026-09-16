import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { ApiError, portalSession } from '../../lib/api'
import { PORTAL_WINDOW_LABELS, portal } from '../../lib/portal'
import type { PortalSummary, PortalWindow, RequestLog } from '../../lib/portal'
import { Button, Chip, ErrorNote, Segmented, Skeleton } from '../../components/dash/ui'
import Activity from '../../components/portal/Activity'
import Documentation from '../../components/portal/Documentation'
import Logs from '../../components/portal/Logs'
import Quickstart from '../../components/portal/Quickstart'

/**
 * The integration hub: what your apps did, and how to build against the APIs.
 *
 * Credentials live on My Apps and the try-it console lives on Sandbox — this
 * page deliberately does not duplicate either. Everything here reads the
 * gateway's real audit trail, scoped by the backend to the signed-in developer.
 */

const TABS = [
  { id: 'quickstart', label: 'Quickstart', blurb: 'From a new account to your first successful call.' },
  { id: 'activity', label: 'Activity', blurb: 'What your integration did, from the gateway’s audit trail.' },
  { id: 'logs', label: 'Logs', blurb: 'Every request your apps made, with the ID to quote to support.' },
  { id: 'documentation', label: 'Documentation', blurb: 'Authentication, scopes, errors, limits and pagination.' },
] as const

type TabId = (typeof TABS)[number]['id']

const WINDOW_OPTIONS = (['1h', '24h', '7d', '30d'] as const).map((value) => ({
  value,
  label: value === '1h' ? '1h' : value === '24h' ? '24h' : value === '7d' ? '7d' : '30d',
}))

export default function DeveloperPortalPage() {
  const [params, setParams] = useSearchParams()
  const developer = portalSession.developer()

  const requestedTab = params.get('tab') as TabId | null
  const [range, setRange] = useState<PortalWindow>('24h')
  const [summary, setSummary] = useState<PortalSummary | null>(null)
  const [recent, setRecent] = useState<RequestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextSummary, page] = await Promise.all([portal.summary(range), portal.logs({ limit: 10 })])
      setSummary(nextSummary)
      setRecent(page.data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load your integration activity. Check the API is reachable and try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void load()
  }, [load])

  // A developer who has never made a call lands on the quickstart; everyone else
  // lands on their activity. An explicit ?tab= always wins.
  const defaultTab: TabId = summary && summary.calls > 0 ? 'activity' : 'quickstart'
  const tab: TabId = TABS.some((t) => t.id === requestedTab) ? requestedTab! : defaultTab
  const current = TABS.find((t) => t.id === tab)!

  function selectTab(next: TabId) {
    setParams(
      (existing) => {
        const updated = new URLSearchParams(existing)
        updated.set('tab', next)
        return updated
      },
      { replace: true },
    )
  }

  const showRange = tab === 'activity'

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-[#f7f9fc] px-4 py-6 text-[#142033] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8ea3c0]">Developer portal</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{current.label}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#465b78]">{current.blurb}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="accent">Sandbox environment</Chip>
            <Link
              to="/app/sandbox"
              className="inline-flex min-h-9 items-center rounded-lg border border-[#0450ff] bg-[#0450ff] px-4 text-xs font-semibold text-white hover:bg-[#003bd0]"
            >
              Open the Sandbox
            </Link>
          </div>
        </header>

        {developer && (
          <p className="-mt-2 text-xs text-[#8ea3c0]">
            Signed in as {developer.name}
            {developer.company ? ` · ${developer.company}` : ''}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e8f2]">
          <nav aria-label="Developer portal sections" className="-mb-px flex max-w-full gap-1 overflow-x-auto">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                  tab === item.id
                    ? 'border-[#0450ff] font-semibold text-[#142033]'
                    : 'border-transparent text-[#65758e] hover:text-[#142033]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {showRange && (
            <div className="flex items-center gap-2 pb-2">
              <Segmented label="Reporting window" value={range} options={WINDOW_OPTIONS} onChange={setRange} />
              <Button secondary onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          )}
        </div>

        {error && <ErrorNote message={error} onRetry={() => void load()} />}

        {tab === 'quickstart' && <Quickstart summary={summary} />}

        {tab === 'activity' &&
          (loading && !summary ? (
            <Skeleton rows={8} />
          ) : summary ? (
            <Activity summary={summary} recent={recent} windowLabel={PORTAL_WINDOW_LABELS[range]} />
          ) : null)}

        {tab === 'logs' && <Logs apps={summary?.by_app ?? []} />}

        {tab === 'documentation' && <Documentation />}
      </div>
    </div>
  )
}
