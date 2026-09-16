import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Explorer from '../../components/portal/Explorer'
import Keys from '../../components/portal/Keys'
import Documentation from '../../components/portal/Documentation'
import Webhooks from '../../components/portal/Webhooks'
import Logs from '../../components/portal/Logs'
import { Button, Field, Modal, Notice, Panel } from '../../components/portal/ui'
import {
  createInitialKeys,
  createInitialLogs,
  dateTime,
  endpoints,
  secret,
  simulate,
  tabs,
  uid,
} from '../../components/portal/model'
import type {
  ApiKey,
  Delivery,
  Environment,
  PortalTab,
  RequestLog,
  WebhookConfig,
} from '../../components/portal/model'

export default function DeveloperPortalPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: PortalTab = tabs.some((item) => item.id === params.get('tab'))
    ? (params.get('tab') as PortalTab)
    : 'overview'
  const environment: Environment =
    params.get('env') === 'production' ? 'Production' : 'Sandbox'
  const [keys, setKeys] = useState<ApiKey[]>(createInitialKeys)
  const [logs, setLogs] = useState<RequestLog[]>(createInitialLogs)
  const [replay, setReplay] = useState<RequestLog | null>(null)
  const [infoVisible, setInfoVisible] = useState(true)
  const [notice, setNotice] = useState('')
  const [createEnvironment, setCreateEnvironment] =
    useState<Environment | null>(null)
  const [keyName, setKeyName] = useState('')
  const [configs, setConfigs] = useState<Record<Environment, WebhookConfig>>({
    Sandbox: {
      url: 'https://api.example.invalid/webhooks/stanbic',
      events: ['transfer.completed', 'transfer.pending', 'kyc.verified'],
    },
    Production: { url: '', events: [] },
  })
  const [deliveries, setDeliveries] = useState<Record<Environment, Delivery[]>>(
    { Sandbox: [], Production: [] },
  )
  function go(next: PortalTab) {
    setParams((current) => {
      const nextParams = new URLSearchParams(current)
      nextParams.set('tab', next)
      return nextParams
    })
  }
  function setEnvironment(next: Environment) {
    setParams((current) => {
      const nextParams = new URLSearchParams(current)
      nextParams.set('env', next.toLowerCase())
      return nextParams
    })
    setNotice('')
  }
  function record(log: RequestLog) {
    setLogs((current) => [log, ...current])
    if (log.keyId)
      setKeys((current) =>
        current.map((key) =>
          key.id === log.keyId ? { ...key, lastUsed: log.time } : key,
        ),
      )
  }
  function createKey() {
    if (!keyName.trim() || !createEnvironment) return
    const key: ApiKey = {
      id: uid(),
      name: keyName.trim(),
      environment: createEnvironment,
      secret: secret(createEnvironment),
      status: createEnvironment === 'Sandbox' ? 'Active' : 'Pending',
      created: new Date().toISOString(),
      lastUsed: null,
    }
    setKeys((current) => [...current, key])
    setNotice(
      `${key.name} created${key.status === 'Pending' ? ' — production approval pending' : ''}.`,
    )
    setKeyName('')
    setCreateEnvironment(null)
    go('keys')
  }
  function changeKey(id: string, action: 'rotate' | 'revoke') {
    const existing = keys.find((key) => key.id === id)
    if (!existing) return
    const nextSecret =
      action === 'rotate' ? secret(existing.environment) : existing.secret
    setKeys((current) =>
      current.map((key) =>
        key.id === id
          ? {
              ...key,
              secret: nextSecret,
              status: action === 'revoke' ? 'Revoked' : key.status,
            }
          : key,
      ),
    )
  }
  function openCreate(env: Environment) {
    setKeyName('')
    setCreateEnvironment(env)
  }
  function openReplay(log: RequestLog) {
    setReplay({ ...log, id: `${log.id}-${uid()}` })
    go('explorer')
  }
  function retry(log: RequestLog) {
    const endpoint = endpoints.find((item) => item.id === log.endpointId)
    const key = keys.find(
      (item) => item.environment === 'Sandbox' && item.status === 'Active',
    )
    if (environment === 'Production' || !endpoint) return false
    if (!key) {
      setNotice('Create an active sandbox key before retrying.')
      return false
    }
    record(
      simulate(
        endpoint,
        log.request,
        'Sandbox',
        log.headers,
        log.query,
        key.id,
      ),
    )
    return true
  }
  function testWebhook() {
    if (environment === 'Production') return
    const config = configs[environment]
    if (!config.url || !config.events.length) return
    const event = config.events[0]
    const delivery: Delivery = {
      id: uid(),
      event,
      time: new Date().toISOString(),
      status: 200,
      url: config.url,
    }
    setDeliveries((current) => ({
      ...current,
      [environment]: [delivery, ...current[environment]],
    }))
    record({
      id: `webhook_${delivery.id.slice(0, 8)}`,
      environment,
      endpointId: 'webhook',
      api: 'Webhooks',
      method: 'POST',
      path: config.url,
      status: 200,
      latency: 96,
      time: delivery.time,
      request: { event, deliveryId: delivery.id },
      response: { received: true, simulated: true },
      headers: { 'Content-Type': 'application/json' },
      query: {},
      keyId: null,
      added: true,
    })
  }
  const activeKeys = keys.filter((key) => key.status === 'Active')
  const newRequests = logs.filter((log) => log.added && log.api !== 'Webhooks')
  const sandboxCalls =
    4110 + newRequests.filter((log) => log.environment === 'Sandbox').length
  const productionCalls =
    14094 + newRequests.filter((log) => log.environment === 'Production').length
  const total = sandboxCalls + productionCalls
  const current = tabs.find((item) => item.id === tab)!
  return (
    <div className="min-h-[calc(100dvh-64px)] bg-[#f7f9fc] p-4 text-[#142033] sm:p-6 lg:p-8 [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-blue-600 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-blue-600 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-blue-500 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-blue-500 [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-blue-500">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10243a]">
              {tab === 'overview' ? 'Developer Portal' : current.title}
            </h1>
            <p className="mt-2 text-sm text-[#465b78]">{current.description}</p>
          </div>
          <div
            role="group"
            aria-label="Environment"
            className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"
          >
            {(['Sandbox', 'Production'] as const).map((env) => (
              <button
                key={env}
                aria-pressed={environment === env}
                onClick={() => setEnvironment(env)}
                className={`rounded px-4 py-2 text-xs ${environment === env ? 'bg-white text-black shadow-sm' : 'text-slate-600'}`}
              >
                {env === 'Production' && (
                  <span aria-hidden="true" className="mr-1 text-amber-500">
                    ●
                  </span>
                )}
                {env}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e8f2] bg-white px-2">
          <nav
            aria-label="Developer portal sections"
            className="flex max-w-full overflow-x-auto"
          >
            {tabs.map((item) => (
              <Link
                key={item.id}
                // Credentials, the try-it console and request history live on their
                // real pages; the simulator tabs here are documentation-only.
                to={
                  item.id === 'keys'
                    ? '/app/my-apis'
                    : item.id === 'explorer' || item.id === 'logs'
                      ? '/app/sandbox'
                      : `?tab=${item.id}&env=${environment.toLowerCase()}`
                }
                aria-current={tab === item.id ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-4 py-4 text-sm ${tab === item.id ? 'border-[#0450ff] font-medium text-[#142033]' : 'border-transparent text-[#465b78]'}`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2 py-2">
            {['overview', 'explorer'].includes(tab) ? (
              <>
                <Button
                  secondary
                  onClick={() => {
                    setReplay(null)
                    go('explorer')
                  }}
                >
                  ▷ Run Quick Test
                </Button>
                <Button onClick={() => navigate('/app/my-apis')}>
                  ＋ Register app
                </Button>
              </>
            ) : (
              <Button secondary onClick={() => go('logs')}>
                View key usage →
              </Button>
            )}
          </div>
        </div>
        {notice && (
          <p
            role="status"
            className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700"
          >
            {notice}
          </p>
        )}
        <div hidden={tab !== 'overview'}>
          <div className="space-y-6">
            {infoVisible && (
              <Notice>
                <div className="flex items-center justify-between gap-4">
                  <p>
                    Overview totals cover both environments. Account and billing
                    details live on your{' '}
                    <Link className="text-blue-600" to="/app/dashboard">
                      Dashboard
                    </Link>
                    .{' '}
                    <span className="text-slate-500">
                      Integration activity
                    </span>
                  </p>
                  <button
                    aria-label="Dismiss overview information"
                    onClick={() => setInfoVisible(false)}
                  >
                    ✕
                  </button>
                </div>
              </Notice>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: 'API calls today',
                  value: total.toLocaleString(),
                  detail: '↑ 12% vs yesterday',
                },
                {
                  title: 'Active keys',
                  value: String(activeKeys.length),
                  detail: `${activeKeys.filter((key) => key.environment === 'Production').length} production · ${activeKeys.filter((key) => key.environment === 'Sandbox').length} sandbox`,
                },
                {
                  title: 'Sandbox calls (24h)',
                  value: sandboxCalls.toLocaleString(),
                  detail: `of ${total.toLocaleString()} total (${((sandboxCalls / total) * 100).toFixed(1)}%)`,
                },
                {
                  title: 'Production calls (24h)',
                  value: productionCalls.toLocaleString(),
                  detail: `of ${total.toLocaleString()} total (${((productionCalls / total) * 100).toFixed(1)}%)`,
                },
              ].map((card, i) => (
                <div
                  key={card.title}
                  className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${i === 0 ? 'border-b-4 border-b-blue-200' : ''}`}
                >
                  <p className="text-xs text-slate-600">{card.title}</p>
                  <p
                    className={`mt-3 text-3xl font-semibold ${i === 0 ? 'text-[#1010ff]' : ''}`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">{card.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel
                title="Recent requests"
                subtitle={`Latest calls in ${environment.toLowerCase()}`}
              >
                <div className="divide-y divide-slate-100">
                  {logs
                    .filter((log) => log.environment === environment)
                    .slice(0, 5)
                    .map((log) => (
                      <button
                        key={log.id}
                        onClick={() => go('logs')}
                        className="flex w-full items-center justify-between gap-3 py-4 text-left text-xs"
                      >
                        <span className="min-w-0 break-all">
                          <span
                            aria-hidden="true"
                            className={
                              log.status >= 400
                                ? 'mr-2 text-red-500'
                                : 'mr-2 text-emerald-500'
                            }
                          >
                            ●
                          </span>
                          {log.method} {log.path} returned {log.status}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {dateTime(log.time)}
                        </span>
                      </button>
                    ))}
                </div>
              </Panel>
              <Panel
                title="Resources"
                subtitle="Quick links to help you build."
              >
                <div className="divide-y divide-slate-100">
                  {(
                    [
                      { label: 'Open the sandbox', tab: 'explorer' },
                      { label: 'Apps & credentials', tab: 'keys' },
                      { label: 'Read the documentation', tab: 'documentation' },
                      { label: 'Webhook endpoints', tab: 'webhooks' },
                    ] as { label: string; tab: PortalTab }[]
                  ).map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => {
                        if (item.tab === 'explorer') {
                          setParams({ tab: 'explorer', env: 'sandbox' })
                        } else go(item.tab)
                      }}
                      className="flex w-full justify-between py-4 text-left text-xs"
                    >
                      {item.label}
                      <span className="text-slate-400">›</span>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </div>
        <div hidden={tab !== 'explorer'}>
          <Explorer
            key={replay?.id ?? 'default'}
            environment={environment}
            keys={keys}
            replay={replay}
            onLog={record}
            onTab={go}
          />
        </div>
        <div hidden={tab !== 'keys'}>
          <Keys
            keys={keys}
            onCreate={openCreate}
            onChange={changeKey}
            onTab={go}
          />
        </div>
        <div hidden={tab !== 'documentation'}>
          <Documentation onTab={go} />
        </div>
        <div hidden={tab !== 'webhooks'}>
          <Webhooks
            key={environment}
            environment={environment}
            config={configs[environment]}
            deliveries={deliveries[environment]}
            onSave={(config) =>
              setConfigs((current) => ({ ...current, [environment]: config }))
            }
            onTest={testWebhook}
            onTab={go}
          />
        </div>
        <div hidden={tab !== 'logs'}>
          <Logs
            logs={logs}
            environment={environment}
            onReplay={openReplay}
            onRetry={retry}
          />
        </div>
        {createEnvironment && (
          <Modal
            title={`Create ${createEnvironment} Key`}
            onClose={() => setCreateEnvironment(null)}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault()
                createKey()
              }}
              className="space-y-5"
            >
              <Field label="Key name">
                <input
                  autoFocus
                  required
                  maxLength={60}
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  placeholder="e.g. Mobile App Test"
                />
              </Field>
              <Notice>
                {createEnvironment === 'Production'
                  ? 'Production keys require approval before use.'
                  : 'Create a key for sandbox requests.'}
              </Notice>
              <div className="flex justify-end gap-3">
                <Button secondary onClick={() => setCreateEnvironment(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!keyName.trim()}>
                  Create Key
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  )
}
