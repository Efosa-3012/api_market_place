import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import {
  ACCOUNT_LABEL,
  AccessRevoked,
  flowByCurrency,
  loadOverview,
  money,
  session,
  shortDate,
  startConnect,
  topOutgoings,
} from '../../lib/budgetbuddy'
import type { Overview, Session } from '../../lib/budgetbuddy'

/**
 * The customer's view of a third-party app.
 *
 * Three states, and the third is the one that matters: when the customer takes
 * access back at their bank, this app finds out on its very next request and
 * has to say so. Most integrations never show that path; here it is the point.
 */

type State =
  | { kind: 'disconnected' }
  | { kind: 'loading' }
  | { kind: 'ready'; overview: Overview }
  | { kind: 'revoked'; code: string }
  | { kind: 'error'; message: string }

export default function BudgetBuddyPage() {
  const [params, setParams] = useSearchParams()
  const [current, setCurrent] = useState<Session | null>(() => session.read())
  const [state, setState] = useState<State>(() => (session.read() ? { kind: 'loading' } : { kind: 'disconnected' }))
  const justConnected = params.get('connected') === '1'

  const refresh = useCallback(async (active: Session) => {
    setState({ kind: 'loading' })
    try {
      setState({ kind: 'ready', overview: await loadOverview(active.access_token) })
    } catch (err) {
      if (err instanceof AccessRevoked) {
        // The token is worthless now — drop it rather than keep retrying with it.
        session.clear()
        setCurrent(null)
        setState({ kind: 'revoked', code: err.code })
        return
      }
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' })
    }
  }, [])

  useEffect(() => {
    if (current) void refresh(current)
  }, [current, refresh])

  function disconnectLocally() {
    session.clear()
    setCurrent(null)
    setState({ kind: 'disconnected' })
  }

  // ---------------------------------------------------------------------------

  if (state.kind === 'disconnected') return <Disconnected />

  if (state.kind === 'revoked') return <Revoked code={state.code} />

  if (state.kind === 'error') {
    return (
      <Shell title="We couldn’t reach your bank">
        <p className="text-sm leading-6 text-[#5f7a73]">{state.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => current && void refresh(current)}
            className="min-h-11 cursor-pointer rounded-xl bg-[#0d7a5f] px-5 text-sm font-semibold text-white hover:bg-[#0a6250]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={disconnectLocally}
            className="min-h-11 cursor-pointer rounded-xl border border-[#dfe9e5] bg-white px-5 text-sm font-medium text-[#3d5a52] hover:bg-[#f4f8f6]"
          >
            Disconnect
          </button>
        </div>
      </Shell>
    )
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  return (
    <Connected
      overview={state.overview}
      justConnected={justConnected}
      onDismissBanner={() =>
        setParams(
          (existing) => {
            const next = new URLSearchParams(existing)
            next.delete('connected')
            return next
          },
          { replace: true },
        )
      }
      onRefresh={() => current && void refresh(current)}
      onDisconnect={disconnectLocally}
    />
  )
}

// ---------------------------------------------------------------------------

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[#dfe9e5] bg-white p-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Disconnected() {
  return (
    <div className="mx-auto max-w-2xl">
      <section className="overflow-hidden rounded-3xl border border-[#dfe9e5] bg-white">
        <div className="bg-gradient-to-br from-[#0d7a5f] to-[#12a37c] px-8 py-10 text-white">
          <h1 className="text-3xl font-semibold tracking-tight">See where your money goes</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/90">
            Connect your Stanbic IBTC account and BudgetBuddy will sort your spending for you — no spreadsheets, no
            forwarding statements.
          </p>
        </div>

        <div className="px-8 py-8">
          <button
            type="button"
            onClick={startConnect}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0d7a5f] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0a6250] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d7a5f]"
          >
            Connect your Stanbic account
          </button>

          <ul className="mt-7 flex flex-col gap-4">
            {[
              ['You approve on Stanbic’s own site', 'You log in with Stanbic. We never see your banking password.'],
              ['You choose which accounts to share', 'Only the accounts you tick become visible to BudgetBuddy.'],
              ['Read-only, and reversible', 'We can look, never move money. Disconnect at any time and we lose access immediately.'],
            ].map(([title, detail]) => (
              <li key={title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#e4f3ee] text-[11px] font-bold text-[#0d7a5f]"
                >
                  ✓
                </span>
                <span className="text-sm leading-6">
                  <strong className="font-medium">{title}</strong>
                  <span className="block text-[13px] text-[#5f7a73]">{detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-5 text-center text-xs text-[#5f7a73]">
        Powered by Stanbic IBTC Open Banking. Access lasts 90 days and you can withdraw it whenever you like.
      </p>
    </div>
  )
}

function Revoked({ code }: { code: string }) {
  const headline =
    code === 'client_deactivated'
      ? 'BudgetBuddy’s access was withdrawn'
      : code === 'consent_expired'
        ? 'Your connection expired'
        : 'Stanbic access was removed'

  const detail =
    code === 'client_deactivated'
      ? 'Stanbic IBTC has deactivated this app, so it can no longer read any customer’s account data.'
      : code === 'consent_expired'
        ? 'Connections last 90 days. Reconnect to keep your spending up to date.'
        : 'You disconnected BudgetBuddy in your Stanbic app, so we stopped receiving your account data straight away. Nothing was kept.'

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-3xl border border-[#f0d9c8] bg-white p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-14 place-items-center rounded-full bg-[#fdefe6] text-2xl text-[#c2410c]"
        >
          ⊘
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{headline}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#5f7a73]">{detail}</p>

        {code !== 'client_deactivated' && (
          <button
            type="button"
            onClick={startConnect}
            className="mt-7 min-h-12 w-full max-w-xs cursor-pointer rounded-xl bg-[#0d7a5f] px-6 text-sm font-semibold text-white hover:bg-[#0a6250]"
          >
            Reconnect your account
          </button>
        )}

        <p className="mt-4 text-xs text-[#5f7a73]">
          <Link to="/bank/connected-apps" className="underline hover:text-[#0d7a5f]">
            See your connected apps at Stanbic
          </Link>
        </p>
      </section>
    </div>
  )
}

function Connected({
  overview,
  justConnected,
  onDismissBanner,
  onRefresh,
  onDisconnect,
}: {
  overview: Overview
  justConnected: boolean
  onDismissBanner: () => void
  onRefresh: () => void
  onDisconnect: () => void
}) {
  const { accounts, activity } = overview
  const flows = flowByCurrency(activity)
  const primary = flows[0]
  const outgoings = primary
    ? topOutgoings(
        activity,
        primary.currency,
        accounts.map((a) => a.account),
      )
    : []
  const biggest = outgoings[0]?.total ?? 1

  return (
    <div className="flex flex-col gap-6">
      {justConnected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bfe5d7] bg-[#e9f7f1] px-5 py-4">
          <p className="text-sm text-[#0a5744]">
            <strong className="font-semibold">Connected.</strong> Your Stanbic accounts are linked — here is your money.
          </p>
          <button
            type="button"
            onClick={onDismissBanner}
            aria-label="Dismiss"
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-[#0a5744] hover:bg-white/60"
          >
            ✕
          </button>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your money</h1>
          <p className="mt-1 text-sm text-[#5f7a73]">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} shared from Stanbic IBTC ·{' '}
            {activity.length} recent transactions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#bfe5d7] bg-[#e9f7f1] px-3 py-1.5 text-[11px] font-medium text-[#0a5744]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#0d7a5f]" />
            Connected
          </span>
          <button
            type="button"
            onClick={onRefresh}
            className="min-h-9 cursor-pointer rounded-lg border border-[#dfe9e5] bg-white px-3 text-xs font-semibold text-[#3d5a52] hover:bg-[#f4f8f6]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="min-h-9 cursor-pointer rounded-lg border border-[#dfe9e5] bg-white px-3 text-xs font-medium text-[#5f7a73] hover:bg-[#f4f8f6]"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Accounts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map(({ account, balance }) => (
          <article key={account.account_id} className="rounded-2xl border border-[#dfe9e5] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {ACCOUNT_LABEL[account.account_type] ?? account.account_type}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[#8aa39b]">{account.account_number_masked}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f4f8f6] px-2 py-0.5 text-[10px] font-medium text-[#5f7a73]">
                {account.currency}
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold tabular-nums tracking-tight">
              {balance ? money(balance.amount, balance.currency) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-[#8aa39b]">
              {balance ? `Available · as of ${shortDate(balance.as_of)}` : 'Balance unavailable'}
            </p>
          </article>
        ))}
      </div>

      {/* Money in / out + where it went */}
      {primary && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-[#dfe9e5] bg-white p-6">
            <h2 className="text-sm font-semibold">Last 30 days</h2>
            <p className="mt-1 text-xs text-[#5f7a73]">
              Money in and out{flows.length > 1 ? ', by currency' : ''}.
            </p>

            <div className="mt-5 flex flex-col gap-5">
              {flows.map((flow) => {
                const scale = Math.max(flow.inflow, flow.outflow, 1)
                return (
                  <div key={flow.currency}>
                    {flows.length > 1 && (
                      <p className="mb-2 text-[11px] font-medium text-[#5f7a73]">{flow.currency}</p>
                    )}
                    {[
                      { label: 'In', value: flow.inflow, className: 'bg-[#0d7a5f]' },
                      { label: 'Out', value: flow.outflow, className: 'bg-[#f59e0b]' },
                    ].map((row) => (
                      <div key={row.label} className="mb-3 last:mb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-xs text-[#5f7a73]">{row.label}</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {money(String(row.value), flow.currency)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#eef4f1]">
                          <div
                            className={`h-full rounded-full ${row.className}`}
                            style={{ width: `${Math.max((row.value / scale) * 100, row.value > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="mt-2 text-[11px] text-[#8aa39b]">
                      {flow.inflow >= flow.outflow
                        ? `You saved ${money(String(flow.inflow - flow.outflow), flow.currency)} this month.`
                        : `You spent ${money(String(flow.outflow - flow.inflow), flow.currency)} more than came in.`}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dfe9e5] bg-white p-6">
            <h2 className="text-sm font-semibold">Where it went</h2>
            <p className="mt-1 text-xs text-[#5f7a73]">Biggest outgoings in {primary.currency}.</p>

            {outgoings.length === 0 ? (
              <p className="mt-5 text-sm text-[#5f7a73]">No spending in this period.</p>
            ) : (
              <ol className="mt-5 flex flex-col gap-4">
                {outgoings.map((row) => (
                  <li key={row.counterparty}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm">{row.counterparty}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {money(String(row.total), primary.currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#eef4f1]">
                      <div
                        className="h-full rounded-full bg-[#0d7a5f]"
                        style={{ width: `${Math.max((row.total / biggest) * 100, 2)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      {/* Activity */}
      <section className="overflow-hidden rounded-2xl border border-[#dfe9e5] bg-white">
        <header className="px-6 pb-4 pt-6">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <p className="mt-1 text-xs text-[#5f7a73]">Across every account you shared, newest first.</p>
        </header>

        {activity.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-[#5f7a73]">No transactions on the shared accounts yet.</p>
        ) : (
          <ul className="divide-y divide-[#eef4f1]">
            {activity.slice(0, 15).map((t) => (
              <li key={t.transaction_id} className="flex items-center gap-4 px-6 py-3.5">
                <span
                  aria-hidden="true"
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    t.type === 'credit' ? 'bg-[#e4f3ee] text-[#0d7a5f]' : 'bg-[#fdf4e6] text-[#b45309]'
                  }`}
                >
                  {t.type === 'credit' ? '↓' : '↑'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.counterparty}</span>
                  <span className="block truncate text-[11px] text-[#8aa39b]">{t.narration}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-sm font-semibold tabular-nums ${
                      t.type === 'credit' ? 'text-[#0d7a5f]' : 'text-[#10231f]'
                    }`}
                  >
                    {t.type === 'credit' ? '+' : '−'}
                    {money(t.amount, t.currency)}
                  </span>
                  <span className="block text-[11px] text-[#8aa39b]">{shortDate(t.booked_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs leading-5 text-[#5f7a73]">
        <Link to="/bank/connected-apps" className="underline hover:text-[#0d7a5f]">
          Manage or withdraw access at Stanbic
        </Link>
      </p>
    </div>
  )
}
