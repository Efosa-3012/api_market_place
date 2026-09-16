import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findApiDetails } from '../../components/marketplace/apiDetails'
import type { ApiDetails } from '../../components/marketplace/apiDetails'
const primary =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0450ff] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
const secondary =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-[#dfe6f2] bg-white px-4 py-2.5 text-xs font-semibold text-[#34445e] hover:bg-blue-50'
const panel = 'rounded-xl border border-[#dfe6f2] bg-white p-5 sm:p-8'
const sandbox = '/app/sandbox'
const docs = '/app/developer-portal?tab=documentation&env=sandbox'
export default function ApiDetailsPage() {
  const { id } = useParams()
  const api = findApiDetails(id)
  if (!api)
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-[#f7f8fb] p-6 sm:p-9">
        <h1 className="text-2xl font-semibold">API not found</h1>
        <p className="my-4 text-sm text-[#58708f]">
          This API is not available in the current catalog.
        </p>
        <Link className={primary} to="/app/marketplace">
          Back to Marketplace
        </Link>
      </div>
    )
  return <ApiDetailContent key={api.id} api={api} />
}
function ApiDetailContent({ api }: { api: ApiDetails }) {
  const [copied, setCopied] = useState(''),
    [accessOpen, setAccessOpen] = useState(false),
    [requested, setRequested] = useState(false),
    [environment, setEnvironment] = useState('Sandbox'),
    [purpose, setPurpose] = useState(''),
    [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestText = `${api.method} ${api.path}${api.request ? '\nContent-Type: application/json\n\n' + JSON.stringify(api.request, null, 2) : ''}`
  useEffect(() => {
    if (!accessOpen) return
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [accessOpen])
  async function copy() {
    try {
      await navigator.clipboard.writeText(requestText)
      setCopied('Copied sample request.')
    } catch {
      setCopied('Copy unavailable. Select the sample text to copy it manually.')
    }
  }
  return (
    <div className="min-h-[calc(100dvh-4rem)] min-w-0 bg-[#f7f8fb] p-4 text-[#132238] sm:p-6 xl:p-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap gap-3 text-xs text-[#465b78]"
      >
        <Link to="/app/marketplace" className="hover:text-blue-600">
          ‹ Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        <span>APIs</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-[#132238]">
          {api.name}
        </span>
      </nav>
      <header className="mb-4 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">{api.name}</h1>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#465b78]">
              {api.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={requested}
              onClick={() => {
                setError('')
                setAccessOpen(true)
              }}
              className={`${primary} disabled:cursor-default disabled:bg-blue-100 disabled:text-blue-700`}
            >
              {requested ? 'Access Requested' : 'Get API Access'}
            </button>
            <Link to={sandbox} className={secondary}>
              Try in Sandbox
            </Link>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="rounded bg-slate-100 px-2 py-1">
              {api.category}
            </span>
            <span>·</span>
            <span className="rounded bg-slate-100 px-2 py-1">OAuth 2.0</span>
          </div>
          <Link to={docs} className={secondary}>
            ↗ View docs
          </Link>
        </div>
      </header>
      {requested && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800"
        >
          Your {environment.toLowerCase()} access request was recorded in this
          preview. No access has been granted or request sent to the server.
        </p>
      )}
      <section className={panel}>
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-2 text-sm leading-6 text-[#34445e]">{api.overview}</p>
        <h3 className="mb-3 mt-7 text-sm font-semibold">Built for</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {api.useCases.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-[#e5ebf5] bg-[#f8faff] p-4"
            >
              <h4 className="text-xs font-semibold text-[#003477]">
                {item.title}
              </h4>
              <p className="mt-1 text-xs leading-5 text-[#657790]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
        <h3 className="mb-3 mt-7 text-sm font-semibold">What you can do</h3>
        <ul className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
          {api.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span aria-hidden="true" className="font-bold text-blue-600">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </section>
      <section className={`${panel} mt-4`}>
        <h2 className="text-lg font-semibold">Quick Start</h2>
        <h3 className="mt-5 text-sm font-semibold">
          Make your first {api.category === 'Payments' ? 'transfer ' : ''}
          request
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#465b78]">
          Test the {api.name} in the Sandbox environment before going live.
        </p>
        <h4 className="mb-2 mt-6 text-sm font-semibold">Sample Request</h4>
        <div className="overflow-hidden rounded-lg border border-[#dfe6f2]">
          <div className="flex items-center justify-between border-b border-[#dfe6f2] bg-[#f8faff] px-3">
            <span className="border-b-2 border-blue-600 px-3 py-3 text-xs font-semibold">
              {api.request ? 'JSON' : 'HTTP'}
            </span>
            <button
              onClick={() => void copy()}
              className="rounded p-2 text-xs text-[#465b78]"
              aria-label="Copy sample request"
            >
              {copied === 'Copied sample request.' ? 'Copied ✓' : 'Copy ▢'}
            </button>
          </div>
          <pre
            tabIndex={0}
            aria-label="Sample API request"
            className="m-4 overflow-x-auto rounded-lg bg-[#f8f8fa] p-4 text-xs leading-6 text-[#34445e]"
          >
            <code>{requestText}</code>
          </pre>
        </div>
        {copied && (
          <p role="status" className="mt-2 text-xs text-blue-600">
            {copied}
          </p>
        )}
        <div className="mt-4 flex flex-col items-start gap-3 text-xs text-blue-600">
          <Link to={sandbox} className="hover:underline">
            Open Sandbox →
          </Link>
          <Link to={docs} className="hover:underline">
            View full documentation →
          </Link>
        </div>
      </section>
      <section className="mt-7">
        <h2 className="mb-4 text-base font-semibold">Pricing</h2>
        <div className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-semibold">
                {api.paid ? 'Pay as you use' : 'Free'}
              </h3>
              <p className="mt-1 text-sm text-[#465b78]">
                {api.paid
                  ? 'No monthly subscription. Pay only for your API usage.'
                  : 'Explore this API without usage charges in this preview.'}
              </p>
            </div>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
              {api.paid ? 'Pay as you use' : 'Free'}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 text-xs">
            <div>
              <h4 className="font-semibold">Sandbox</h4>
              <p className="mt-1 text-sm text-[#465b78]">
                Test without charges
              </p>
            </div>
            <strong>Free</strong>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 text-xs">
            <div>
              <h4 className="font-semibold">Production</h4>
              <p className="mt-1 text-sm text-[#465b78]">
                {api.paid
                  ? 'Rate per 1,000 calls to be confirmed'
                  : 'No usage charges in this preview'}
              </p>
            </div>
            <strong>{api.paid ? 'Pay-per-call' : 'Free'}</strong>
          </div>
        </div>
      </section>
      <section className="mt-7">
        <h2 className="mb-4 text-base font-semibold">API Information</h2>
        <dl className="divide-y divide-slate-200 rounded-xl bg-[#f7f7f8] px-5">
          {[
            ['Category', api.category],
            ['Version', 'v1.0'],
            ['Response Format', 'JSON'],
            ['Authentication', 'OAuth 2.0'],
            ['Environment', 'Sandbox & Production'],
          ].map(([label, value]) => (
            <div key={label} className="py-5 text-sm">
              <dt className="text-xs text-[#526783]">{label}</dt>
              <dd className="mt-2 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {accessOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="access-title"
          onCancel={(e) => {
            e.preventDefault()
            setAccessOpen(false)
          }}
          className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-2xl bg-white p-6 text-[#132238] shadow-xl backdrop:bg-black/40"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="access-title" className="text-lg font-semibold">
              Request API access
            </h2>
            <button
              onClick={() => setAccessOpen(false)}
              aria-label="Close access request"
              className="rounded p-2"
            >
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-[#526783]">{api.name}</p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!purpose.trim()) {
                setError('Describe how you plan to use this API.')
                return
              }
              setRequested(true)
              setAccessOpen(false)
            }}
          >
            <label className="block text-xs font-medium">
              Environment
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <option>Sandbox</option>
                <option>Production</option>
              </select>
            </label>
            <label className="block text-xs font-medium">
              How will you use this API?
              <textarea
                required
                rows={4}
                maxLength={1000}
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value)
                  setError('')
                }}
                className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"
              />
            </label>
            <p className="text-xs leading-5 text-[#657790]">
              This preview records your request locally. Production access will
              require backend approval.
            </p>
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAccessOpen(false)}
                className={secondary}
              >
                Cancel
              </button>
              <button type="submit" className={primary}>
                Request Access
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  )
}
