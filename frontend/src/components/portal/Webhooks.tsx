import { useState } from 'react'
import type { Delivery, Environment, PortalTab, WebhookConfig } from './model'
import { dateTime, eventOptions } from './model'
import { Badge, Button, CodeBlock, Field, Notice, Panel } from './ui'
export default function Webhooks({
  environment,
  config,
  deliveries,
  onSave,
  onTest,
  onTab,
}: {
  environment: Environment
  config: WebhookConfig
  deliveries: Delivery[]
  onSave: (config: WebhookConfig) => void
  onTest: () => void
  onTab: (tab: PortalTab) => void
}) {
  const [url, setUrl] = useState(config.url)
  const [events, setEvents] = useState(config.events)
  const [notice, setNotice] = useState('')
  const dirty =
    url !== config.url ||
    JSON.stringify(events) !== JSON.stringify(config.events)
  function save() {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
        throw new Error()
      if (!events.length) {
        setNotice('Select at least one event.')
        return
      }
      onSave({ url: parsed.toString(), events })
      setUrl(parsed.toString())
      setNotice('Webhook configuration saved.')
    } catch {
      setNotice(
        'Enter a valid HTTPS callback URL without embedded credentials.',
      )
    }
  }
  return (
    <div className="space-y-5">
      <Notice>
        {environment === 'Sandbox'
          ? 'Test your webhook configuration in the sandbox environment.'
          : 'Production webhook tests are currently unavailable.'}
      </Notice>
      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Webhook Configuration"
          action={
            <button
              onClick={() => onTab('documentation')}
              className="text-xs text-blue-600"
            >
              Learn more about webhooks ↗
            </button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            className="space-y-5"
          >
            <Field label="Callback URL">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.yourcompany.com/webhooks/stanbic"
              />
            </Field>
            <fieldset>
              <legend className="text-xs font-semibold">
                Subscribe to events
              </legend>
              <p className="my-2 text-xs text-slate-500">
                Select events you want to receive notifications for.
              </p>
              <div className="flex flex-wrap gap-2">
                {eventOptions.map((event) => (
                  <button
                    key={event}
                    type="button"
                    aria-pressed={events.includes(event)}
                    onClick={() =>
                      setEvents((current) =>
                        current.includes(event)
                          ? current.filter((item) => item !== event)
                          : [...current, event],
                      )
                    }
                    className={`rounded-full border px-3 py-2 text-xs ${events.includes(event) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600'}`}
                  >
                    {event.replaceAll('.', ' ').replaceAll('-', ' ')}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-slate-500">
              Only selected events will be sent to your endpoint.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Save Changes</Button>
              <Button
                secondary
                disabled={
                  dirty ||
                  !config.url ||
                  !config.events.length ||
                  environment === 'Production'
                }
                onClick={() => {
                  onTest()
                  setNotice(
                    'Test delivery added.',
                  )
                }}
              >
                Send Test Webhook
              </Button>
            </div>
            {dirty && (
              <p className="text-xs text-amber-700">
                Save your changes before testing.
              </p>
            )}
            {notice && (
              <p role="status" className="text-xs leading-5 text-blue-700">
                {notice}
              </p>
            )}
          </form>
        </Panel>
        <Panel
          title="Recent Deliveries"
          subtitle="Last 5 delivery attempts."
          action={
            <button
              onClick={() => onTab('logs')}
              className="text-xs text-blue-600"
            >
              View all logs →
            </button>
          }
        >
          <div className="divide-y divide-slate-100">
            {deliveries.slice(0, 5).map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-xs font-medium">{delivery.event}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {dateTime(delivery.time)}
                  </p>
                </div>
                <Badge bad={delivery.status >= 400}>
                  {delivery.status} {delivery.status < 400 ? 'OK' : 'Failed'}
                </Badge>
              </div>
            ))}
            {!deliveries.length && (
              <p className="py-8 text-center text-sm text-slate-400">
                No deliveries yet. Save a callback and send a test.
              </p>
            )}
          </div>
        </Panel>
      </div>
      <Panel
        title="Webhook Security"
        subtitle="Verify incoming events using the documented signing scheme."
        action={
          <Button secondary onClick={() => onTab('documentation')}>
            View Verification Guide →
          </Button>
        }
      >
        <CodeBlock
          title="Signature header"
          text="X-Stanbic-Signature: sha256=YOUR_SIGNATURE"
        />
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Verify the request signature before processing the event.
        </p>
      </Panel>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <strong className="text-sm">Ready to test an endpoint?</strong>
        <Button onClick={() => onTab('explorer')}>Open API Explorer →</Button>
      </div>
    </div>
  )
}
