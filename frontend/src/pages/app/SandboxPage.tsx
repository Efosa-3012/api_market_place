import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { portal, type App } from '../../lib/portal'
import {
  SANDBOX_ENDPOINTS,
  buildUrl,
  curlFor,
  sandbox,
  send,
  type SandboxEndpoint,
  type SandboxResponse,
  type SandboxState,
  type SandboxToken,
} from '../../lib/sandbox'
import { Button, ButtonLink, Notice, Skeleton, inputClass } from '../../components/ui'

/**
 * The try-it console. A developer picks one of their apps, gets a real sandbox
 * access token (bound to a pre-authorised consent for the demo customer), and
 * calls the live gateway from the browser — same checks, same responses, same
 * headers their production integration will see.
 */

const input = inputClass
const panel = 'rounded-2xl border border-line bg-white'

interface HistoryItem {
  id: number
  method: string
  path: string
  status: number
  ms: number
  at: string
}

function statusTone(status: number) {
  if (status >= 500) return 'bg-red-50 text-red-700'
  if (status >= 400) return 'bg-amber-50 text-amber-700'
  return 'bg-green-50 text-green-700'
}

function Code({ children, wrap = false }: { children: string; wrap?: boolean }) {
  return (
    <pre className={`overflow-x-auto rounded-lg bg-ink p-4 text-[12px] leading-5 text-slate-100 ${wrap ? 'whitespace-pre-wrap break-all' : ''}`}>
      <code>{children}</code>
    </pre>
  )
}

