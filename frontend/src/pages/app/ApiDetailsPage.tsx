import { Link, useParams } from 'react-router-dom'
import { INTEGRATION_FACTS, findApiDetails } from '../../components/marketplace/apiDetails'
import type { ApiDetails } from '../../components/marketplace/apiDetails'
import { ButtonLink, CodeBlock } from '../../components/ui'
import { marketplaceApis } from '../../data/marketplace'

/**
 * One product in the catalogue. The left column says what it does and shows a
 * real response; the sticky right column lists what the gateway enforces —
 * every figure there is a backend default, not marketing.
 */

const sandbox = '/app/sandbox'
const docs = '/app/developer-portal?tab=documentation'

export default function ApiDetailsPage() {
  const { id } = useParams()
  const api = findApiDetails(id)
  if (!api)
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-canvas p-6 sm:p-9">
        <h1 className="text-2xl font-semibold">API not found</h1>
        <p className="my-4 text-sm text-muted">This API is not available in the current catalog.</p>
        <ButtonLink to="/app/marketplace">Back to Marketplace</ButtonLink>
      </div>
    )
  return <ApiDetailContent key={api.id} api={api} />
}

function SectionLabel({ children }: { children: string }) {
  return <h2 className="eyebrow mt-9">{children}</h2>
}

