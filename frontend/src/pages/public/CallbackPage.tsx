import { Link, useSearchParams } from 'react-router-dom'

/**
 * Where the bank sends the customer back after the consent screen. In a real
 * fintech app this page would POST the code to the app's own backend, which
 * exchanges it for a token at /oauth/token using the client secret.
 *
 * Here it just shows what arrived, so the hand-off is visible during the demo.
 */
export default function CallbackPage() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const description = params.get('error_description')

  return (
    <div className="mx-auto max-w-xl px-4 py-16 font-[Arial,Helvetica,sans-serif] text-[#151c2d]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#58708f]">Sample fintech app · /callback</p>

      {code ? (
        <>
          <h1 className="mt-2 text-2xl font-semibold">The customer approved ✓</h1>
          <p className="mt-3 text-sm leading-6 text-[#58708f]">
            The bank redirected the customer back here with a <strong>single-use authorization code</strong>.
            The app&apos;s backend now exchanges it for an access token at <code>POST /oauth/token</code>,
            authenticating with its client ID and secret. The code expires in 5 minutes and works exactly once.
          </p>
          <dl className="mt-6 space-y-3 rounded-xl border border-[#e3e9f2] bg-white p-5 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-[#58708f]">code</dt>
              <dd className="mt-1 break-all rounded bg-[#f7f8fa] px-3 py-2 font-mono text-xs">{code}</dd>
            </div>
            {state && (
              <div>
                <dt className="text-xs font-medium uppercase text-[#58708f]">state (echoed back, app checks it matches)</dt>
                <dd className="mt-1 break-all rounded bg-[#f7f8fa] px-3 py-2 font-mono text-xs">{state}</dd>
              </div>
            )}
          </dl>
          <p className="mt-6 rounded-md bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
            To finish the exchange by hand: <code>POST /oauth/token</code> with <code>grant_type=authorization_code</code>,
            this code, and the same <code>redirect_uri</code>, using Basic auth <code>client_id:client_secret</code>.
            The Postman collection and <code>/docs</code> both have it ready.
          </p>
        </>
      ) : error ? (
        <>
          <h1 className="mt-2 text-2xl font-semibold">The customer declined</h1>
          <p className="mt-3 text-sm leading-6 text-[#58708f]">
            The bank sent the app <code>error={error}</code>{description ? ` — “${description}”` : ''}. No code was issued and no data will be shared.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-semibold">Nothing here yet</h1>
          <p className="mt-3 text-sm text-[#58708f]">This page expects <code>?code=</code> or <code>?error=</code> from the bank.</p>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link to="/bank/connected-apps" className="text-[#0b2858] underline">Customer view: Connected Apps</Link>
        <Link to="/app/sandbox" className="text-[#0450ff] underline">Developer view: Sandbox</Link>
      </div>
    </div>
  )
}
