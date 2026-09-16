import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { bankSession } from '../lib/api'
import { bank } from '../lib/bank'

/**
 * The bank's own customer-facing pages: login, the consent screen, Connected Apps.
 *
 * This is deliberately a different visual world from the developer portal and
 * from BudgetBuddy — in the story, the customer has been handed over to the
 * bank's domain and it should look like it. The fintech never renders these.
 *
 * Everything except /bank/login requires a bank session.
 */
export default function BankLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const customer = bankSession.customer()
  const isLogin = location.pathname === '/bank/login'

  if (!isLogin && !bankSession.token()) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/bank/login?next=${encodeURIComponent(next)}`} replace />
  }

  function signOut() {
    bank.logout()
    navigate('/bank/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-canvas font-[Arial,Helvetica,sans-serif] text-ink">
      <header className="bg-bank text-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={customer ? '/bank/connected-apps' : '/bank/login'} className="flex items-center gap-3">
            <img src="/images/LogoWhite.png" alt="Stanbic IBTC" className="h-8 w-auto object-contain" />
            <span className="hidden border-l border-white/30 pl-3 text-sm text-blue-100 sm:block">Internet Banking</span>
          </Link>

          {customer && !isLogin && (
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-blue-100 sm:block">{customer.full_name}</span>
              <button
                type="button"
                onClick={signOut}
                className="min-h-9 cursor-pointer rounded-lg border border-white/30 px-3 text-xs font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-muted sm:px-6">
        You are on the bank&apos;s own site. Third-party apps never see your login details.
      </footer>
    </div>
  )
}
