import { useEffect, useState } from 'react'

import { bankSession } from '../../lib/api'
import { bank, SCOPE_LABELS, type Consent } from '../../lib/bank'
import { Button, EmptyState, Notice, Skeleton } from '../../components/ui'

/**
 * "Connected Apps" — everything the customer has granted, and the switch to
 * take it back. Revoking here makes the app's very next API call fail.
 */

const dateFmt = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' })
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—')

const STATUS_STYLE: Record<Consent['status'], string> = {
  authorised: 'bg-green-50 text-green-700',
  revoked: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-600',
  rejected: 'bg-slate-100 text-slate-600',
  awaiting_authorisation: 'bg-amber-50 text-amber-700',
}

export default function ConnectedAppsPage() {
  const customer = bankSession.customer()
  const [consents, setConsents] = useState<Consent[] | null>(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<Consent | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  // When access was removed, so the notice can count up: "cut off 12 s ago".
  const [revokedAt, setRevokedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!revokedAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [revokedAt])

  useEffect(() => {
    let cancelled = false
    bank
      .connectedApps()
      .then((data) => !cancelled && setConsents(data))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load connected apps.'))
    return () => {
      cancelled = true
    }
  }, [])

  async function revoke() {
    if (!confirm) return
    setBusy(true)
    try {
      const res = await bank.revoke(confirm.id)
      setConsents((current) =>
        current?.map((c) => (c.id === res.consent_id ? { ...c, status: 'revoked', revoked_at: res.revoked_at } : c)) ?? null,
      )
      setNotice(`${confirm.client.name} was cut off`)
      setRevokedAt(new Date(res.revoked_at))
      setConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke access.')
    } finally {
      setBusy(false)
    }
  }

  const active = consents?.filter((c) => c.status === 'authorised') ?? []
  const past = consents?.filter((c) => c.status !== 'authorised') ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Connected Apps</h1>
        <p className="mt-2 text-base leading-6 text-muted">
          Apps and services you&apos;ve allowed to read your Stanbic account data{customer ? `, ${customer.full_name.split(' ')[0]}` : ''}.
          You can withdraw access at any time.
        </p>
      </header>

      {notice && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-base text-green-800">
          <span>
            <strong>{notice}</strong>
            {revokedAt && <> {Math.max(0, Math.round((now - revokedAt.getTime()) / 1000))} seconds ago.</>}{' '}
            Any request it makes from now on is refused — your password did not change and nothing else was affected.
          </span>
          <span aria-hidden="true" className="inline-flex items-center gap-1 text-sm text-green-700">
            <span className="size-2 animate-pulse rounded-full bg-green-500" /> enforced on the next call
          </span>
        </div>
      )}
      {error && <Notice tone="bad" className="mb-4">{error}</Notice>}

      {consents === null && !error && <Skeleton rows={2} height="h-32" />}

      {consents !== null && (
        <>
          <section aria-labelledby="active-title">
            <h2 id="active-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
              Active ({active.length})
            </h2>

            {active.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No connected apps" message="No apps currently have access to your accounts. When you connect one, it will appear here with exactly what it can see." />
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {active.map((c) => (
                  <li key={c.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold">
                          {c.client.name}
                          {c.client.website_url && (
                            <a href={c.client.website_url} target="_blank" rel="noreferrer" className="ml-2 text-sm font-normal text-bank underline">
                              {c.client.website_url.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </h3>
                        {c.client.description && <p className="mt-1 text-base text-muted">{c.client.description}</p>}
                        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm text-body sm:grid-cols-2">
                          <div><dt className="inline text-muted">Connected </dt><dd className="inline">{fmt(c.authorised_at)}</dd></div>
                          <div><dt className="inline text-muted">Access until </dt><dd className="inline">{fmt(c.expires_at)}</dd></div>
                          <div><dt className="inline text-muted">Accounts shared </dt><dd className="inline">{c.account_ids.length}</dd></div>
                        </dl>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {c.scopes.map((s) => (
                            <li key={s} className="rounded-full bg-canvas px-2.5 py-1 text-sm text-body">
                              {SCOPE_LABELS[s]?.title ?? s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button danger onClick={() => setConfirm(c)} className="shrink-0">
                        Remove access
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past-title" className="mt-8">
              <h2 id="past-title" className="text-xs font-semibold uppercase tracking-wide text-muted">
                Previously connected ({past.length})
              </h2>
              <ul className="mt-3 divide-y divide-canvas rounded-2xl border border-line bg-white">
                {past.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="text-base font-medium">{c.client.name}</p>
                      <p className="text-sm text-muted">
                        {c.status === 'revoked' ? `Access removed ${fmt(c.revoked_at)}` : `Connected ${fmt(c.authorised_at)}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-sm font-medium capitalize ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {confirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="revoke-title" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="revoke-title" className="text-lg font-semibold">Remove {confirm.client.name}&apos;s access?</h2>
            <p className="mt-3 text-base leading-6 text-muted">
              {confirm.client.name} will lose access to your account data immediately. Nothing else changes —
              your password stays the same and your other connected apps are unaffected. You can reconnect from the app later.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button secondary onClick={() => setConfirm(null)} disabled={busy}>
                Keep access
              </Button>
              <Button onClick={revoke} disabled={busy} className="!border-red-600 !bg-red-600 hover:!bg-red-700">
                {busy ? 'Removing…' : 'Remove access'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
