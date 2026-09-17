import { Link, Outlet } from 'react-router-dom'

/**
 * Chrome for BudgetBuddy, the sample fintech app.
 *
 * Its look is deliberately nothing like the bank's: warm green, rounded, a
 * consumer product rather than an institution. That contrast is the point —
 * when the customer is handed to Stanbic to approve, they should be able to see
 * at a glance that they have left this app and arrived somewhere else.
 */
export default function SampleAppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f4f8f6] font-[system-ui,'Segoe_UI',Arial,sans-serif] text-[#10231f]">
      <a
        href="#bb-main"
        className="sr-only rounded bg-white p-3 text-sm focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>

      <header className="border-b border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/budgetbuddy" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#0d7a5f] to-[#12a37c] text-sm font-bold text-white"
            >
              B
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight">BudgetBuddy</span>
              <span className="block text-[11px] text-[#5f7a73]">A smarter way to manage your money</span>
            </span>
          </Link>

          <span className="rounded-full border border-[#dfe9e5] bg-[#f4f8f6] px-3 py-1 text-[11px] font-medium text-[#5f7a73]">
            Sample fintech app
          </span>
        </div>
      </header>

      <main id="bb-main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-[#dfe9e5] bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[11px] text-[#5f7a73] sm:px-6">
          <p>&copy; {new Date().getFullYear()} BudgetBuddy. Account data provided by Stanbic IBTC Open Banking.</p>
          <Link to="/" className="underline hover:text-[#0d7a5f]">
            Back to the marketplace
          </Link>
        </div>
      </footer>
    </div>
  )
}
