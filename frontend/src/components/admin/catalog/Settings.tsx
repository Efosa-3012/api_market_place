import { useState } from 'react'
import type { CatalogApi, Environment, Lifecycle } from './model'
import { validUrl } from './model'
import { Badge, Button, Field, Notice, Panel, Pairs, Switch } from './ui'
const sections = [
  'General',
  'Environments',
  'Security',
  'Access & Visibility',
  'Notifications',
  'Deprecation',
  'Danger Zone',
]
function config(api: CatalogApi) {
  return {
    environments: structuredClone(api.environments),
    authentication: api.authentication,
    defaultEnvironment: api.defaultEnvironment,
    visible: api.visible,
    tags: [...api.tags],
    supportEmail: api.supportEmail,
    supportSlack: api.supportSlack,
    notifications: { ...api.notifications },
    rateLimit: api.rateLimit,
    requireApproval: api.requireApproval,
    deprecationDate: api.deprecationDate,
    deprecationMessage: api.deprecationMessage,
    icon: api.icon,
  }
}
export default function Settings({
  api,
  section,
  onSection,
  onEdit,
  onStatus,
  onChange,
}: {
  api: CatalogApi
  section: string
  onSection: (section: string) => void
  onEdit: () => void
  onStatus: (status: Lifecycle) => void
  onChange: (patch: Partial<CatalogApi>, message: string) => void
}) {
  const [draft, setDraft] = useState(() => config(api)),
    [error, setError] = useState(''),
    [tag, setTag] = useState('')
  const active = sections.includes(section) ? section : 'General',
    dirty = JSON.stringify(draft) !== JSON.stringify(config(api))
  function update<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
    setError('')
  }
  function save() {
    for (const env of ['Sandbox', 'Production'] as const) {
      if (!validUrl(draft.environments[env].url, true)) {
        setError(
          `${env} needs a valid HTTPS base URL without embedded credentials.`,
        )
        return
      }
    }
    if (!draft.environments[draft.defaultEnvironment].enabled) {
      setError(
        'Enable the default environment or select an enabled environment.',
      )
      return
    }
    if (!Number.isInteger(draft.rateLimit) || draft.rateLimit < 1) {
      setError('Rate limit must be a positive whole number.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.supportEmail)) {
      setError('Enter a valid support email.')
      return
    }
    if (draft.supportSlack && !validUrl(draft.supportSlack, true)) {
      setError('Enter a valid HTTPS support link.')
      return
    }
    onChange(
      {
        ...draft,
        visible: ['Draft', 'Archived'].includes(api.status)
          ? false
          : draft.visible,
      },
      'Settings saved.',
    )
    setDraft({
      ...draft,
      visible: ['Draft', 'Archived'].includes(api.status)
        ? false
        : draft.visible,
    })
    setError('')
  }
  async function upload(file?: File) {
    if (!file) return
    if (
      !['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError('Choose a PNG, JPG or SVG image up to 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const source = String(reader.result)
      const image = new Image()
      image.onload = () => update('icon', source)
      image.onerror = () => setError('This file could not be read as an image.')
      image.src = source
    }
    reader.onerror = () => setError('Unable to read this file.')
    reader.readAsDataURL(file)
  }
  const visibility = (
    <Panel
      title="Status & Visibility"
      subtitle="Control the availability of this API on the marketplace."
      action={<Badge value={api.status} />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          secondary
          onClick={() => onStatus('Published')}
          disabled={api.status === 'Published'}
        >
          Publish
        </Button>
        <Button
          secondary
          onClick={() => onStatus('Draft')}
          disabled={api.status === 'Draft'}
        >
          Move to Draft
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Show on marketplace</p>
          <p className="mt-1 text-xs text-slate-500">
            Publish this API before listing it.
          </p>
        </div>
        <Switch
          label="Show on marketplace"
          checked={draft.visible && !['Draft', 'Archived'].includes(api.status)}
          disabled={['Draft', 'Archived'].includes(api.status)}
          onChange={(value) => update('visible', value)}
        />
      </div>
    </Panel>
  )
  const defaultEnv = (
    <Panel
      title="Default Environment"
      subtitle="Select the default environment for testing and documentation."
    >
      <div className="space-y-5">
        {(['Sandbox', 'Production'] as const).map((env) => (
          <label key={env} className="flex items-start gap-3 text-xs">
            <input
              type="radio"
              name={`environment-${api.id}`}
              checked={draft.defaultEnvironment === env}
              onChange={() => update('defaultEnvironment', env)}
              className="accent-blue-600"
            />
            <span>
              <strong>{env}</strong>
              <span className="mt-1 block text-slate-500">
                Use {env.toLowerCase()} by default for new developers.
              </span>
            </span>
          </label>
        ))}
      </div>
    </Panel>
  )
  const danger = (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50/60 p-5">
      <div>
        <h3 className="text-sm font-semibold">Danger Zone</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Change API availability. Archive removes its
          marketplace listing.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button secondary onClick={() => onStatus('Maintenance')}>
          Put in Maintenance
        </Button>
        <Button secondary onClick={() => onStatus('Deprecated')}>
          Deprecate API
        </Button>
        <Button danger onClick={() => onStatus('Archived')}>
          Archive API
        </Button>
      </div>
    </div>
  )
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[150px_minmax(0,1fr)]">
      <nav
        aria-label="API settings"
        className="flex gap-2 overflow-auto lg:flex-col"
      >
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => onSection(s)}
            className={`shrink-0 rounded-lg px-3 py-3 text-left text-xs ${active === s ? 'bg-blue-50 font-semibold text-blue-600' : 'text-[#526783]'}`}
          >
            {s}
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-5">
        {active === 'General' && (
          <>
            <div className="grid gap-5 xl:grid-cols-2">
              <Panel
                title="API Details"
                action={
                  <button onClick={onEdit} className="text-xs text-blue-600">
                    ✎ Edit
                  </button>
                }
              >
                <Pairs
                  items={[
                    ['API Name', api.name],
                    ['Category', api.category],
                    ['Description', api.description],
                    ['Owner', api.owner],
                    ['Version', api.version],
                  ]}
                />
              </Panel>
              <Panel title="API Icon">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-blue-50 text-4xl text-blue-600">
                    {draft.icon ? (
                      <img
                        src={draft.icon}
                        alt=""
                        className="size-full object-contain"
                      />
                    ) : (
                      '➤'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-3 text-xs text-slate-500">
                      Recommended: 512 × 512px
                      <br />
                      PNG, SVG or JPG, max 2 MB.
                    </p>
                    <label className="block text-xs font-semibold text-blue-600">
                      Change icon
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={(e) => void upload(e.target.files?.[0])}
                        className="mt-3 block w-full text-xs"
                      />
                    </label>
                    {draft.icon && (
                      <button
                        onClick={() => update('icon', '')}
                        className="mt-3 text-xs text-red-600"
                      >
                        Remove icon
                      </button>
                    )}
                  </div>
                </div>
              </Panel>
              {visibility}
              {defaultEnv}
              <Panel title="Tags" subtitle="Help developers find this API.">
                <div className="mb-3 flex flex-wrap gap-2">
                  {draft.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        update(
                          'tags',
                          draft.tags.filter((x) => x !== t),
                        )
                      }
                      aria-label={`Remove tag ${t}`}
                      className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600"
                    >
                      {t} ×
                    </button>
                  ))}
                </div>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const next = tag.trim()
                    if (
                      next &&
                      !draft.tags.some(
                        (t) => t.toLowerCase() === next.toLowerCase(),
                      )
                    )
                      update('tags', [...draft.tags, next])
                    setTag('')
                  }}
                >
                  <Field label="New tag">
                    <input
                      value={tag}
                      maxLength={40}
                      onChange={(e) => setTag(e.target.value)}
                    />
                  </Field>
                  <Button secondary type="submit">
                    Add
                  </Button>
                </form>
              </Panel>
              <Panel
                title="Support Contact"
                subtitle="Shown to developers who need help."
              >
                <div className="space-y-4">
                  <Field label="Email">
                    <input
                      type="email"
                      value={draft.supportEmail}
                      onChange={(e) => update('supportEmail', e.target.value)}
                    />
                  </Field>
                  <Field label="Slack / support link (optional)">
                    <input
                      type="url"
                      value={draft.supportSlack}
                      onChange={(e) => update('supportSlack', e.target.value)}
                    />
                  </Field>
                </div>
              </Panel>
            </div>
            {danger}
          </>
        )}
        {active === 'Environments' && (
          <>
            <div className="grid gap-5 xl:grid-cols-2">
              {(['Sandbox', 'Production'] as Environment[]).map((env) => (
                <Panel
                  key={env}
                  title={env}
                  action={
                    <Switch
                      label={`Enable ${env}`}
                      checked={draft.environments[env].enabled}
                      onChange={(enabled) =>
                        update('environments', {
                          ...draft.environments,
                          [env]: { ...draft.environments[env], enabled },
                        })
                      }
                    />
                  }
                >
                  <Field label="HTTPS base URL">
                    <input
                      type="url"
                      value={draft.environments[env].url}
                      onChange={(e) =>
                        update('environments', {
                          ...draft.environments,
                          [env]: {
                            ...draft.environments[env],
                            url: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </Panel>
              ))}
            </div>
            {defaultEnv}
          </>
        )}
        {active === 'Security' && (
          <Panel title="Authentication & Rate Limits">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Authentication method">
                <select
                  value={draft.authentication}
                  onChange={(e) =>
                    update(
                      'authentication',
                      e.target.value as CatalogApi['authentication'],
                    )
                  }
                >
                  <option>OAuth 2.0</option>
                  <option>API Key</option>
                </select>
              </Field>
              <Field label="Requests per minute">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={Number.isNaN(draft.rateLimit) ? '' : draft.rateLimit}
                  onChange={(e) =>
                    update(
                      'rateLimit',
                      e.target.value === '' ? NaN : Number(e.target.value),
                    )
                  }
                />
              </Field>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Configure authentication and request rate limits.
            </p>
          </Panel>
        )}
        {active === 'Access & Visibility' && (
          <>
            {visibility}
            <Panel title="Developer access">
              <div className="flex justify-between gap-4 text-sm">
                <span>Require approval for new access requests</span>
                <Switch
                  label="Require access approval"
                  checked={draft.requireApproval}
                  onChange={(value) => update('requireApproval', value)}
                />
              </div>
            </Panel>
          </>
        )}
        {active === 'Notifications' && (
          <Panel title="Notification preferences">
            <div className="space-y-5">
              {(
                [
                  ['errors', 'API errors'],
                  ['usage', 'Usage thresholds'],
                  ['changes', 'Configuration changes'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex justify-between gap-3 text-sm">
                  <span>{label}</span>
                  <Switch
                    label={label}
                    checked={draft.notifications[key]}
                    onChange={(value) =>
                      update('notifications', {
                        ...draft.notifications,
                        [key]: value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Choose which notifications you want to receive.
            </p>
          </Panel>
        )}
        {active === 'Deprecation' && (
          <Panel
            title="Deprecation notice"
            subtitle="Store the notice and planned date. Saving does not automatically change lifecycle status."
          >
            <div className="space-y-4">
              <Field label="Planned deprecation date">
                <input
                  type="date"
                  value={draft.deprecationDate}
                  onChange={(e) => update('deprecationDate', e.target.value)}
                />
              </Field>
              <Field label="Message to developers">
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={draft.deprecationMessage}
                  onChange={(e) => update('deprecationMessage', e.target.value)}
                />
              </Field>
              <Button secondary onClick={() => onStatus('Deprecated')}>
                Deprecate API now
              </Button>
            </div>
          </Panel>
        )}
        {active === 'Danger Zone' && danger}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </p>
        )}
        <Notice>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>
              {dirty ? 'Unsaved settings changes' : 'Settings are up to date.'}
            </span>
            <div className="flex gap-2">
              <Button
                secondary
                disabled={!dirty}
                onClick={() => {
                  setDraft(config(api))
                  setError('')
                }}
              >
                Discard
              </Button>
              <Button disabled={!dirty} onClick={save}>
                Save Changes
              </Button>
            </div>
          </div>
        </Notice>
      </div>
    </div>
  )
}
