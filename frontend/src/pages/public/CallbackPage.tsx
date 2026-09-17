import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { consumeExpectedState, exchange, startConnect } from '../../lib/budgetbuddy'

/**
 * Where the bank sends the customer back after the consent screen.
 *
 * This is BudgetBuddy's redirect_uri. It checks the `state` it sent, hands the
 * authorization code to its own backend for exchange, and then gets out of the
 * way: the customer should land on their money, not on a page about OAuth.
 */

type Phase =
  | { kind: 'working' }
  | { kind: 'declined'; description: string | null }
  | { kind: 'failed'; message: string }
  | { kind: 'idle' }

export default function CallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const description = params.get('error_description')

  const [phase, setPhase] = useState<Phase>(() =>
    code ? { kind: 'working' } : error ? { kind: 'declined', description } : { kind: 'idle' },
  )

  // React 18 mounts effects twice in development; the code is single-use, so a
  // second exchange would fail and wrongly report an error to the customer.
  const started = useRef(false)

  useEffect(() => {
    if (!code || started.current) return
    started.current = true

    const expected = consumeExpectedState()
    if (expected && state !== expected) {
      setPhase({
        kind: 'failed',
        message:
          'That response did not match the request we started, so we stopped. Please begin the connection again.',
      })
      return
    }

    exchange(code)
      .then(() => navigate('/budgetbuddy?connected=1', { replace: true }))
      .catch((err: unknown) =>
        setPhase({ kind: 'failed', message: err instanceof Error ? err.message : 'The connection could not be completed.' }),
      )
  }, [code, state, navigate])

  return (
    <div className="grid min-h-dvh place-items-center bg-[#f4f8f6] px-4 font-[system-ui,'Segoe_UI',Arial,sans-serif] text-[#10231f]">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#0d7a5f] to-[#12a37c] text-sm font-bold text-white"
          >
            B
          </span>
          <span className="text-base font-semibold tracking-tight">BudgetBuddy</span>
        </div>

        <section className="rounded-3xl border border-[#dfe9e5] bg-white p-8 text-center">
          {phase.kind === 'working' && (
            <>
              <span
                aria-hidden="true"
                className="mx-auto block size-9 animate-spin rounded-full border-2 border-[#dfe9e5] border-t-[#0d7a5f]"
              />
              <h1 className="mt-5 text-xl font-semibold tracking-tight">Connecting your account…</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f7a73]">
                Stanbic approved the request. We&apos;re setting things up — this takes a second.
              </p>
            </>
          )}

          {phase.kind === 'declined' && (
            <>
              <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-[#f4f8f6] text-xl text-[#5f7a73]">
                ✕
              </span>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">No account was connected</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f7a73]">
                You declined the request at Stanbic, so nothing was shared and BudgetBuddy has no access.
                {phase.description ? ` (${phase.description})` : ''}
              </p>
              <button
                type="button"
                onClick={startConnect}
                className="mt-6 min-h-11 w-full max-w-xs cursor-pointer rounded-xl bg-[#0d7a5f] px-5 text-sm font-semibold text-white hover:bg-[#0a6250]"
              >
                Try connecting again
              </button>
            </>
          )}

          {phase.kind === 'failed' && (
            <>
              <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-[#fdefe6] text-xl text-[#c2410c]">
                !
              </span>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">We couldn&apos;t finish connecting</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f7a73]">{phase.message}</p>
              <button
                type="button"
                onClick={startConnect}
                className="mt-6 min-h-11 w-full max-w-xs cursor-pointer rounded-xl bg-[#0d7a5f] px-5 text-sm font-semibold text-white hover:bg-[#0a6250]"
              >
                Start again
              </button>
            </>
          )}

          {phase.kind === 'idle' && (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Nothing to complete</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f7a73]">
                This page finishes a bank connection. Start one from BudgetBuddy.
              </p>
              <Link
                to="/budgetbuddy"
                className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#0d7a5f] px-5 text-sm font-semibold text-white hover:bg-[#0a6250]"
              >
                Go to BudgetBuddy
              </Link>
            </>
          )}
        </section>

      </div>
    </div>
  )
}
