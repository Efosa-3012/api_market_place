import { Link } from 'react-router-dom'
import { API_URL } from '../../lib/api'
import { Chip, CodeBlock, Notice, Panel } from '../dash/ui'

/**
 * The integration reference.
 *
 * Every status code, scope and endpoint on this page is what the gateway
 * actually returns — checked against backend/openapi/openapi.yaml. The generated
 * OpenAPI document at /docs remains the authority for request and response
 * shapes; this page is the narrative a developer reads first.
 */

const SCOPES = [
  {
    scope: 'accounts:read',
    grants: 'The accounts a customer ticked on the consent screen — type, currency, status and a masked number.',
    endpoints: ['GET /api/v1/accounts', 'GET /api/v1/accounts/{accountId}'],
  },
  {
    scope: 'balances:read',
    grants: 'Available and ledger balances, as decimal strings with a currency and an as-of timestamp.',
    endpoints: ['GET /api/v1/accounts/{accountId}/balances'],
  },
  {
    scope: 'transactions:read',
    grants: 'Transaction history with amounts, dates, references and counterparties.',
    endpoints: ['GET /api/v1/accounts/{accountId}/transactions'],
  },
]

/** Exactly the codes the gateway emits. No 422 — validation failures are 400. */
const ERRORS = [
  { status: 400, code: 'validation_error', meaning: 'A query parameter or body field failed validation. The response lists which.' },
  { status: 401, code: 'invalid_token', meaning: 'Missing, malformed, or unrecognised access token.' },
  { status: 401, code: 'token_expired', meaning: 'The access token is past its expiry. Obtain a new one.' },
  { status: 403, code: 'consent_revoked', meaning: 'The customer withdrew access. Ask them to reconnect.' },
  { status: 403, code: 'consent_expired', meaning: 'The consent passed its 90-day life. Ask them to reconnect.' },
  { status: 403, code: 'insufficient_scope', meaning: 'The consent does not cover this resource. Request the scope up front.' },
  { status: 403, code: 'client_deactivated', meaning: 'Your app was deactivated. Every consent under it is revoked.' },
  { status: 404, code: 'account_not_found', meaning: 'Not one of the accounts the customer shared. Deliberately 404 rather than 403.' },
  { status: 410, code: 'consent_request_expired', meaning: 'The customer took too long on the consent screen. Start the flow again.' },
  { status: 429, code: 'rate_limited', meaning: 'Your client exceeded its quota. Back off until the RateLimit reset.' },
  { status: 502, code: 'upstream_unavailable', meaning: 'Core banking did not answer. Safe to retry.' },
]

