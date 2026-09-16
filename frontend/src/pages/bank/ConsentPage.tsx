import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { ApiError } from '../../lib/api'
import { bank, SCOPE_LABELS, type Consent, type ConsentAccount } from '../../lib/bank'

/**
 * The consent screen — the visual centrepiece of the whole platform.
 *
 * The customer sees exactly WHO is asking, WHAT they want, on WHICH accounts,
 * and for HOW LONG, then approves or declines. Approval hands a single-use
 * code back to the app via `redirect_to`; the app never touched the bank login.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; consent: Consent; accounts: ConsentAccount[] }
  | { kind: 'error'; title: string; message: string }
  | { kind: 'redirecting'; to: string; decision: 'approved' | 'declined' }

const currency = (amount: string, code: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(Number(amount))

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  current: 'Current account',
  savings: 'Savings account',
  domiciliary: 'Domiciliary account',
  fixed_deposit: 'Fixed deposit',
}

/** Partner logo if they supplied one, otherwise a lettermark — never a blank box. */
function AppLogo({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return <img src={url} alt="" onError={() => setFailed(true)} className="size-14 shrink-0 rounded-xl border border-[#e3e9f2] bg-white object-contain p-1" />
  }
  return (
    <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#0b2858] text-xl font-semibold text-white">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export default function ConsentPage() {
  const [params] = useSearchParams()
  const consentId = params.get('consent_id')

  const [state, setState] = useState<State>({ kind: 'loading' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!consentId) {
      setState({ kind: 'error', title: 'Nothing to approve', message: 'This link is missing a consent request. Go back to the app and try connecting again.' })
      return
    }
    let cancelled = false
    bank
      .getConsent(consentId)
      .then(({ consent, accounts }) => {
        if (cancelled) return
        if (consent.status !== 'awaiting_authorisation') {
          setState({
            kind: 'error',
            title: `This request is already ${consent.status.replace('_', ' ')}`,
            message: 'Go back to the app and start the connection again if you still want to link your account.',
          })
          return
        }
        // Pre-select active accounts; dormant ones stay unticked so the choice is visible.
        setSelected(new Set(accounts.filter((a) => a.status === 'active').map((a) => a.account_id)))
        setState({ kind: 'ready', consent, accounts })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 410) {
          setState({ kind: 'error', title: 'This request has expired', message: 'You took a little too long. Go back to the app and start again — it only takes a moment.' })
        } else if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'error', title: 'Request not found', message: 'This connection request does not exist or belongs to another customer.' })
        } else {
          setState({ kind: 'error', title: 'Something went wrong', message: err instanceof Error ? err.message : 'Please try again.' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [consentId])

  function toggle(accountId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(accountId)) next.delete(accountId)
      else next.add(accountId)
      return next
    })
  }

  async function approve() {
    if (state.kind !== 'ready' || selected.size === 0) return
    setBusy(true)
    setActionError('')
    try {
      const res = await bank.authorise(state.consent.id, [...selected])
      setState({ kind: 'redirecting', to: res.redirect_to, decision: 'approved' })
      window.location.assign(res.redirect_to)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not approve. Try again.')
      setBusy(false)
    }
  }

  async function decline() {
    if (state.kind !== 'ready') return
    setBusy(true)
    setActionError('')
    try {
      const res = await bank.reject(state.consent.id)
      setState({ kind: 'redirecting', to: res.redirect_to, decision: 'declined' })
      window.location.assign(res.redirect_to)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not decline. Try again.')
      setBusy(false)
    }
  }

  // ---------------------------------------------------------------------------

  if (state.kind === 'loading') {
    return <p className="py-20 text-center text-sm text-[#58708f]">Loading the request…</p>
  }

  if (state.kind === 'error') {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-[#e3e9f2] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{state.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#58708f]">{state.message}</p>
        <Link to="/bank/connected-apps" className="mt-6 inline-block text-sm text-[#0b2858] underline">
          Go to Connected Apps
        </Link>
      </section>
    )
  }

  if (state.kind === 'redirecting') {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-[#e3e9f2] bg-white p-8 text-center shadow-sm">
        <div aria-hidden="true" className={`mx-auto mb-4 grid size-14 place-items-center rounded-full text-2xl ${state.decision === 'approved' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
          {state.decision === 'approved' ? '✓' : '✕'}
        </div>
        <h1 className="text-xl font-semibold">{state.decision === 'approved' ? 'Access approved' : 'Request declined'}</h1>
        <p className="mt-3 text-sm text-[#58708f]">Taking you back to the app…</p>
        <a href={state.to} className="mt-4 inline-block text-xs text-[#0b2858] underline">
          Not redirected? Continue
        </a>
      </section>
    )
  }

  const { consent, accounts } = state
  const expiryDays = 90

  return (
    <div className="mx-auto max-w-2xl">
      <section aria-labelledby="consent-title" className="rounded-2xl border border-[#e3e9f2] bg-white shadow-sm">
        {/* Who */}
        <header className="border-b border-[#edf0f5] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#58708f]">Connection request</p>
          <div className="mt-3 flex items-start gap-4">
            <AppLogo name={consent.client.name} url={consent.client.logo_url} />
            <div className="min-w-0">
              <h1 id="consent-title" className="text-2xl font-semibold tracking-tight">
                <span className="text-[#0b2858]">{consent.client.name}</span> wants to access your account
              </h1>
              {consent.client.description && <p className="mt-2 text-sm leading-6 text-[#58708f]">{consent.client.description}</p>}
              <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#58708f]">
                <li className="inline-flex items-center gap-1">
                  <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-green-50 text-[10px] text-green-700">✓</span>
                  Registered partner since {new Date(consent.client.registered_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                </li>
                {consent.client.website_url && (
                  <li><a href={consent.client.website_url} target="_blank" rel="noreferrer" className="text-[#0b2858] underline">{consent.client.website_url.replace(/^https?:\/\//, '')}</a></li>
                )}
                {consent.client.privacy_policy_url && (
                  <li><a href={consent.client.privacy_policy_url} target="_blank" rel="noreferrer" className="text-[#0b2858] underline">Privacy policy</a></li>
                )}
              </ul>
            </div>
          </div>
        </header>

        {/* What */}
        <div className="border-b border-[#edf0f5] p-6 sm:p-8">
          <h2 className="text-sm font-semibold">It will be able to see</h2>
          <ul className="mt-3 space-y-3">
            {consent.scopes.map((scope) => {
              const label = SCOPE_LABELS[scope] ?? { title: scope, detail: '' }
              return (
                <li key={scope} className="flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-green-50 text-xs text-green-700">✓</span>
                  <div>
                    <p className="text-sm font-medium">{label.title}</p>
                    {label.detail && <p className="text-xs leading-5 text-[#58708f]">{label.detail}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 rounded-md bg-[#f3f5f9] px-3 py-2 text-xs leading-5 text-[#465b78]">
            <strong>Read-only.</strong> {consent.client.name} cannot move money, change your details, or see your password.
          </p>
        </div>

        {/* Which accounts */}
        <div className="border-b border-[#edf0f5] p-6 sm:p-8">
          <h2 className="text-sm font-semibold">Choose which accounts to share</h2>
          <p className="mt-1 text-xs text-[#58708f]">Only the accounts you tick will be visible to the app.</p>

          <ul className="mt-4 space-y-2">
            {accounts.map((account) => {
              const checked = selected.has(account.account_id)
              const dormant = account.status !== 'active'
              return (
                <li key={account.account_id}>
                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                      checked ? 'border-[#0b2858] bg-[#f3f6fc]' : 'border-[#e3e9f2] hover:bg-[#fafbfd]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(account.account_id)}
                      className="size-5 accent-[#0b2858]"
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">
                        {ACCOUNT_TYPE_LABEL[account.account_type] ?? account.account_type}
                        <span className="ml-2 font-normal text-[#58708f]">····{account.account_number.slice(-4)}</span>
                        {dormant && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">{account.status}</span>}
                      </span>
                      <span className="block text-xs text-[#58708f]">{account.currency}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{currency(account.account_balance, account.currency)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          {accounts.length === 0 && <p className="mt-4 text-sm text-[#58708f]">You have no accounts to share.</p>}
        </div>

        {/* How long + actions */}
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-6 text-[#465b78]">
            Access lasts <strong>{expiryDays} days</strong>. You can withdraw it at any time from{' '}
            <Link to="/bank/connected-apps" className="text-[#0b2858] underline">Connected Apps</Link> — the app loses access immediately and your password never changes.
          </p>

          {actionError && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={decline}
              disabled={busy}
              className="min-h-11 cursor-pointer rounded-md border border-[#e1e6ee] px-5 text-sm font-medium text-[#465b78] hover:bg-[#f7f9fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2858] disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={busy || selected.size === 0}
              className="min-h-11 cursor-pointer rounded-md bg-[#0b2858] px-6 text-sm font-medium text-white hover:bg-[#0f3a7d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2858] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Please wait…' : `Approve ${selected.size === 1 ? '1 account' : `${selected.size} accounts`}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
