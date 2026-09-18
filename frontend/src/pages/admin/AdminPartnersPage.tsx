import { useCallback, useEffect, useState } from 'react'
import { Button, Chip, EmptyState, ErrorNote, Panel, Skeleton, StatGrid, StatTile } from '../../components/dash/ui'
import { ApiError } from '../../lib/api'
import { admin, compactNumber, relativeTime, type DeveloperAccount } from '../../lib/admin'

/**
 * The partner register: every developer account on the platform, what they
 * have registered under it, and whether any of it is being used. Read from
 * the same tables as the control room — nothing here is a CRM record, it is
 * what the gateway knows.
 */

const dateFormatter = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' })

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

export default function AdminPartnersPage() {
  const [developers, setDevelopers] = useState<DeveloperAccount[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // State is only set from the promise callbacks, never synchronously in the
  // effect: `loading` starts true, and a manual refresh flips it back on itself.
  const load = useCallback(
    () =>
      admin
        .developers()
        .then((res) => {
          setDevelopers(res.data)
          setError('')
        })
        .catch((err: unknown) =>
          setError(err instanceof ApiError ? err.message : 'Could not load the partner register.'),
        )
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    void load()
  }, [load])

  function refresh() {
    setLoading(true)
    void load()
  }

  const needle = query.trim().toLowerCase()
  const shown = (developers ?? []).filter(
    (d) =>
      !needle ||
      `${d.name} ${d.email} ${d.company ?? ''} ${d.apps.map((a) => `${a.name} ${a.client_id}`).join(' ')}`
        .toLowerCase()
        .includes(needle),
  )

  const totals = developers
    ? {
        developers: developers.length,
        apps: developers.reduce((n, d) => n + d.apps_total, 0),
        building: developers.filter((d) => d.calls > 0).length,
        consents: developers.reduce((n, d) => n + d.active_consents, 0),
      }
    : null

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-canvas px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-350 flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Control room</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Partners</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-body">
              Every developer account on the platform, the apps registered under it, and whether they are being used.
              Drawn from the same tables as the dashboard.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="partner-search">
              Search partners
            </label>
            <input
              id="partner-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, company, app, client ID"
              className="h-10 w-72 max-w-full rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <Button secondary onClick={refresh} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        </header>

        {error && <ErrorNote message={error} onRetry={refresh} />}

        {!developers && loading && <Skeleton rows={8} />}

        {developers && totals && (
          <>
            <StatGrid>
              <StatTile label="Developer accounts" value={totals.developers} detail="signed up on the portal" tone="accent" />
              <StatTile label="Registered apps" value={totals.apps} detail="across all accounts" />
              <StatTile
                label="Building"
                value={totals.building}
                detail="accounts with at least one call"
                tone={totals.building > 0 ? 'ok' : 'neutral'}
              />
              <StatTile
                label="Live consents"
                value={totals.consents}
                detail="customers currently sharing data"
                tone={totals.consents > 0 ? 'ok' : 'neutral'}
              />
            </StatGrid>

            <Panel
              title="Partner register"
              subtitle="Busiest first. Select a row to see the apps registered under that account."
              padded={false}
              footer={
                <span className="tabular-nums">
                  {shown.length === developers.length
                    ? `${developers.length} accounts`
                    : `${shown.length} of ${developers.length} accounts match`}
                </span>
              }
            >
              {developers.length === 0 ? (
                <div className="px-5 pb-5">
                  <EmptyState
                    title="No partners yet"
                    message="Developers who sign up on the portal appear here as soon as they do."
                  />
                </div>
              ) : shown.length === 0 ? (
                <div className="px-5 pb-5">
                  <EmptyState title="No matches" message="Try a different name, company or client ID." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-190 border-collapse text-left">
                    <thead>
                      <tr className="border-b border-canvas">
                        <th scope="col" className="eyebrow px-5 py-2.5 font-medium tracking-[0.08em]">Partner</th>
                        <th scope="col" className="eyebrow py-2.5 pr-3 font-medium tracking-[0.08em]">Apps</th>
                        <th scope="col" className="eyebrow py-2.5 pr-3 text-right font-medium tracking-[0.08em]">Calls</th>
                        <th scope="col" className="eyebrow py-2.5 pr-3 text-right font-medium tracking-[0.08em]">Consents</th>
                        <th scope="col" className="eyebrow py-2.5 pr-3 text-right font-medium tracking-[0.08em]">Joined</th>
                        <th scope="col" className="eyebrow py-2.5 pr-5 text-right font-medium tracking-[0.08em]">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((d) => {
                        const expanded = open === d.id
                        return (
                          <DeveloperRows
                            key={d.id}
                            developer={d}
                            expanded={expanded}
                            onToggle={() => setOpen(expanded ? null : d.id)}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}

function DeveloperRows({
  developer: d,
  expanded,
  onToggle,
}: {
  developer: DeveloperAccount
  expanded: boolean
  onToggle: () => void
}) {
  const quiet = d.calls === 0
  return (
    <>
      <tr
        className={`cursor-pointer border-b border-canvas transition-colors hover:bg-canvas/60 ${expanded ? 'bg-tint/60' : ''}`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-canvas text-xs font-semibold text-muted">
              {initials(d.name)}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink">{d.name}</span>
                {quiet && <Chip tone="neutral">No traffic</Chip>}
              </span>
              <span className="block truncate text-xs text-muted">
                {d.company ? `${d.company} · ` : ''}
                {d.email}
              </span>
            </span>
          </div>
        </td>
        <td className="py-3 pr-3 text-sm tabular-nums">
          {d.apps_total}
          {d.apps_active !== d.apps_total && (
            <span className="text-xs text-muted"> · {d.apps_active} active</span>
          )}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm tabular-nums">
          {compactNumber(d.calls)}
          {d.errors > 0 && <span className="block text-[11px] text-amber-700">{d.errors} rejected</span>}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm tabular-nums">{d.active_consents}</td>
        <td className="py-3 pr-3 text-right text-xs text-muted">{dateFormatter.format(new Date(d.created_at))}</td>
        <td className="py-3 pr-5 text-right text-xs tabular-nums text-muted">
          {d.last_call_at ? relativeTime(d.last_call_at) : '—'}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-canvas bg-canvas/40">
          <td colSpan={6} className="px-5 py-4">
            {d.apps.length === 0 ? (
              <p className="text-xs text-muted">No apps registered yet.</p>
            ) : (
              <ul className="divide-y divide-canvas rounded-xl border border-line bg-white">
                {d.apps.map((app) => (
                  <li key={app.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{app.name}</span>
                        <Chip tone={app.status === 'active' ? 'ok' : 'bad'}>
                          {app.status === 'active' ? 'Active' : 'Deactivated'}
                        </Chip>
                      </span>
                      <span className="block font-mono text-[11px] text-faint">{app.client_id}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      <span className="font-mono text-ink">{compactNumber(app.calls)}</span> calls
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      <span className="font-mono text-ink">{app.active_consents}</span> consents
                    </span>
                    <span className="text-xs text-muted">
                      Registered {dateFormatter.format(new Date(app.created_at))}
                      {app.deactivated_at && ` · deactivated ${relativeTime(app.deactivated_at)}`}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {app.last_call_at ? `Last call ${relativeTime(app.last_call_at)}` : 'Never called'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