function ApiDetailContent({ api }: { api: ApiDetails }) {
  const scope = marketplaceApis.find((entry) => entry.id === api.id)?.scope
  const hasScope = scope && scope !== '—'
  const isConsentFlow = api.id === 'consent-api'
  const isReference = api.category === 'Reference'

  const requestText = api.request
    ? `${api.method} ${api.path}\nContent-Type: application/x-www-form-urlencoded\nAuthorization: Basic <client_id:client_secret>\n\n${Object.entries(api.request)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&')}`
    : `${api.method} ${api.path}\nAuthorization: Bearer <access_token>`

  const facts: [string, string][] = [
    ['Auth', INTEGRATION_FACTS.auth],
    ['Scope', isReference ? 'any partner token' : hasScope ? scope : 'n/a'],
    ['Rate limit', INTEGRATION_FACTS.rateLimit],
    ['Token life', INTEGRATION_FACTS.tokenLife],
    ['Consent life', isReference ? 'none needed' : INTEGRATION_FACTS.consentLife],
    ['Pricing', INTEGRATION_FACTS.pricing],
  ]

  return (
    <div className="min-h-[calc(100dvh-4rem)] min-w-0 bg-canvas p-4 text-ink sm:p-6 xl:p-8">
      <div className="mx-auto max-w-[1220px]">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-faint">
          <Link to="/app/marketplace" className="text-muted hover:text-primary">
            Marketplace
          </Link>
          <span aria-hidden="true">/</span>
          <span>{api.category}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-ink">
            {api.name}
          </span>
        </nav>

        {/* Header */}
        <header className="mt-4 flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div className="max-w-[620px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[28px] font-semibold leading-none tracking-[-0.03em]">{api.name}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d6ebe2] bg-[#edf7f3] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-live">
                <span aria-hidden="true" className="size-[5px] rounded-full bg-live" />
                Live
              </span>
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-muted text-pretty">{api.summary}</p>
            <div className="mt-4 inline-flex max-w-full items-center overflow-hidden rounded-lg border border-line bg-white">
              <span
                className={`border-r border-line px-3 py-2 font-mono text-[11px] font-semibold tracking-[0.06em] ${
                  api.method === 'GET' ? 'bg-[#f7faf9] text-live' : 'bg-tint text-primary'
                }`}
              >
                {api.method}
              </span>
              <span className="truncate px-3 py-2 font-mono text-xs text-ink">{api.path}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Sandbox access is immediate for every registered app; production access
                is a verification step, not a per-API request. */}
            <ButtonLink to={sandbox}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4.5v15l12-7.5-12-7.5Z" />
              </svg>
              Try in sandbox
            </ButtonLink>
            <ButtonLink to={docs} secondary>
              Documentation
            </ButtonLink>
          </div>
        </header>

        {/* Body */}
        <div className="mt-7 flex flex-wrap items-start gap-10">
          <div className="min-w-0 flex-[1_1_380px]">
            <p className="text-[15px] leading-7 text-body text-pretty">
              {api.overview}
              {hasScope && !isReference && (
                <>
                  {' '}
                  Requires the <span className="code-chip text-[13px]">{scope}</span> scope.
                </>
              )}
              {isReference && (
                <>
                  {' '}
                  Any token from an active client works, including one from the{' '}
                  <span className="code-chip text-[13px]">client_credentials</span> grant.
                </>
              )}
            </p>

            <SectionLabel>What teams build with it</SectionLabel>
            <div className="tile-grid mt-3.5 grid-cols-1 sm:grid-cols-2">
              {api.useCases.map((item) => (
                <article key={item.title} className="bg-white p-[18px]">
                  <h3 className="text-[13px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted text-pretty">{item.description}</p>
                </article>
              ))}
            </div>

            <SectionLabel>Capabilities</SectionLabel>
            <ul className="mt-3 flex flex-col">
              {api.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 border-b border-line-soft py-[11px] text-[13px] leading-relaxed text-body"
                >
                  <svg
                    aria-hidden="true"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-[3px] shrink-0 text-primary"
                  >
                    <path d="m4.5 12.5 5 5 10-11" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <SectionLabel>Example request</SectionLabel>
            <div className="mt-3">
              <CodeBlock title={`${api.method} · ${api.request ? 'form-encoded' : 'bearer token'}`} text={requestText} />
            </div>

            <SectionLabel>Example response</SectionLabel>
            <div className="mt-3">
              <CodeBlock title="200 OK · application/json" text={JSON.stringify(api.exampleResponse, null, 2)} />
            </div>
          </div>

          <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 lg:sticky lg:top-24 lg:max-w-[300px]">
            <section className="rounded-xl border border-line bg-white p-[18px]">
              <h2 className="eyebrow">Integration facts</h2>
              <dl className="mt-3 flex flex-col">
                {facts.map(([label, value], index) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between gap-3 py-[9px] ${
                      index < facts.length - 1 ? 'border-b border-line-soft' : ''
                    }`}
                  >
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="font-mono text-[11px] text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border border-line bg-white p-[18px]">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
                {isConsentFlow ? 'How the flow runs' : isReference ? 'Two calls, no customer' : 'Before you call this'}
              </h2>
              {isReference ? (
                <ol className="mt-2.5 flex list-decimal flex-col gap-2 pl-[18px] text-xs leading-relaxed text-muted">
                  <li>Register an app to get a client ID and secret.</li>
                  <li>
                    <span className="font-mono text-[11px] text-ink">POST /oauth/token</span> with{' '}
                    <span className="font-mono text-[11px] text-ink">grant_type=client_credentials</span> and Basic auth.
                  </li>
                  <li>Call this endpoint with the token. No customer is involved, so no consent screen.</li>
                </ol>
              ) : (
                <ol className="mt-2.5 flex list-decimal flex-col gap-2 pl-[18px] text-xs leading-relaxed text-muted">
                  <li>Register an app to get a client ID and secret.</li>
                  <li>
                    Send the customer through <span className="font-mono text-[11px] text-ink">/oauth/authorize</span>.
                  </li>
                  <li>
                    Exchange the code at <span className="font-mono text-[11px] text-ink">/oauth/token</span>.
                  </li>
                  {!isConsentFlow && (
                    <li>
                      Call this endpoint with the token; the consent must include{' '}
                      <span className="font-mono text-[11px] text-ink">{scope}</span>.
                    </li>
                  )}
                </ol>
              )}
              <ButtonLink
                to={isConsentFlow || isReference ? docs : '/app/marketplace/consent-api'}
                secondary
                size="sm"
                className="mt-3.5"
              >
                {isConsentFlow ? 'Read the full guide' : isReference ? 'Read the docs' : 'Read the consent guide'}
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </ButtonLink>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