export default function SandboxPage() {
  // Apps
  const [apps, setApps] = useState<App[] | null>(null)
  const [appId, setAppId] = useState('')
  const app = apps?.find((a) => a.id === appId)

  // Sandbox state + token
  const [state, setState] = useState<SandboxState | null>(null)
  const [token, setToken] = useState<SandboxToken | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Request builder
  const [endpointId, setEndpointId] = useState(SANDBOX_ENDPOINTS[0].id)
  const endpoint: SandboxEndpoint = SANDBOX_ENDPOINTS.find((e) => e.id === endpointId) ?? SANDBOX_ENDPOINTS[0]
  const [values, setValues] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<SandboxResponse | null>(null)
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')
  const [history, setHistory] = useState<HistoryItem[]>([])

  // --- load apps ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    portal
      .listApps()
      .then((list) => {
        if (cancelled) return
        setApps(list)
        const firstActive = list.find((a) => a.status === 'active')
        if (firstActive) setAppId(firstActive.id)
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load your apps.'))
    return () => {
      cancelled = true
    }
  }, [])

  // --- load sandbox state when the app changes ---------------------------------
  useEffect(() => {
    if (!appId) return
    let cancelled = false
    setState(null)
    setToken(null)
    setResponse(null)
    setError('')
    sandbox
      .state(appId)
      .then((s) => {
        if (cancelled) return
        setState(s)
        const first = s.accounts[0]?.account_id ?? ''
        setValues((v) => ({ ...v, accountId: v.accountId || first }))
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load sandbox state.'))
    return () => {
      cancelled = true
    }
  }, [appId])

  async function mint() {
    if (!appId) return
    setBusy(true)
    setError('')
    try {
      const t = await sandbox.mintToken(appId)
      setToken(t)
      setState((s) => (s ? { ...s, consent: t } : s))
      setNotice(t.status === 'authorised' ? 'Sandbox token issued.' : '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue a sandbox token.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    if (!appId) return
    setBusy(true)
    setError('')
    try {
      const r = await sandbox.revoke(appId)
      setState((s) => (s ? { ...s, consent: null } : s))
      setNotice(
        r.consents_revoked > 0
          ? 'Sandbox consent revoked — exactly what happens when a customer removes your app in their bank. Send a request to see the 403.'
          : 'No active sandbox consent to revoke.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke.')
    } finally {
      setBusy(false)
    }
  }

  const missingRequired = endpoint.params.some((p) => p.required && !values[p.name])
  const { path, url } = buildUrl(endpoint, values)

  async function run() {
    if (!token || missingRequired) return
    setSending(true)
    setError('')
    try {
      const r = await send(url, token.access_token)
      setResponse(r)
      setResponseTab('body')
      setHistory((h) => [{ id: Date.now(), method: endpoint.method, path, status: r.status, ms: r.ms, at: new Date().toLocaleTimeString() }, ...h].slice(0, 12))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setSending(false)
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => setNotice(`${label} copied.`),
      () => setNotice('Copy failed — clipboard needs HTTPS or localhost.'),
    )
  }

  const hasScope = token ? token.scopes.includes(endpoint.scope) : true
  const tokenPreview = token ? `${token.access_token.slice(0, 24)}…${token.access_token.slice(-8)}` : ''

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <ol className="flex items-center gap-2">
          <li><Link to="/app/dashboard" className="hover:text-blue-600 hover:underline">Dashboard</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">Sandbox</li>
        </ol>
      </nav>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Sandbox</h1>
          <p className="mt-2 max-w-2xl text-sm text-body">
            Get a sandbox token for one of your apps and call the live gateway from here. The token is bound to a
            pre-approved consent for demo customer <code className="text-xs">{state?.customer_id ?? 'customer-demo-001'}</code>, so there is no
            login or consent screen to go through.
          </p>
        </div>
        <ButtonLink secondary external to={`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/docs`}>
          Open API reference ↗
        </ButtonLink>
      </div>

      {notice && <Notice className="mt-4">{notice}</Notice>}
      {error && <Notice tone="bad" className="mt-4">{error}</Notice>}

      {/* ------------------------------------------------------------------ */}
      {/* Step 1 — app + token                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className={`${panel} mt-6 p-5`} aria-labelledby="token-title">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="token-title" className="text-sm font-semibold">1. Choose an app and get a sandbox token</h2>
            <label htmlFor="sandbox-app" className="mt-4 block text-xs font-medium text-muted">App</label>
            <select id="sandbox-app" value={appId} onChange={(e) => setAppId(e.target.value)} className={`${input} mt-1`} disabled={!apps}>
              {!apps && <option>Loading your apps…</option>}
              {apps?.length === 0 && <option value="">No apps yet</option>}
              {apps?.map((a) => (
                <option key={a.id} value={a.id} disabled={a.status !== 'active'}>
                  {a.name} ({a.client_id}){a.status !== 'active' ? ' — deactivated' : ''}
                </option>
              ))}
            </select>
            {apps?.length === 0 && (
              <p className="mt-2 text-xs text-muted">
                <Link to="/app/my-apis" className="text-blue-600 underline">Register an app</Link> first.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={mint} disabled={!app || busy}>
                {busy ? 'Working…' : token ? 'Issue a new token' : 'Get sandbox token'}
              </Button>
              <Button secondary onClick={revoke} disabled={!app || busy || !state?.consent} title="Simulate the customer removing your app">
                Revoke consent
              </Button>
            </div>

            {appId && !state && !error && <div className="mt-4"><Skeleton rows={3} height="h-5" /></div>}
            {state && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <dt className="text-muted">Sandbox customer</dt>
                <dd><code>{state.customer_id}</code></dd>
                <dt className="text-muted">Accounts available</dt>
                <dd>{state.accounts.length}</dd>
                <dt className="text-muted">Consent</dt>
                <dd>
                  {state.consent ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">active · expires {new Date(state.consent.expires_at!).toLocaleDateString()}</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">none — issue a token to create one</span>
                  )}
                </dd>
                {app && (
                  <>
                    <dt className="text-muted">App scopes</dt>
                    <dd className="flex flex-wrap gap-1">{app.allowed_scopes.map((s) => <code key={s} className="rounded bg-indigo-50 px-1.5 text-indigo-700">{s}</code>)}</dd>
                  </>
                )}
              </dl>
            )}
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted">Access token</h3>
            {token ? (
              <>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-canvas px-3 py-2 text-xs">{showToken ? token.access_token : tokenPreview}</code>
                  <Button secondary size="sm" onClick={() => setShowToken((v) => !v)} className="shrink-0">{showToken ? 'Hide' : 'Show'}</Button>
                  <Button secondary size="sm" onClick={() => copy(token.access_token, 'Token')} className="shrink-0">Copy</Button>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <dt className="text-muted">type</dt><dd>{token.token_type}</dd>
                  <dt className="text-muted">expires_in</dt><dd>{token.expires_in}s</dd>
                  <dt className="text-muted">consent_id</dt><dd className="truncate" title={token.consent_id}>{token.consent_id.slice(0, 8)}…</dd>
                  <dt className="text-muted">scope</dt><dd className="truncate" title={token.scope}>{token.scope}</dd>
                </dl>
                <p className="mt-3 text-xs leading-5 text-muted">
                  A JWT signed by the bank. It carries <em>who</em> (customer), <em>which app</em>, <em>which consent</em> and <em>what scopes</em> —
                  and the gateway re-checks that consent on every call, so revoking it kills this token immediately.
                </p>
              </>
            ) : (
              <p className="mt-1 rounded-lg border border-dashed border-line p-4 text-xs text-muted">
                No token yet. Click <strong>Get sandbox token</strong>.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 2 — request                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <section className={`${panel} p-5`} aria-labelledby="request-title">
          <h2 id="request-title" className="text-sm font-semibold">2. Build a request</h2>

          <label htmlFor="sandbox-endpoint" className="mt-4 block text-xs font-medium text-muted">Endpoint</label>
          <select
            id="sandbox-endpoint"
            value={endpointId}
            onChange={(e) => { setEndpointId(e.target.value); setResponse(null) }}
            className={`${input} mt-1`}
          >
            {SANDBOX_ENDPOINTS.map((e) => (
              <option key={e.id} value={e.id}>{e.api} — {e.title}</option>
            ))}
          </select>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="rounded bg-tint px-2 py-1 font-semibold text-primary">{endpoint.method}</span>
            <code className="truncate">{endpoint.path}</code>
            <span className="ml-auto shrink-0 text-muted">needs <code>{endpoint.scope}</code></span>
          </div>
          {!hasScope && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This app&apos;s token does not include <code>{endpoint.scope}</code> — expect <code>403 insufficient_scope</code>. Useful to see!
            </p>
          )}

          {endpoint.params.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {endpoint.params.map((p) => (
                <div key={p.name} className={p.input === 'account' ? 'sm:col-span-2' : ''}>
                  <label htmlFor={`param-${p.name}`} className="block text-xs font-medium text-muted">
                    {p.name} <span className="font-normal text-faint">({p.kind}{p.required ? ', required' : ''})</span>
                  </label>
                  {p.input === 'account' ? (
                    <select id={`param-${p.name}`} value={values[p.name] ?? ''} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} className={`${input} mt-1`}>
                      <option value="">— choose an account —</option>
                      {state?.accounts.map((a) => (
                        <option key={a.account_id} value={a.account_id}>{a.account_id} · {a.account_type} · {a.currency}{a.status !== 'active' ? ` · ${a.status}` : ''}</option>
                      ))}
                      <option value="acct-demo-002">acct-demo-002 · not consented (expect 404)</option>
                    </select>
                  ) : p.input === 'select' ? (
                    <select id={`param-${p.name}`} value={values[p.name] ?? ''} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} className={`${input} mt-1`}>
                      {p.options?.map((o) => <option key={o} value={o}>{o || '(default)'}</option>)}
                    </select>
                  ) : (
                    <input id={`param-${p.name}`} type={p.input === 'number' ? 'number' : 'text'} value={values[p.name] ?? ''} placeholder={p.placeholder} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} className={`${input} mt-1`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <h3 className="mt-5 text-xs font-medium text-muted">Request</h3>
          <div className="relative mt-1">
            <Code wrap>{curlFor(url, token ? (showToken ? token.access_token : '<token>') : '<token>')}</Code>
            {token && (
              <button type="button" onClick={() => copy(curlFor(url, token.access_token), 'curl command')} className="absolute right-2 top-2 rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20">
                Copy
              </button>
            )}
          </div>

          <Button onClick={run} disabled={!token || sending || missingRequired} full className="mt-4">
            {sending ? 'Sending…' : !token ? 'Get a token first' : missingRequired ? 'Fill the required parameters' : 'Send request'}
          </Button>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Step 3 — response                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className={`${panel} p-5`} aria-labelledby="response-title" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="response-title" className="text-sm font-semibold">3. Response</h2>
            {response && (
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-semibold ${statusTone(response.status)}`}>{response.status} {response.statusText}</span>
                <span className="text-muted">{response.ms} ms</span>
                {response.headers['ratelimit'] && <span className="rounded bg-canvas px-2 py-1 text-body" title="RateLimit header">{response.headers['ratelimit']}</span>}
              </div>
            )}
          </div>

          {response ? (
            <>
              <div role="tablist" className="mt-4 flex gap-1 border-b border-canvas text-xs">
                {(['body', 'headers'] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={responseTab === t} onClick={() => setResponseTab(t)} className={`-mb-px cursor-pointer border-b-2 px-3 py-2 capitalize ${responseTab === t ? 'border-primary font-medium text-ink' : 'border-transparent text-muted'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                {responseTab === 'body' ? (
                  <Code>{typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}</Code>
                ) : (
                  <Code>{Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}</Code>
                )}
              </div>
              {response.status === 403 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  A 403 means the token is valid but the <strong>permission</strong> isn&apos;t: the consent was revoked or expired, the app was deactivated, or the scope is missing. Your app should send the customer back through the consent flow.
                </p>
              )}
              {response.status === 404 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  404 rather than 403 for an account the customer didn&apos;t share — so nobody can probe which account IDs exist.
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-line p-6 text-center text-xs text-muted">
              Responses appear here, with status, latency, rate-limit headers and the JSON body.
            </p>
          )}

          {history.length > 0 && (
            <>
              <h3 className="mt-6 text-xs font-medium text-muted">This session</h3>
              <ul className="mt-2 divide-y divide-canvas text-xs">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 py-2">
                    <span className={`w-10 rounded px-1.5 py-0.5 text-center font-semibold ${statusTone(h.status)}`}>{h.status}</span>
                    <span className="font-semibold text-body">{h.method}</span>
                    <code className="min-w-0 flex-1 truncate">{h.path}</code>
                    <span className="text-muted">{h.ms} ms</span>
                    <span className="text-faint">{h.at}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