function Section({
  title,
  summary,
  open = false,
  children,
}: {
  title: string
  summary: string
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={open} className="group rounded-2xl border border-[#e1e8f2] bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#142033]">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-[#65758e]">{summary}</span>
          </span>
          <span
            aria-hidden="true"
            className="mt-1 shrink-0 text-[#8ea3c0] transition-transform group-open:rotate-90"
          >
            ›
          </span>
        </span>
      </summary>
      <div className="border-t border-[#eef2f8] px-5 py-5">{children}</div>
    </details>
  )
}

export default function Documentation() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Section
          open
          title="Authentication"
          summary="Where an access token comes from, and how to present it."
        >
          <p className="text-xs leading-6 text-[#465b78]">
            Every call to <code className="font-mono">/api/v1/*</code> carries an access token that represents{' '}
            <strong>one customer's consent to one app</strong>. There are no API keys: a token is only ever issued
            after a customer approves your request on the bank's own pages, and it stops working the moment they
            change their mind.
          </p>

          <div className="mt-4">
            <CodeBlock title="Every request" text={`Authorization: Bearer <access_token>`} />
          </div>

          <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#8ea3c0]">
            Getting a token — the authorization code flow
          </h4>
          <ol className="mt-3 flex flex-col gap-3 text-xs leading-6 text-[#465b78]">
            <li>
              <strong className="text-[#142033]">1. Send the customer to the bank.</strong> Redirect their browser to{' '}
              <code className="font-mono">GET /oauth/authorize</code> with{' '}
              <code className="font-mono">response_type=code</code>, your{' '}
              <code className="font-mono">client_id</code>, a registered{' '}
              <code className="font-mono">redirect_uri</code>, space-separated{' '}
              <code className="font-mono">scope</code>, and a <code className="font-mono">state</code> value you
              generate.
            </li>
            <li>
              <strong className="text-[#142033]">2. They approve on the bank's pages.</strong> They log in and choose
              which accounts to share. You never see their credentials, and you only get the accounts they tick.
            </li>
            <li>
              <strong className="text-[#142033]">3. You receive a code.</strong> The bank redirects back to your{' '}
              <code className="font-mono">redirect_uri</code> with <code className="font-mono">?code=…&amp;state=…</code>.
              Check the state matches what you sent. If they declined, you get{' '}
              <code className="font-mono">?error=access_denied</code> instead.
            </li>
            <li>
              <strong className="text-[#142033]">4. Exchange it for a token.</strong> Single use, five-minute expiry,
              and it must be exchanged <em>from your server</em> — the call needs your client secret.
            </li>
          </ol>

          <div className="mt-4">
            <CodeBlock
              title="Step 4 — exchange the code (server-side)"
              text={`curl -X POST "${API_URL}/oauth/token" \\
  -u "$CLIENT_ID:$CLIENT_SECRET" \\
  -d "grant_type=authorization_code" \\
  -d "code=$CODE" \\
  -d "redirect_uri=$REDIRECT_URI"

# 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "scope": "accounts:read balances:read transactions:read",
  "consent_id": "26f09647-adbe-4393-8b47-35a0f659d782"
}`}
            />
          </div>

          <Notice tone="warn">
            <strong>Keep the client secret on your server.</strong> The token exchange is the only call that uses it,
            and it must never reach a browser or a mobile binary. If a secret leaks, rotate it from My Apps — the old
            one stops working immediately.
          </Notice>
        </Section>

        <Section title="Scopes" summary="What each scope grants, and which endpoints it unlocks.">
          <p className="mb-4 text-xs leading-6 text-[#465b78]">
            Request only the scopes you need — the customer sees each one written out on the consent screen, and a
            shorter list is approved more often. A call outside your granted scopes returns{' '}
            <strong>403 insufficient_scope</strong>.
          </p>
          <ul className="flex flex-col gap-4">
            {SCOPES.map((item) => (
              <li key={item.scope} className="rounded-xl border border-[#eef2f8] bg-[#fafbfd] p-4">
                <code className="font-mono text-xs font-semibold text-[#0450ff]">{item.scope}</code>
                <p className="mt-2 text-xs leading-5 text-[#465b78]">{item.grants}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {item.endpoints.map((endpoint) => (
                    <li key={endpoint}>
                      <code className="rounded border border-[#e1e8f2] bg-white px-2 py-1 font-mono text-[10px] text-[#465b78]">
                        {endpoint}
                      </code>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Errors" summary="The exact codes the gateway returns, and what to do about each.">
          <p className="mb-4 text-xs leading-6 text-[#465b78]">
            Every error uses the same envelope, with a stable machine-readable{' '}
            <code className="font-mono">code</code> — branch on that, never on the message text.
          </p>
          <CodeBlock
            title="Error envelope"
            text={`{
  "error": {
    "code": "consent_revoked",
    "message": "The customer has revoked consent for this application",
    "correlation_id": "f1dca31e-83f0-440a-a52b-fcc82bf1096e"
  }
}`}
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#eef2f8] text-[10px] uppercase tracking-wide text-[#8ea3c0]">
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Code</th>
                  <th scope="col" className="py-2 font-medium">What it means</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map((row) => (
                  <tr key={row.code} className="border-b border-[#f4f7fb] last:border-0 align-top">
                    <td className="py-3 pr-3">
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          row.status >= 500 ? 'text-red-700' : row.status >= 400 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <code className="font-mono text-[11px] text-[#142033]">{row.code}</code>
                    </td>
                    <td className="py-3 leading-5 text-[#465b78]">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice>
            <strong>There is no 422.</strong> Validation failures come back as <strong>400</strong> with the code{' '}
            <code className="font-mono">validation_error</code> and a <code className="font-mono">details</code> array
            naming each field.
          </Notice>
        </Section>

        <Section title="Rate limits" summary="Per-client quotas, and the headers that tell you where you stand.">
          <p className="text-xs leading-6 text-[#465b78]">
            Quotas are counted per <code className="font-mono">client_id</code>, never per IP address — so spreading
            calls across servers does not raise your limit, and sharing an IP with another partner does not lower it.
            Every response carries your current position.
          </p>
          <div className="mt-4">
            <CodeBlock
              title="Headers on every /api/v1 response"
              text={`RateLimit-Policy: 60;w=60
RateLimit: limit=60, remaining=53, reset=60`}
            />
          </div>
          <p className="mt-4 text-xs leading-6 text-[#465b78]">
            Exceeding the quota returns <strong>429</strong> with the code{' '}
            <code className="font-mono">rate_limited</code>. Back off until the window resets rather than retrying
            immediately — retries inside the window still count against you.
          </p>
        </Section>

        <Section title="Pagination" summary="How to page through transaction history.">
          <p className="text-xs leading-6 text-[#465b78]">
            Transactions use an opaque cursor. Read{' '}
            <code className="font-mono">meta.pagination.next_cursor</code> from a response and pass it back as{' '}
            <code className="font-mono">cursor</code> to get the next page. Stop when{' '}
            <code className="font-mono">has_more</code> is <code className="font-mono">false</code>. Do not construct
            or decode a cursor yourself — the format is not part of the contract.
          </p>
          <div className="mt-4">
            <CodeBlock
              title="Paging through history"
              text={`# first page
curl "${API_URL}/api/v1/accounts/$ACCOUNT_ID/transactions?limit=50" \\
  -H "Authorization: Bearer $ACCESS_TOKEN"

# -> "meta": { "pagination": { "limit": 50, "has_more": true, "next_cursor": "eyJhIjoi..." } }

# next page
curl "${API_URL}/api/v1/accounts/$ACCOUNT_ID/transactions?limit=50&cursor=eyJhIjoi..." \\
  -H "Authorization: Bearer $ACCESS_TOKEN"`}
            />
          </div>
          <p className="mt-4 text-xs leading-6 text-[#465b78]">
            Filters: <code className="font-mono">from</code> and <code className="font-mono">to</code> (ISO 8601),{' '}
            <code className="font-mono">type</code> (<code className="font-mono">credit</code> or{' '}
            <code className="font-mono">debit</code>), and <code className="font-mono">sort</code> (
            <code className="font-mono">booked_at_desc</code> or <code className="font-mono">booked_at_asc</code>).
          </p>
        </Section>

        <Section title="Money and dates" summary="Conventions that will bite you if you assume otherwise.">
          <ul className="flex flex-col gap-3 text-xs leading-6 text-[#465b78]">
            <li>
              <strong className="text-[#142033]">Amounts are decimal strings</strong>, never numbers —{' '}
              <code className="font-mono">"1250500.50"</code>. Parsing them as a float loses precision. Use a decimal
              type in your language.
            </li>
            <li>
              <strong className="text-[#142033]">Every amount carries its currency.</strong> Accounts may be NGN, USD
              or GBP. Never assume a customer's accounts share one currency.
            </li>
            <li>
              <strong className="text-[#142033]">Timestamps are ISO 8601 in UTC.</strong> Convert for display; compare
              in UTC.
            </li>
            <li>
              <strong className="text-[#142033]">Account numbers are masked</strong> to the last four digits, and
              internal bank fields — branch, relationship manager, ledger internals — are never returned.
            </li>
          </ul>
        </Section>

        <Section title="Support" summary="What to send us when something goes wrong.">
          <p className="text-xs leading-6 text-[#465b78]">
            Every response carries an <code className="font-mono">X-Correlation-Id</code> header, and every error
            repeats it in the body as <code className="font-mono">correlation_id</code>. It identifies that one
            request in the gateway's audit trail.
          </p>
          <p className="mt-3 text-xs leading-6 text-[#465b78]">
            Log it on your side. When you raise a support request, send the correlation ID and we can find the exact
            call — far faster than a description of what you think happened. Your own copy of the trail is in{' '}
            <Link to="/app/developer-portal?tab=logs" className="font-medium text-[#0450ff] hover:underline">
              Logs
            </Link>
            .
          </p>
          <p className="mt-3 text-xs leading-6 text-[#465b78]">
            You can also set the header yourself on the way in — send your own{' '}
            <code className="font-mono">X-Correlation-Id</code> and the gateway will use it, tying our trail to yours.
          </p>
        </Section>
      </div>

      <aside className="flex min-w-0 flex-col gap-5">
        <Panel title="API reference" subtitle="Generated from the spec the gateway serves.">
          <p className="text-xs leading-6 text-[#465b78]">
            Every endpoint, parameter and response shape, browsable and always in step with the running service.
          </p>
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-[#0450ff] bg-[#0450ff] px-4 text-xs font-semibold text-white hover:bg-[#003bd0]"
          >
            Open API reference ↗
          </a>
          <p className="mt-3 text-[11px] text-[#8ea3c0]">
            Raw document:{' '}
            <a href={`${API_URL}/openapi.yaml`} target="_blank" rel="noreferrer" className="underline">
              openapi.yaml
            </a>
          </p>
        </Panel>

        <Panel title="Try it without a customer" subtitle="A real token bound to a demo consent.">
          <p className="text-xs leading-6 text-[#465b78]">
            The Sandbox mints a genuine access token for your app against a pre-approved consent, so you can call
            every endpoint — and revoke the consent to see what your error path looks like.
          </p>
          <Link
            to="/app/sandbox"
            className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-[#dfe6f0] bg-white px-4 text-xs font-semibold text-[#405371] hover:bg-blue-50"
          >
            Open the Sandbox →
          </Link>
        </Panel>

        <Panel title="At a glance">
          <dl className="flex flex-col gap-3 text-xs">
            {[
              ['Base URL', <code key="u" className="break-all font-mono text-[11px]">{API_URL}</code>],
              ['Auth', 'OAuth 2.0 authorization code'],
              ['Token lifetime', '24 hours'],
              ['Consent lifetime', '90 days'],
              ['Default quota', '60 requests / minute / client'],
              ['Format', 'JSON'],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-[#8ea3c0]">{label}</dt>
                <dd className="min-w-0 text-right font-medium text-[#142033]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <Chip tone="accent">Sandbox data only</Chip>
          </div>
        </Panel>
      </aside>
    </div>
  )
}
