import { useState } from 'react'
import { Link } from 'react-router-dom'

// Mock workspace data until the backend is connected.
const workspace = {
  firstName: 'Zainab',
  company: 'Meridian Payments Ltd',
  accountType: 'Business account',
}

const summaryCards = [
  {
    label: 'Active APIs',
    value: '8',
    detail: '',
    linkLabel: 'View My APIs',
    to: '/app/my-apis',
  },
  {
    label: 'API Calls This Month',
    value: '124.5K',
    detail: '↑ 12% from last month',
    positive: true,
    linkLabel: 'View Developer Portal',
    to: '/app/developer-portal',
  },
  {
    label: 'Current Plan',
    value: 'Pay-as-you-use',
    detail: 'Next billing date: Oct 31, 2024',
    linkLabel: 'View Billing',
    to: '/app/billing',
  },
  {
    label: 'Support Tickets',
    value: '1 open',
    detail: 'Updated 2 days ago',
    linkLabel: 'View Support',
    to: '/#support',
  },
]

const setupSteps = [
  {
    title: 'Create your workspace',
    description: 'Set up your account and workspace details.',
    complete: true,
    to: '/app/settings',
    action: 'View workspace',
  },
  {
    title: 'Explore the API marketplace',
    description: 'Find the APIs that fit your integration.',
    complete: true,
    to: '/app/marketplace',
    action: 'Explore APIs',
  },
  {
    title: 'Complete business verification',
    description: 'Review and complete your business information.',
    complete: false,
    to: '/app/settings',
    action: 'View settings',
  },
  {
    title: 'Create sandbox credentials',
    description: 'Get credentials for your test integration.',
    complete: false,
    to: '/app/developer-portal',
    action: 'Open portal',
  },
  {
    title: 'Make your first test request',
    description: 'Test an endpoint using sandbox data.',
    complete: false,
    to: '/app/developer-portal',
    action: 'Start testing',
  },
]

const updates = [
  {
    title: 'Transfer API v1.1 is now available',
    description:
      'Improved transfer status tracking and new validation features.',
    date: 'Oct 28, 2024',
    dateTime: '2024-10-28',
  },
  {
    title: 'Scheduled maintenance',
    description:
      'Sandbox environment maintenance on Sunday, Nov 3, 02:00–04:00.',
    date: 'Oct 26, 2024',
    dateTime: '2024-10-26',
  },
  {
    title: 'New documentation experience',
    description:
      'Explore updated guides to help you build your integration.',
    date: 'Oct 20, 2024',
    dateTime: '2024-10-20',
  },
]

const resources = [
  {
    title: 'API Documentation',
    description: 'Browse technical guides, schemas & endpoints.',
    to: '/app/developer-portal',
    icon: 'document',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Sandbox Environment',
    description: 'Test endpoints with mock financial data.',
    to: '/app/developer-portal',
    icon: 'code',
    color: 'bg-indigo-50 text-indigo-500',
  },
  {
    title: 'API Keys & Credentials',
    description: 'Manage, create or rotate access tokens.',
    to: '/app/developer-portal',
    icon: 'key',
    color: 'bg-amber-50 text-amber-600',
  },
]

function ResourceIcon({ name }: { name: string }) {
  return (
    <svg
      aria-hidden="true"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'document' && (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 7h6M9 11h6M9 15h4" />
        </>
      )}

      {name === 'code' && (
        <path d="m8 6-6 6 6 6m8-12 6 6-6 6" />
      )}

      {name === 'key' && (
        <>
          <circle cx="16" cy="8" r="4" />
          <path d="m13 11-9 9H2v-3l9-9M6 16l2 2" />
        </>
      )}
    </svg>
  )
}

