import { Link } from 'react-router-dom'
import type { PortalSummary } from '../../lib/portal'
import { API_URL } from '../../lib/api'
import { Chip, CodeBlock, Notice, Panel } from '../dash/ui'

/**
 * The path from a new account to a working integration.
 *
 * Every step is a real action against the live gateway, and each one reports
 * whether it has actually happened — read from the same audit trail the bank
 * sees, not from anything this page stores. A developer can leave and come back
 * and the checklist is still true.
 */

interface Step {
  title: string
  body: React.ReactNode
  done: boolean
  cta?: { label: string; to: string }
}

export default function Quickstart({ summary }: { summary: PortalSummary | null }) {
  const hasApp = (summary?.apps_total ?? 0) > 0
  const hasToken = (summary?.sandbox_consents ?? 0) > 0
  const hasCall = (summary?.calls ?? 0) > 0
  const hasHandledRevocation = (summary?.revoked_consents ?? 0) > 0

  const steps: Step[] = [
    {
      title: 'Register an app',
      done: hasApp,
      cta: { label: 'Go to My Apps', to: '/app/my-apis' },
      body: (
        <p>
          You get a <code className="rounded bg-canvas px-1 py-0.5 font-mono text-xs">client_id</code> and a
          secret. The secret is shown once and stored only as a hash — if you lose it, rotate rather than recover.
          Customers grant consent to an app, never to you directly.
        </p>
      ),
    },
    {
      title: 'Get a sandbox token',
      done: hasToken,
      cta: { label: 'Open the Sandbox', to: '/app/sandbox' },
      body: (
        <p>
          A sandbox token is a <strong>real access token</strong> for your app, bound to a pre-approved consent for a
          demo customer. No login screen, no consent screen — but every other check the gateway runs in production
          applies to it.
        </p>
      ),
    },
    {
      title: 'Make your first call',
      done: hasCall,
      cta: { label: 'Send a request', to: '/app/sandbox' },
      body: (
        <>
          <p className="mb-3">
            Pass the token as a bearer credential. Start with the accounts the customer agreed to share.
          </p>
          <CodeBlock
            title="Your first request"
            text={`curl "${API_URL}/api/v1/accounts" \\\n  -H "Authorization: Bearer $ACCESS_TOKEN"`}
          />
        </>
      ),
    },
    {
      title: 'Find the call in your logs',
      done: hasCall,
      cta: { label: 'View logs', to: '/app/developer-portal?tab=logs' },
      body: (
        <p>
          Every request your apps make is recorded with a{' '}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono text-xs">correlation_id</code>. It comes back
          on every response and in every error — quote it when you raise a support request and we can find the exact
          call.
        </p>
      ),
    },
  ]

  const done = steps.filter((s) => s.done).length

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Panel
          title="Get to your first call"
          subtitle="Four steps against the live gateway. Progress is read from your real activity."
          action={
            <Chip tone={done === steps.length ? 'ok' : 'accent'}>
              {done} of {steps.length} done
            </Chip>
          }
        >
          <ol className="flex flex-col gap-0">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-2 left-[13px] top-8 w-px ${step.done ? 'bg-emerald-300' : 'bg-line'}`}
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : 'border border-line bg-white text-muted'
                  }`}
                >
                  {step.done ? '✓' : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                    {step.done && (
                      <span className="text-xs font-medium text-emerald-700">Done</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs leading-6 text-body">{step.body}</div>
                  {step.cta && (
                    <Link
                      to={step.cta.to}
                      className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-body hover:bg-blue-50"
                    >
                      {step.cta.label} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Then handle the case most integrations forget"
          subtitle="A customer can withdraw access at any moment, and it takes effect on your very next call."
          action={hasHandledRevocation ? <Chip tone="ok">Tried it</Chip> : <Chip tone="warn">Not tried yet</Chip>}
        >
          <p className="text-xs leading-6 text-body">
            Consent is not permanent. When a customer revokes in their banking app, your token keeps its shape and
            its expiry — but the gateway re-checks the consent on every request, so the next call returns{' '}
            <strong>403</strong> with the code{' '}
            <code className="rounded bg-canvas px-1 py-0.5 font-mono text-xs">consent_revoked</code>. Your
            integration should treat that as "ask the customer to reconnect", not as an outage.
          </p>
          <div className="mt-4">
            <CodeBlock
              title="What your app receives after a revocation"
              text={`HTTP/1.1 403 Forbidden

{
  "error": {
    "code": "consent_revoked",
    "message": "The customer has revoked consent for this application",
    "correlation_id": "f1dca31e-83f0-440a-a52b-fcc82bf1096e"
  }
}`}
            />
          </div>
          <p className="mt-4 text-xs leading-6 text-body">
            You can trigger this on demand: the Sandbox has a <strong>Revoke consent</strong> control that withdraws
            your sandbox consent, so you can watch a working call start failing and build the recovery path before
            you ever touch a real customer.
          </p>
          <Link
            to="/app/sandbox"
            className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-body hover:bg-blue-50"
          >
            Simulate a revocation →
          </Link>
        </Panel>
      </div>

      <aside className="flex min-w-0 flex-col gap-5">
        <Panel title="How the live flow works" subtitle="What replaces the sandbox token in production.">
          <ol className="flex flex-col gap-3 text-xs leading-5 text-body">
            {[
              ['Send the customer to /oauth/authorize', 'with your client_id, redirect_uri and scopes.'],
              ['They log in on the bank’s page', 'You never see their credentials.'],
              ['They choose which accounts to share', 'Only ticked accounts become visible to you.'],
              ['You receive ?code= at your redirect_uri', 'Single use, five-minute expiry.'],
              ['Exchange it at /oauth/token', 'Server-side, with your client secret.'],
            ].map(([title, detail], i) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-canvas text-xs font-semibold text-body">
                  {i + 1}
                </span>
                <span>
                  <strong className="font-medium text-ink">{title}</strong>
                  <br />
                  {detail}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Notice>
          The full request and response reference — every endpoint, parameter and error — is published as an OpenAPI
          document at{' '}
          <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" className="font-medium underline">
            {API_URL}/docs
          </a>
          .
        </Notice>
      </aside>
    </div>
  )
}
