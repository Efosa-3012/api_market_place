import type { PortalTab } from './model'
import { endpoints } from './model'
import { Button, CodeBlock, Notice } from './ui'
export default function Documentation({
  onTab,
}: {
  onTab: (tab: PortalTab) => void
}) {
  return (
    <div className="space-y-5">
      <Notice>
        Find guidance on authentication, endpoints, and integration.
      </Notice>
      <details className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Quick start guide <span className="float-right">→</span>
          <span className="mt-1 block text-xs font-normal text-slate-600">
            Get up and running in 4 simple steps
          </span>
        </summary>
        <ol className="mt-4 list-inside list-decimal space-y-3 text-sm text-slate-600">
          <li>Create a sandbox key.</li>
          <li>Choose an endpoint in API Explorer.</li>
          <li>Enter test data and send a request.</li>
          <li>Inspect its response in Logs.</li>
        </ol>
      </details>
      <details open className="rounded-xl border border-[#e1e8f2] bg-white">
        <summary className="cursor-pointer p-6 text-base font-semibold">
          Authentication
          <span className="mt-2 block text-sm font-normal text-slate-500">
            How to authenticate requests to the API Marketplace.
          </span>
        </summary>
        <div className="space-y-5 border-t border-slate-100 p-6">
          <p className="text-sm leading-6 text-slate-600">
            Include an access token in the Authorization header. Follow the authentication requirements for your selected API.
          </p>
          <CodeBlock
            title="HTTP Header"
            text="Authorization: Bearer YOUR_ACCESS_TOKEN"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-xs leading-6">
              <strong>Key points</strong>
              <ul className="mt-2 list-inside list-disc">
                <li>Use separate credentials per environment.</li>
                <li>Keep secrets on your backend.</li>
                <li>Follow the documented token expiry rules.</li>
                <li>Logs redact authorization credentials.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-xs leading-6">
              <strong>Tip</strong>
              <p className="mt-2">
                Keep API credentials confidential. Do not expose them in client-side code.
              </p>
              <button
                onClick={() => onTab('keys')}
                className="mt-3 text-blue-600"
              >
                Manage API keys →
              </button>
            </div>
          </div>
        </div>
      </details>
      <details className="rounded-xl border border-[#e1e8f2] bg-white p-6">
        <summary className="cursor-pointer font-semibold">
          Endpoints
          <span className="mt-2 block text-sm font-normal text-slate-500">
            Browse APIs and common operations.
          </span>
        </summary>
        <div className="mt-5 space-y-3">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="rounded-lg border border-slate-100 p-3"
            >
              <strong className="text-sm">{endpoint.title}</strong>
              <code className="mt-1 block break-all text-xs text-blue-600">
                {endpoint.method} {endpoint.path}
              </code>
            </div>
          ))}
          <Button onClick={() => onTab('explorer')}>Open API Explorer →</Button>
        </div>
      </details>
      <details className="rounded-xl border border-[#e1e8f2] bg-white p-6">
        <summary className="cursor-pointer font-semibold">
          Error Codes
          <span className="mt-2 block text-sm font-normal text-slate-500">
            Common HTTP responses and what they mean.
          </span>
        </summary>
        <dl className="mt-4 grid grid-cols-[60px_1fr] gap-3 text-sm text-slate-600">
          {Object.entries({
            '200': 'Request succeeded',
            '201': 'Resource created',
            '401': 'Authentication required or invalid',
            '403': 'Access not permitted',
            '422': 'Request validation failed',
            '429': 'Rate limit reached',
            '500': 'Server error',
          }).map(([code, description]) => (
            <div key={code} className="contents">
              <dt className="font-mono text-blue-600">{code}</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </details>
      <details className="rounded-xl border border-[#e1e8f2] bg-white p-6">
        <summary className="cursor-pointer font-semibold">
          SDKs & Libraries
          <span className="mt-2 block text-sm font-normal text-slate-500">
            Example requests in popular programming languages.
          </span>
        </summary>
        <p className="my-4 text-sm leading-6 text-slate-600">
          The Explorer includes cURL, JavaScript, Python, Java, and PHP
          examples. These use generic HTTP clients; no official SDK is assumed.
        </p>
        <Button secondary onClick={() => onTab('explorer')}>
          View code examples →
        </Button>
      </details>
      <details className="rounded-xl border border-[#e1e8f2] bg-white p-6">
        <summary className="cursor-pointer font-semibold">
          Webhook verification
          <span className="mt-2 block text-sm font-normal text-slate-500">
            Receive and verify event notifications.
          </span>
        </summary>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Configure an HTTPS callback and select events. In production, verify
          the request signature against the original request bytes using the
          documented algorithm and signing secret. Follow the documented header format and replay-protection requirements.
        </p>
      </details>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-6">
        <div>
          <strong className="text-sm">Ready to test an endpoint?</strong>
          <p className="mt-2 text-xs text-slate-600">
            Use the API Explorer to test a sandbox request.
          </p>
        </div>
        <Button onClick={() => onTab('explorer')}>Open API Explorer →</Button>
      </div>
    </div>
  )
}
