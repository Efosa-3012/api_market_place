import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ApiKey, Environment, Json, PortalTab, RequestLog } from './model'
import {
  codeExample,
  dateTime,
  endpoints,
  parseObject,
  simulate,
} from './model'
import { Badge, Button, CodeBlock, Field, Notice, Panel } from './ui'

export default function Explorer({
  environment,
  keys,
  replay,
  onLog,
  onTab,
}: {
  environment: Environment
  keys: ApiKey[]
  replay: RequestLog | null
  onLog: (log: RequestLog) => void
  onTab: (tab: PortalTab) => void
}) {
  const initial =
    endpoints.find((item) => item.id === replay?.endpointId) ?? endpoints[0]
  const [endpointId, setEndpointId] = useState(initial.id)
  const [body, setBody] = useState(
    JSON.stringify(replay?.request ?? initial.defaults, null, 2),
  )
  const [headers, setHeaders] = useState(
    JSON.stringify(
      replay?.headers
        ? Object.fromEntries(
            Object.entries(replay.headers).filter(
              ([key]) => key.toLowerCase() !== 'authorization',
            ),
          )
        : { 'Content-Type': 'application/json' },
      null,
      2,
    ),
  )
  const [query, setQuery] = useState(
    JSON.stringify(replay?.query ?? {}, null, 2),
  )
  const [keyId, setKeyId] = useState('')
  const [requestTab, setRequestTab] = useState('Form')
  const [responseTab, setResponseTab] = useState('Body')
  const [language, setLanguage] = useState('cURL')
  const [response, setResponse] = useState<RequestLog | null>(null)
  const [error, setError] = useState('')
  const endpoint =
    endpoints.find((item) => item.id === endpointId) ?? endpoints[0]
  let values: Json = {}
  let syntaxError = ''
  try {
    values = parseObject(body)
  } catch {
    syntaxError = 'Request JSON must be a valid object.'
  }
  const availableKeys = keys.filter(
    (key) => key.environment === environment && key.status === 'Active',
  )
  const selectedKey =
    availableKeys.find((key) => key.id === keyId) ??
    (keyId ? undefined : availableKeys[0])
  let snippet =
    'Fix the JSON in the request, headers, or query parameters to generate an example.'
  try {
    if (!syntaxError)
      snippet = codeExample(
        language,
        endpoint,
        values,
        environment,
        parseObject(headers),
        parseObject(query),
      )
  } catch {
    /* Validation is shown when submitting. */
  }
  function choose(id: string) {
    const next = endpoints.find((item) => item.id === id)!
    setEndpointId(id)
    setBody(JSON.stringify(next.defaults, null, 2))
    setResponse(null)
    setError('')
  }
  function send() {
    try {
      if (environment === 'Production')
        throw new Error(
          'Production access is required to send requests.',
        )
      if (!selectedKey)
        throw new Error('Create or select an active sandbox key in API Keys.')
      const result = simulate(
        endpoint,
        parseObject(body),
        environment,
        parseObject(headers),
        parseObject(query),
        selectedKey.id,
      )
      setResponse(result)
      setError('')
      onLog(result)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to complete request.',
      )
    }
  }
  function reset() {
    setBody(JSON.stringify(endpoint.defaults, null, 2))
    setHeaders('{"Content-Type":"application/json"}')
    setQuery('{}')
    setResponse(null)
    setError('')
    setKeyId('')
  }
  const requestTabs = [
    'Form',
    'JSON',
    'Headers',
    'Query Parameters',
    'Authorization',
  ]
  return (
    <div className="space-y-6">
      <Notice>
        {environment === 'Sandbox'
          ? "You're in Sandbox. Use test data; no real transactions are processed."
          : 'Production requests are currently unavailable.'}
      </Notice>
      <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_.7fr]">
        <Field label="API">
          <select
            value={endpoint.api}
            onChange={(e) =>
              choose(endpoints.find((item) => item.api === e.target.value)!.id)
            }
          >
            {[...new Set(endpoints.map((item) => item.api))].map((api) => (
              <option key={api}>{api}</option>
            ))}
          </select>
        </Field>
        <Field label="Endpoint">
          <select value={endpoint.id} onChange={(e) => choose(e.target.value)}>
            {endpoints
              .filter((item) => item.api === endpoint.api)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Method">
          <input readOnly value={endpoint.method} />
        </Field>
      </div>
      <Link
        className="inline-block text-xs text-blue-600"
        to={`/app/marketplace/${endpoint.api === 'Accounts API' ? 'accounts-api' : endpoint.api === 'Balances API' ? 'balances-api' : endpoint.api === 'Transactions API' ? 'transactions-api' : 'consent-api'}`}
      >
        View API details →
      </Link>
      <div className="grid items-start gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Panel
          title="Request"
          action={
            <button
              onClick={() => onTab('documentation')}
              className="text-xs text-blue-600"
            >
              View API docs ↗
            </button>
          }
        >
          <div
            role="group"
            aria-label="Request editor view"
            className="mb-5 flex flex-wrap gap-5 border-b border-slate-100"
          >
            {requestTabs.map((tab) => (
              <button
                key={tab}
                aria-pressed={requestTab === tab}
                onClick={() => setRequestTab(tab)}
                className={`pb-3 text-xs ${requestTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {requestTab === 'Form' && (
            <div className="space-y-4">
              <Notice>
                Fill in the required fields for this endpoint.
              </Notice>
              {syntaxError ? (
                <p role="alert" className="text-sm text-red-600">
                  {syntaxError} Open JSON to correct it, or Reset.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.keys(endpoint.defaults).map((name) => (
                    <Field
                      key={name}
                      label={`${({ amount: 'Amount', currency: 'Currency', beneficiaryAccount: 'Beneficiary account', bankCode: 'Beneficiary bank', reference: 'Reference', narration: 'Narration', id: 'Transfer ID', accountNumber: 'Account number', identityNumber: 'Identity number' } as Record<string, string>)[name] ?? name}${name === 'narration' ? '' : ' *'}`}
                    >
                      {name === 'currency' || name === 'bankCode' ? (
                        <select
                          value={String(values[name] ?? '')}
                          onChange={(e) =>
                            setBody(
                              JSON.stringify(
                                { ...values, [name]: e.target.value },
                                null,
                                2,
                              ),
                            )
                          }
                        >
                          {(name === 'currency' ? ['NGN', 'USD'] : ['221']).map(
                            (value) => (
                              <option key={value} value={value}>
                                {name === 'bankCode'
                                  ? 'Stanbic IBTC'
                                  : value}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <input
                          value={String(values[name] ?? '')}
                          type={name === 'amount' ? 'number' : 'text'}
                          min={name === 'amount' ? '0.01' : undefined}
                          step={name === 'amount' ? '0.01' : undefined}
                          maxLength={name === 'narration' ? 100 : undefined}
                          onChange={(e) =>
                            setBody(
                              JSON.stringify(
                                {
                                  ...values,
                                  [name]:
                                    name === 'amount'
                                      ? e.target.value === ''
                                        ? ''
                                        : Number(e.target.value)
                                      : e.target.value,
                                },
                                null,
                                2,
                              ),
                            )
                          }
                        />
                      )}
                    </Field>
                  ))}
                </div>
              )}
            </div>
          )}
          {['JSON', 'Headers', 'Query Parameters'].includes(requestTab) && (
            <Field label={requestTab}>
              <textarea
                spellCheck={false}
                rows={12}
                className="font-mono text-xs"
                value={
                  requestTab === 'JSON'
                    ? body
                    : requestTab === 'Headers'
                      ? headers
                      : query
                }
                onChange={(e) =>
                  (requestTab === 'JSON'
                    ? setBody
                    : requestTab === 'Headers'
                      ? setHeaders
                      : setQuery)(e.target.value)
                }
              />
            </Field>
          )}
          {requestTab === 'Authorization' && (
            <div className="space-y-4">
              <Field label="API key">
                <select
                  value={selectedKey?.id ?? ''}
                  onChange={(e) => setKeyId(e.target.value)}
                >
                  <option value="" disabled>
                    Select an active key
                  </option>
                  {availableKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Notice>
                Select a key from API Keys. Credentials are redacted from logs
                and code examples.
              </Notice>
              <Button secondary onClick={() => onTab('keys')}>
                Manage API keys →
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Button onClick={send} disabled={environment === 'Production'}>
              ▸ Send Request
            </Button>
            <Button secondary onClick={reset}>
              Reset
            </Button>
          </div>
        </Panel>
        <div className="min-w-0 space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-xs leading-6">
            <strong>Tip</strong>
            <p>
              Replace YOUR_ACCESS_TOKEN in your server-side integration. Manage
              your credentials in API Keys.
            </p>
            <button className="text-blue-600" onClick={() => onTab('keys')}>
              API Keys section →
            </button>
          </div>
          <Panel
            title="Response"
            subtitle={
              response && response.environment === environment
                ? `${response.latency}  ms · ${dateTime(response.time)}`
                : 'Send a request to inspect its response.'
            }
            action={
              response && response.environment === environment ? (
                <Badge bad={response.status >= 400}>
                  {response.status}{' '}
                  {response.status < 400 ? 'Success' : 'Error'}
                </Badge>
              ) : null
            }
          >
            {response && response.environment === environment ? (
              <>
                <div className="mb-3 flex gap-5">
                  {['Body', 'Headers'].map((tab) => (
                    <button
                      key={tab}
                      aria-pressed={responseTab === tab}
                      onClick={() => setResponseTab(tab)}
                      className={`pb-2 text-xs ${tab === responseTab ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <CodeBlock
                  title={responseTab}
                  text={JSON.stringify(
                    responseTab === 'Body'
                      ? response.response
                      : {
                          'Content-Type': 'application/json',
                          'X-Request-ID': response.id,
                        },
                    null,
                    2,
                  )}
                />
              </>
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">
                No response yet
              </p>
            )}
          </Panel>
        </div>
        <Panel
          title="Try another endpoint"
          subtitle="Switch endpoints to test different use cases within this API."
        >
          <div className="space-y-3">
            {endpoints
              .filter((item) => item.api === endpoint.api)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => choose(item.id)}
                  className={`w-full rounded-lg border p-3 text-left ${item.id === endpoint.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                >
                  <strong className="block text-xs">{item.title}</strong>
                  <span className="mt-2 block font-mono text-[11px] text-slate-500">
                    {item.method} {item.path}
                  </span>
                </button>
              ))}
            <Button secondary onClick={() => onTab('documentation')}>
              View all endpoints →
            </Button>
          </div>
        </Panel>
        <Panel
          title="Code examples"
          subtitle="Code examples for the selected endpoint."
        >
          <div className="mb-3 flex flex-wrap gap-3">
            {['cURL', 'JavaScript', 'Python', 'Java', 'PHP'].map((item) => (
              <button
                key={item}
                aria-pressed={language === item}
                onClick={() => setLanguage(item)}
                className={`rounded px-2 py-1 text-xs ${language === item ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <CodeBlock title={language} text={snippet} />
        </Panel>
      </div>
    </div>
  )
}