export default function DashboardPage() {
  const [setupOpen, setSetupOpen] = useState(false)

  const completedSteps = setupSteps.filter((step) => step.complete).length
  const progress = Math.round(
    (completedSteps / setupSteps.length) * 100,
  )

  const panelClass =
    'rounded-2xl border border-[#e3e9f2] bg-white shadow-sm'

  const focusClass =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600'

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-[#f7f9fc] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-4">
        {/* Workspace overview */}
        <section
          aria-labelledby="dashboard-title"
          className="flex flex-col gap-5 rounded-lg bg-gradient-to-r from-[#0b1e2c] via-[#073db9] to-[#1054ff] px-6 py-6 text-white xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wider">
                Workspace overview
              </span>

              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-emerald-300"
              />
            </div>

            <h1
              id="dashboard-title"
              className="text-xl font-bold tracking-tight sm:text-2xl"
            >
              Welcome back, {workspace.firstName}{' '}
              <span aria-hidden="true">👋</span>
            </h1>

            <p className="mt-2 text-sm text-blue-100">
              {workspace.company} · {workspace.accountType}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-md border border-white/40 px-3 text-xs">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-amber-300"
              />
              Verification pending
            </span>

            <Link
              to="/app/settings"
              className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-white px-3 text-xs font-medium text-[#33445d] hover:bg-blue-50 ${focusClass}`}
            >
              Complete verification
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Summary cards */}
        <section
          aria-label="Workspace statistics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className={`${panelClass} flex min-h-40 flex-col p-5`}
            >
              <h2 className="text-xs text-[#465b78]">
                {card.label}
              </h2>

              <p className="mt-2 text-lg font-semibold leading-6">
                {card.value}
              </p>

              <p
                className={`mt-2 min-h-4 text-xs ${
                  card.positive
                    ? 'text-emerald-600'
                    : 'text-[#8190a7]'
                }`}
              >
                {card.detail}
              </p>

              <div className="mt-auto pt-4">
                <Link
                  to={card.to}
                  className={`flex min-h-9 items-center gap-1 border-t border-[#edf0f5] pt-3 text-xs font-medium text-[#0450ff] hover:underline ${focusClass}`}
                >
                  {card.linkLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </section>

        {/* Integration checklist */}
        <section className={panelClass}>
          <h2>
            <button
              type="button"
              aria-expanded={setupOpen}
              aria-controls="integration-checklist"
              onClick={() => setSetupOpen((current) => !current)}
              className={`flex w-full cursor-pointer flex-col gap-5 rounded-2xl p-5 text-left lg:flex-row lg:items-center lg:justify-between ${focusClass}`}
            >
              <span>
                <span className="block text-sm font-semibold">
                  Get your first integration up and running
                </span>

                <span className="mt-1 block text-xs font-normal text-[#465b78]">
                  Follow these steps to start building with our APIs.
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-3 text-xs font-normal text-[#465b78]">
                <span>
                  {completedSteps} of {setupSteps.length} steps complete
                </span>

                <span
                  aria-hidden="true"
                  className="h-2 w-28 overflow-hidden rounded-full bg-[#edf2f8]"
                >
                  <span
                    className="block h-full rounded-full bg-[#0450ff]"
                    style={{ width: `${progress}%` }}
                  />
                </span>

                <span>{progress}%</span>

                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className={setupOpen ? 'rotate-180' : ''}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
          </h2>

          <div id="integration-checklist" hidden={!setupOpen}>
            <ol className="mx-5 border-t border-[#edf0f5]">
              {setupSteps.map((step) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-3 border-b border-[#edf0f5] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                        step.complete
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'border border-[#d7e0ed] text-[#8b9bb2]'
                      }`}
                    >
                      {step.complete ? '✓' : '○'}
                    </span>

                    <div>
                      <p className="text-sm font-medium">
                        <span className="sr-only">
                          {step.complete ? 'Complete: ' : 'Incomplete: '}
                        </span>
                        {step.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#58708f]">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={step.to}
                    className={`shrink-0 rounded-md px-2 py-2 text-xs font-medium text-[#0450ff] hover:bg-blue-50 ${focusClass}`}
                  >
                    {step.action} <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Updates */}
          <section
            aria-labelledby="updates-title"
            className={`${panelClass} p-5`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="updates-title"
                  className="text-sm font-semibold"
                >
                  What’s new
                </h2>

                <p className="mt-1 text-xs text-[#465b78]">
                  Latest updates from Stanbic IBTC APIs.
                </p>
              </div>

              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-[#8190a7]"
              >
                <path d="M4 10v4h4l8 4V6l-8 4H4ZM8 14l2 6M20 8l2-1M20 12h2M20 16l2 1" />
              </svg>
            </div>

            <ul className="mt-3 divide-y divide-[#edf0f5]">
              {updates.map((update) => (
                <li
                  key={update.title}
                  className="flex items-start gap-3 py-4 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#111827] via-[#26395a] to-[#ef4fbc] font-mono text-xs text-white"
                  >
                    {'</>'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 xl:flex-row xl:items-start xl:justify-between xl:gap-3">
                      <h3 className="text-xs font-semibold leading-5">
                        <span
                          aria-hidden="true"
                          className="mr-1 inline-block size-1.5 rounded-full bg-sky-500"
                        />
                        {update.title}
                      </h3>

                      <time
                        dateTime={update.dateTime}
                        className="shrink-0 text-[11px] leading-5 text-[#8190a7]"
                      >
                        {update.date}
                      </time>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-[#465b78]">
                      {update.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Resources */}
          <section
            aria-labelledby="resources-title"
            className={`${panelClass} p-5`}
          >
            <h2
              id="resources-title"
              className="text-sm font-semibold"
            >
              Resources
            </h2>

            <p className="mt-1 text-xs text-[#465b78]">
              Quick links to help you build.
            </p>

            <div className="mt-4 space-y-3">
              {resources.map((resource) => (
                <Link
                  key={resource.title}
                  to={resource.to}
                  className={`flex items-center gap-3 rounded-xl border border-[#edf0f5] p-3 hover:border-blue-200 hover:bg-blue-50/40 ${focusClass}`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${resource.color}`}
                  >
                    <ResourceIcon name={resource.icon} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">
                      {resource.title}
                    </h3>

                    <p className="mt-1 text-xs leading-4 text-[#58708f]">
                      {resource.description}
                    </p>
                  </div>

                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="shrink-0 text-[#8b9bb2]"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}