import { useState } from 'react'
import type { ApiKey, PortalTab } from './model'
import { dateTime } from './model'
import { Badge, Button, CodeBlock, Modal, Notice, Panel } from './ui'

export default function Keys({
  keys,
  onCreate,
  onChange,
  onTab,
}: {
  keys: ApiKey[]
  onCreate: (environment: 'Sandbox' | 'Production') => void
  onChange: (id: string, action: 'rotate' | 'revoke') => void
  onTab: (tab: PortalTab) => void
}) {
  const [pending, setPending] = useState<{
    id: string
    action: 'rotate' | 'revoke'
  } | null>(null)
  const [notice, setNotice] = useState('')
  async function copy(key: ApiKey) {
    try {
      await navigator.clipboard.writeText(key.secret)
      setNotice(`${key.name} API key copied.`)
    } catch {
      setNotice(
        'Clipboard unavailable. Use localhost or HTTPS and allow clipboard access.',
      )
    }
  }
  return (
    <div className="space-y-6">
      <Notice>
        <strong>Keep your API keys secure</strong>
        <p>
          Keep API keys confidential. Do not expose server-side credentials in client-side code.
        </p>
      </Notice>
      {notice && (
        <p role="status" className="text-xs text-blue-600">
          {notice}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-5">
          {(['Sandbox', 'Production'] as const).map((environment) => (
            <Panel
              key={environment}
              title={`${environment} Keys`}
              subtitle={
                environment === 'Sandbox'
                  ? 'Test and build your integration with sandbox credentials.'
                  : 'Production access is pending approval. New production keys remain inactive until approved.'
              }
              action={
                <Button onClick={() => onCreate(environment)}>
                  ＋ Create {environment} Key
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="text-[11px] text-slate-500">
                    <tr>
                      {[
                        'Key name',
                        'API key',
                        'Created',
                        'Last used',
                        'Status',
                        'Actions',
                      ].map((label) => (
                        <th
                          key={label}
                          className="border-b border-slate-100 pb-3 pr-3 font-medium"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keys
                      .filter((key) => key.environment === environment)
                      .map((key) => (
                        <tr
                          key={key.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <th scope="row" className="py-4 pr-3 font-medium">
                            {key.name}
                          </th>
                          <td className="pr-3">
                            <button
                              disabled={key.status !== 'Active'}
                              onClick={() => void copy(key)}
                              aria-label={`Copy ${key.name}`}
                              className="rounded bg-slate-50 p-2 font-mono text-[10px] disabled:opacity-50"
                            >
                              {key.secret.slice(0, 10)}••••
                              {key.secret.slice(-4)} ⧉
                            </button>
                          </td>
                          <td className="pr-3 text-[10px] text-slate-500">
                            {dateTime(key.created)}
                          </td>
                          <td className="pr-3 text-[10px] text-slate-500">
                            {key.lastUsed ? dateTime(key.lastUsed) : '—'}
                          </td>
                          <td className="pr-3">
                            <Badge
                              bad={key.status === 'Revoked'}
                              amber={key.status === 'Pending'}
                            >
                              {key.status}
                            </Badge>
                          </td>
                          <td>
                            <details>
                              <summary
                                aria-label={`Actions for ${key.name}`}
                                className="cursor-pointer list-none p-2"
                              >
                                ⋯
                              </summary>
                              <div className="space-y-2 py-2">
                                {key.status === 'Active' && (
                                  <button
                                    className="block text-blue-600"
                                    onClick={() =>
                                      setPending({
                                        id: key.id,
                                        action: 'rotate',
                                      })
                                    }
                                  >
                                    Rotate
                                  </button>
                                )}
                                {key.status !== 'Revoked' && (
                                  <button
                                    className="block text-red-600"
                                    onClick={() =>
                                      setPending({
                                        id: key.id,
                                        action: 'revoke',
                                      })
                                    }
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
          <Panel title="Best practices">
            <div className="grid gap-4 text-xs leading-6 text-slate-600 sm:grid-cols-2">
              <ul>
                <li>✓ Keep keys confidential</li>
                <li>✓ Separate sandbox and production</li>
                <li>✓ Rotate keys when needed</li>
                <li>✓ Monitor integration activity</li>
              </ul>
              <ul>
                <li>× Do not share keys publicly</li>
                <li>× Do not embed keys in browser code</li>
                <li>× Do not hardcode live credentials</li>
                <li>× Do not reuse keys across environments</li>
              </ul>
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel
            title="Authentication method"
            subtitle="Include your access token in the Authorization header."
          >
            <CodeBlock
              title="Authorization header"
              text="Authorization: Bearer YOUR_ACCESS_TOKEN"
            />
            <div className="mt-4">
              <Button secondary onClick={() => onTab('documentation')}>
                View authentication guide →
              </Button>
            </div>
          </Panel>
          <Panel title="Need to rotate a key?">
            <p className="text-xs leading-6 text-slate-500">
              Rotate a key from its action menu. The previous value is
              replaced, and request logs retain only the key ID.
            </p>
          </Panel>
        </div>
      </div>
      {pending && (
        <Modal
          title={`${pending.action === 'rotate' ? 'Rotate' : 'Revoke'} API key?`}
          onClose={() => setPending(null)}
        >
          <p className="text-sm leading-6 text-slate-600">
            {pending.action === 'rotate'
              ? 'Replace the selected credential.'
              : 'The selected key will no longer be available for requests.'}{' '}
            Update integrations that depend on this key.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button secondary onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onChange(pending.id, pending.action)
                setNotice(
                  `API key ${pending.action === 'rotate' ? 'rotated' : 'revoked'}.`,
                )
                setPending(null)
              }}
            >
              Confirm
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
