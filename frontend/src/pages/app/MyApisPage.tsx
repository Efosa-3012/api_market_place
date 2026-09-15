import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../lib/api'
import { portal, type App, type AppWithSecret } from '../../lib/portal'

type StatusFilter = 'All' | 'active' | 'deactivated'

const filters: { key: StatusFilter; label: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'deactivated', label: 'Deactivated' },
]

const dateFormatter = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' })

function maskClientId(value: string) {
  return value.length > 10 ? `${value.slice(0, 7)}••••${value.slice(-3)}` : value
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

const focusClass =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
const primaryButton = `min-h-10 cursor-pointer rounded-lg bg-[#0450ff] px-4 text-sm font-medium text-white hover:bg-[#003bd0] disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`
const secondaryButton = `min-h-10 cursor-pointer rounded-lg border border-[#e1e6ee] px-4 text-sm ${focusClass}`
const inputClass =
  'h-10 w-full rounded-md border border-[#e1e6ee] bg-[#f8f9fb] px-3 text-sm outline-none placeholder:text-[#8190a7] focus:border-blue-500'

/** Modal that opens itself whenever `open` flips to true. */
function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return ref
}

export default function MyApisPage() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('All')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  // Dialog state
  const [registering, setRegistering] = useState(false)
  const [rotateTarget, setRotateTarget] = useState<App | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<App | null>(null)
  const [revealed, setRevealed] = useState<AppWithSecret | null>(null)
  const [busy, setBusy] = useState(false)

  const registerRef = useDialog(registering)
  const rotateRef = useDialog(rotateTarget !== null)
  const deactivateRef = useDialog(deactivateTarget !== null)
  const secretRef = useDialog(revealed !== null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setApps(await portal.listApps())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your apps.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const counts = {
    All: apps.length,
    active: apps.filter((a) => a.status === 'active').length,
    deactivated: apps.filter((a) => a.status === 'deactivated').length,
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleApps = apps.filter((app) => {
    const matchesFilter = filter === 'All' || app.status === filter
    const matchesSearch = `${app.name} ${app.description ?? ''} ${app.client_id}`
      .toLowerCase()
      .includes(normalizedQuery)
    return matchesFilter && matchesSearch
  })

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(`${label} copied.`)
    } catch {
      setNotice('Copy failed. Clipboard access requires browser permission and HTTPS or localhost.')
    }
  }

  function describeError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.code === 'validation_error') return 'Check the form: every redirect URI must be an absolute URL.'
    return err instanceof Error ? err.message : fallback
  }

  // --- Register --------------------------------------------------------------
  const [form, setForm] = useState({ name: '', description: '', redirectUris: 'http://localhost:3000/callback' })
  const [formError, setFormError] = useState('')

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const redirect_uris = form.redirectUris
      .split(/\n|,/)
      .map((u) => u.trim())
      .filter(Boolean)
    if (!form.name.trim() || redirect_uris.length === 0) {
      setFormError('Give the app a name and at least one redirect URI.')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const created = await portal.createApp({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        redirect_uris,
      })
      setRegistering(false)
      setForm({ name: '', description: '', redirectUris: 'http://localhost:3000/callback' })
      setApps((current) => [created, ...current])
      setRevealed(created)
    } catch (err) {
      setFormError(describeError(err, 'Could not register the app.'))
    } finally {
      setBusy(false)
    }
  }

  // --- Rotate ----------------------------------------------------------------
  async function confirmRotate() {
    if (!rotateTarget) return
    setBusy(true)
    try {
      const rotated = await portal.rotateSecret(rotateTarget.id)
      setRotateTarget(null)
      setRevealed(rotated)
      setNotice(`${rotated.name}: previous secret no longer works.`)
    } catch (err) {
      setNotice(describeError(err, 'Could not rotate the secret.'))
      setRotateTarget(null)
    } finally {
      setBusy(false)
    }
  }

  // --- Deactivate ------------------------------------------------------------
  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setBusy(true)
    try {
      const result = await portal.deactivateApp(deactivateTarget.id)
      setApps((current) => current.map((a) => (a.id === result.id ? { ...a, ...result } : a)))
      setNotice(
        `${result.name} deactivated. ${result.consents_revoked} customer consent${
          result.consents_revoked === 1 ? '' : 's'
        } revoked — every token issued to it now fails.`,
      )
    } catch (err) {
      setNotice(describeError(err, 'Could not deactivate the app.'))
    } finally {
      setBusy(false)
      setDeactivateTarget(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      {/* Heading */}
      <nav aria-label="Breadcrumb" className="text-xs text-[#58708f]">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/app/dashboard" className="hover:text-blue-600 hover:underline">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-[#151c2d]">
            My Apps
          </li>
        </ol>
      </nav>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#10243a]">My Apps</h1>
          <p className="mt-2 text-sm text-[#465b78]">
            Each app gets a client ID and secret. Customers grant consent to an app, never to you directly.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRegistering(true)}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-[#0450ff] px-4 text-sm font-medium text-white hover:bg-[#003bd0] ${focusClass}`}
        >
          Register app
        </button>
      </div>

      {/* Summary */}
      <section aria-label="App overview" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">Active apps</h2>
          <p className="mt-3 text-2xl font-bold">{counts.active}</p>
          <p className="mt-3 text-xs text-[#465b78]">Can request customer consent</p>
        </article>

        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">Deactivated</h2>
          <p className="mt-3 text-2xl font-bold">{counts.deactivated}</p>
          <p className="mt-3 text-xs text-[#465b78]">All their consents were revoked</p>
        </article>

        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">Environment</h2>
          <p className="mt-3 text-2xl font-bold">Sandbox</p>
          <p className="mt-3 text-xs text-[#465b78]">Mock core banking data</p>
        </article>

        <article className="rounded-xl border border-[#e6ebf3] bg-white p-4">
          <h2 className="text-[10px] font-medium uppercase text-[#58708f]">Production access</h2>
          <p className="mt-3 text-2xl font-bold">Not requested</p>
          <p className="mt-3 text-xs text-[#465b78]">Requires business verification</p>
        </article>
      </section>

      {/* Security tip */}
      <div className="mt-5 flex items-start gap-3 rounded-r-lg border border-l-[3px] border-[#4040ff] px-4 py-3">
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
          <strong>Security tip:</strong> a client secret is shown exactly once, when it's created or
          rotated. We only store a hash. If you lose it or suspect it leaked, rotate it — the old one
          stops working immediately.
        </p>
      </div>

      <p role="status" className={notice ? 'mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800' : 'sr-only'}>
        {notice}
      </p>

      {/* Apps table */}
      <section aria-label="Registered apps" className="mt-5 rounded-xl border border-[#e6ebf3] bg-white">
        <div className="flex flex-col gap-4 p-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div role="group" aria-label="Filter apps" className="flex flex-wrap gap-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={`min-h-9 cursor-pointer rounded-md px-3 text-xs font-medium ${focusClass} ${
                  filter === item.key ? 'bg-[#eef5ff] text-[#1010ff]' : 'text-[#465b78] hover:bg-[#f7f9fc]'
                }`}
              >
                {item.label} ({counts[item.key]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="my-app-search" className="sr-only">
              Search your apps
            </label>
            <input
              id="my-app-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or client ID..."
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#e6ebf3] bg-[#f8f9fb] px-3 text-xs outline-none placeholder:text-[#8190a7] focus:border-blue-500 sm:w-60"
            />
          </div>
        </div>

        <div role="region" aria-label="Registered apps table" tabIndex={0} className={`overflow-x-auto rounded-b-xl ${focusClass}`}>
          <table className="w-full min-w-[850px] border-collapse text-left">
            <caption className="sr-only">Your registered apps, credentials and actions.</caption>

            <thead className="border-y border-[#edf0f5] bg-[#f8f9fb]">
              <tr className="text-[10px] uppercase tracking-wider text-[#58708f]">
                <th scope="col" className="px-4 py-3 font-semibold">App</th>
                <th scope="col" className="px-3 py-3 font-semibold">Client ID</th>
                <th scope="col" className="px-3 py-3 font-semibold">Redirect URIs</th>
                <th scope="col" className="px-3 py-3 font-semibold">Scopes</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-3 py-3 font-semibold">Created</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf0f5]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-sm text-[#58708f]">
                    Loading your apps…
                  </td>
                </tr>
              )}

              {!loading && loadError && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <p className="text-sm font-semibold text-red-700">{loadError}</p>
                    <button type="button" onClick={() => void load()} className="mt-3 min-h-10 cursor-pointer rounded px-3 text-sm text-blue-600 hover:underline">
                      Try again
                    </button>
                  </td>
                </tr>
              )}

              {!loading &&
                !loadError &&
                visibleApps.map((app) => (
                  <tr key={app.id} className="align-top hover:bg-[#fafcff]">
                    <th scope="row" className="px-4 py-5 font-normal">
                      <span className="block text-xs font-semibold">{app.name}</span>
                      {app.description && (
                        <span className="mt-1 block max-w-64 text-[11px] text-[#58708f]">{app.description}</span>
                      )}
                    </th>

                    <td className="px-3 py-5">
                      <button
                        type="button"
                        onClick={() => void copy('Client ID', app.client_id)}
                        aria-label={`Copy client ID for ${app.name}`}
                        className={`flex min-h-8 cursor-pointer items-center gap-2 rounded border border-[#e8ebf0] bg-[#f7f8fa] px-2 text-[#58708f] hover:bg-blue-50 ${focusClass}`}
                      >
                        <code className="whitespace-nowrap text-[10px]">{maskClientId(app.client_id)}</code>
                        <CopyIcon />
                      </button>
                    </td>

                    <td className="px-3 py-5 text-[11px] text-[#58708f]">
                      {app.redirect_uris.map((uri) => (
                        <code key={uri} className="block whitespace-nowrap">{uri}</code>
                      ))}
                    </td>

                    <td className="px-3 py-5">
                      <div className="flex max-w-44 flex-wrap gap-1">
                        {app.allowed_scopes.map((scope) => (
                          <span key={scope} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-3 py-5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
                          app.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                        {app.status === 'active' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="px-3 py-5 text-xs text-[#58708f]">
                      <time dateTime={app.created_at}>{dateFormatter.format(new Date(app.created_at))}</time>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-start justify-end gap-2">
                        <a
                          href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/docs`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="API documentation"
                          className={`inline-flex min-h-9 items-center rounded text-xs text-[#465b78] hover:text-blue-600 ${focusClass}`}
                        >
                          Docs
                        </a>

                        {app.status === 'active' && (
                          <details className="min-w-8">
                            <summary
                              aria-label={`Actions for ${app.name}`}
                              className={`ml-auto grid size-9 cursor-pointer list-none place-items-center rounded text-lg hover:bg-blue-50 ${focusClass} [&::-webkit-details-marker]:hidden`}
                            >
                              <span aria-hidden="true">⋮</span>
                            </summary>

                            <div className="mt-1 flex min-w-36 flex-col gap-1 rounded-lg border border-[#e6ebf3] bg-white p-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.currentTarget.closest('details')?.removeAttribute('open')
                                  setRotateTarget(app)
                                }}
                                className="min-h-9 cursor-pointer rounded px-2 text-left text-xs text-blue-700 hover:bg-blue-50"
                              >
                                Rotate secret
                              </button>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.currentTarget.closest('details')?.removeAttribute('open')
                                  setDeactivateTarget(app)
                                }}
                                className="min-h-9 cursor-pointer rounded px-2 text-left text-xs text-red-600 hover:bg-red-50"
                              >
                                Deactivate
                              </button>
                            </div>
                          </details>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && !loadError && visibleApps.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <p className="text-sm font-semibold">
                      {apps.length === 0 ? 'You have not registered an app yet' : 'No apps match your filters'}
                    </p>
                    {apps.length === 0 ? (
                      <button type="button" onClick={() => setRegistering(true)} className="mt-3 min-h-10 cursor-pointer rounded px-3 text-sm text-blue-600 hover:underline">
                        Register your first app
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setFilter('All'); setQuery('') }} className="mt-3 min-h-10 cursor-pointer rounded px-3 text-sm text-blue-600 hover:underline">
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Register dialog */}
      <dialog
        ref={registerRef}
        aria-labelledby="register-title"
        onCancel={(event) => { event.preventDefault(); setRegistering(false) }}
        onClose={() => setRegistering(false)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[calc(100%_-_48px)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 id="register-title" className="text-lg font-semibold">Register an app</h2>
        <p className="mt-2 text-sm leading-6 text-[#58708f]">
          You'll get a client ID and a secret. The secret is shown once — copy it straight away.
        </p>

        <form onSubmit={submitRegister} className="mt-5 space-y-4">
          <div>
            <label htmlFor="app-name" className="mb-1.5 block text-sm font-medium">App name</label>
            <input id="app-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BudgetBuddy" className={inputClass} />
          </div>
          <div>
            <label htmlFor="app-description" className="mb-1.5 block text-sm font-medium">
              Description <span className="font-normal text-[#58708f]">(customers see this on the consent screen)</span>
            </label>
            <input id="app-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A budgeting app that shows you where your money goes." className={inputClass} />
          </div>
          <div>
            <label htmlFor="app-redirects" className="mb-1.5 block text-sm font-medium">
              Redirect URIs <span className="font-normal text-[#58708f]">(one per line)</span>
            </label>
            <textarea id="app-redirects" required rows={3} value={form.redirectUris} onChange={(e) => setForm({ ...form, redirectUris: e.target.value })} className={`${inputClass} h-auto py-2 font-mono text-xs`} />
            <p className="mt-1 text-xs text-[#58708f]">Where we send the customer back after they approve. Must match exactly at runtime.</p>
          </div>

          {formError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setRegistering(false)} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Registering…' : 'Register'}</button>
          </div>
        </form>
      </dialog>

      {/* Secret reveal dialog */}
      <dialog
        ref={secretRef}
        aria-labelledby="secret-title"
        onCancel={(event) => { event.preventDefault(); setRevealed(null) }}
        onClose={() => setRevealed(null)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[calc(100%_-_48px)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        {revealed && (
          <>
            <h2 id="secret-title" className="text-lg font-semibold">Credentials for {revealed.name}</h2>
            <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">{revealed.warning}</p>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-medium uppercase text-[#58708f]">Client ID</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded bg-[#f7f8fa] px-3 py-2 text-xs">{revealed.client_id}</code>
                  <button type="button" onClick={() => void copy('Client ID', revealed.client_id)} aria-label="Copy client ID" className={`grid size-9 cursor-pointer place-items-center rounded border border-[#e8ebf0] text-[#58708f] hover:bg-blue-50 ${focusClass}`}><CopyIcon /></button>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-[#58708f]">Client secret</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded bg-[#f7f8fa] px-3 py-2 text-xs">{revealed.client_secret}</code>
                  <button type="button" onClick={() => void copy('Client secret', revealed.client_secret)} aria-label="Copy client secret" className={`grid size-9 cursor-pointer place-items-center rounded border border-[#e8ebf0] text-[#58708f] hover:bg-blue-50 ${focusClass}`}><CopyIcon /></button>
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end">
              <button type="button" autoFocus onClick={() => setRevealed(null)} className={primaryButton}>I've saved it</button>
            </div>
          </>
        )}
      </dialog>

      {/* Rotate confirm */}
      <dialog
        ref={rotateRef}
        aria-labelledby="rotate-title"
        onCancel={(event) => { event.preventDefault(); setRotateTarget(null) }}
        onClose={() => setRotateTarget(null)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[calc(100%_-_48px)] max-w-md overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 id="rotate-title" className="text-lg font-semibold">Rotate the secret for {rotateTarget?.name}?</h2>
        <p className="mt-3 text-sm leading-6 text-[#58708f]">
          A new secret is generated and shown once. The current secret stops working immediately — any
          running integration using it will fail until it's updated. Customer consents are not affected.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus onClick={() => setRotateTarget(null)} className={secondaryButton}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void confirmRotate()} className={primaryButton}>{busy ? 'Rotating…' : 'Rotate'}</button>
        </div>
      </dialog>

      {/* Deactivate confirm */}
      <dialog
        ref={deactivateRef}
        aria-labelledby="deactivate-title"
        onCancel={(event) => { event.preventDefault(); setDeactivateTarget(null) }}
        onClose={() => setDeactivateTarget(null)}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[calc(100%_-_48px)] max-w-md overflow-y-auto rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 id="deactivate-title" className="text-lg font-semibold">Deactivate {deactivateTarget?.name}?</h2>
        <p className="mt-3 text-sm leading-6 text-[#58708f]">
          This is the kill switch. The app can no longer get tokens, <strong>every consent customers
          granted it is revoked</strong>, and every existing token fails on its next call. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus onClick={() => setDeactivateTarget(null)} className={secondaryButton}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void confirmDeactivate()} className={`min-h-10 cursor-pointer rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`}>
            {busy ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </dialog>
    </div>
  )
}
