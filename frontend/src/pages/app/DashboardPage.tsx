import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { portalSession } from '../../lib/api'
import { portal, type App } from '../../lib/portal'

interface SummaryCard {
  label: string
  value: string
  detail: string
  positive?: boolean
  linkLabel: string
  to: string
}

/** Cards derived from the developer's real apps; the rest are platform-level placeholders. */
function buildSummaryCards(apps: App[] | null): SummaryCard[] {
  const active = apps?.filter((a) => a.status === 'active').length
  return [
    {
      label: 'Active apps',
      value: apps === null ? '—' : String(active),
      detail:
        apps === null
          ? 'Loading…'
          : active === 0
            ? 'Register an app to get credentials'
            : 'With client credentials',
      linkLabel: 'View My Apps',
      to: '/app/my-apis',
    },
    {
      label: 'Environment',
      value: 'Sandbox',
      detail: 'Mock core banking data',
      linkLabel: 'View API docs',
      to: '/app/developer-portal',
    },
    {
      label: 'Current Plan',
      value: 'Sandbox (free)',
      detail: 'Production plans require verification',
      linkLabel: 'How access works',
      to: '/app/marketplace/consent-api',
    },
    {
      label: 'Support Tickets',
      value: '0 open',
      detail: 'No open tickets',
      linkLabel: 'View Support',
      to: '/#support',
    },
  ]
}

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
    description: 'Register an app to get a client ID and secret.',
    complete: false,
    to: '/app/my-apis',
    action: 'Register app',
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
    title: 'Transactions API now supports cursor pagination',
    description:
      'Pass meta.pagination.next_cursor back as cursor to page through history.',
    date: 'Sep 15, 2026',
    dateTime: '2026-09-15',
  },
  {
    title: 'Scheduled maintenance',
    description:
      'Sandbox environment maintenance on Sunday, Nov 3, 02:00–04:00.',
    date: 'Sep 14, 2026',
    dateTime: '2026-09-14',
  },
  {
    title: 'New documentation experience',
    description:
      'Explore updated guides to help you build your integration.',
    date: 'Sep 13, 2026',
    dateTime: '2026-09-13',
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
    description: 'Get a sandbox token and call the live APIs.',
    to: '/app/sandbox',
    icon: 'code',
    color: 'bg-indigo-50 text-indigo-500',
  },
  {
    title: 'Apps & credentials',
    description: 'Register apps, copy client IDs, rotate secrets.',
    to: '/app/my-apis',
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
  const [apps, setApps] = useState<App[] | null>(null)

  const developer = portalSession.developer()
  const workspace = {
    firstName: (developer?.name ?? 'Developer').split(' ')[0],
    company: developer?.company ?? developer?.email ?? 'My workspace',
    accountType: developer?.company ? 'Business account' : 'Developer account',
  }

  useEffect(() => {
    portal
      .listApps()
      .then(setApps)
      .catch(() => setApps([]))
  }, [])

  const summaryCards = buildSummaryCards(apps)

  // "Create sandbox credentials" is done once the developer has an app.
  const steps = setupSteps.map((step) =>
    step.title === 'Create sandbox credentials'
      ? { ...step, complete: (apps?.length ?? 0) > 0 }
      : step,
  )
  const completedSteps = steps.filter((step) => step.complete).length
  const progress = Math.round(
    (completedSteps / steps.length) * 100,
  )

  const panelClass =
    'rounded-2xl border border-line bg-white shadow-sm'

  const focusClass =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600'

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-canvas p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-4">
        {/* Workspace overview */}
        <section
          aria-labelledby="dashboard-title"
          className="flex flex-col gap-5 rounded-lg bg-gradient-to-r from-ink via-primary-hover to-primary px-6 py-6 text-white xl:flex-row xl:items-center xl:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="bg-white/10 px-2 py-1 text-xs uppercase tracking-wider">
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
            <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-white/40 px-3 text-xs">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-amber-300"
              />
              Verification pending
            </span>

            <Link
              to="/app/settings"
              className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-medium text-body hover:bg-blue-50 ${focusClass}`}
            >
              Complete verification
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Summary cards */}
        <section
          aria-label="Workspace statistics"
          className="tile-grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="flex min-h-33 flex-col bg-white p-5"
            >
              <h2 className="eyebrow">{card.label}</h2>

              <p className="mt-3.5 text-[21px] font-semibold leading-none tracking-[-0.03em]">
                {card.value}
              </p>

              <p
                className={`mt-2 min-h-4 text-[11.5px] leading-5 ${
                  card.positive
                    ? 'text-live'
                    : 'text-faint'
                }`}
              >
                {card.detail}
              </p>

              <Link
                to={card.to}
                className={`mt-auto inline-flex min-h-9 items-center gap-1 pt-3 text-[11.5px] font-semibold text-primary hover:underline ${focusClass}`}
              >
                {card.linkLabel}
                <span aria-hidden="true">→</span>
              </Link>
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

                <span className="mt-1 block text-xs font-normal text-body">
                  Follow these steps to start building with our APIs.
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-3 text-xs font-normal text-body">
                <span>
                  {completedSteps} of {setupSteps.length} steps complete
                </span>

                <span
                  aria-hidden="true"
                  className="h-2 w-28 overflow-hidden rounded-full bg-canvas"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
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
            <ol className="mx-5 border-t border-canvas">
              {steps.map((step) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-3 border-b border-canvas py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                        step.complete
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'border border-line text-faint'
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

                      <p className="mt-1 text-xs leading-5 text-muted">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={step.to}
                    className={`shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-primary hover:bg-blue-50 ${focusClass}`}
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

                <p className="mt-1 text-xs text-body">
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
                className="shrink-0 text-muted"
              >
                <path d="M4 10v4h4l8 4V6l-8 4H4ZM8 14l2 6M20 8l2-1M20 12h2M20 16l2 1" />
              </svg>
            </div>

            <ul className="mt-3 divide-y divide-canvas">
              {updates.map((update) => (
                <li
                  key={update.title}
                  className="flex items-start gap-3 py-4 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink via-body to-[#ef4fbc] font-mono text-xs text-white"
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
                        className="shrink-0 text-xs leading-5 text-muted"
                      >
                        {update.date}
                      </time>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-body">
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

            <p className="mt-1 text-xs text-body">
              Quick links to help you build.
            </p>

            <div className="mt-4 space-y-3">
              {resources.map((resource) => (
                <Link
                  key={resource.title}
                  to={resource.to}
                  className={`flex items-center gap-3 rounded-xl border border-canvas p-3 hover:border-blue-200 hover:bg-blue-50/40 ${focusClass}`}
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

                    <p className="mt-1 text-xs leading-4 text-muted">
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
                    className="shrink-0 text-faint"
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