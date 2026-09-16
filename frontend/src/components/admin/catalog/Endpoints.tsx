import { useState } from 'react'
import type { CatalogApi, Endpoint, Method } from './model'
import { date, methods, validateEndpoint } from './model'
import { Badge, Button, Field, Modal, Notice, Panel } from './ui'
export default function Endpoints({
  api,
  onChange,
}: {
  api: CatalogApi
  onChange: (patch: Partial<CatalogApi>, message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Endpoint | null>(null)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<Endpoint | null>(null)
  const filtered = api.endpoints.filter(
    (ep) =>
      `${ep.path} ${ep.description}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (method === 'all' || ep.method === method) &&
      (status === 'all' || ep.status === status),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 8))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * 8, current * 8)
  function open(ep?: Endpoint) {
    setError('')
    setEditing(
      ep
        ? { ...ep }
        : {
            id: crypto.randomUUID(),
            path: '/',
            method: 'POST',
            description: '',
            status: 'Live',
            updated: new Date().toISOString(),
            request: '{}',
            response: '{\n  "status": "success"\n}',
          },
    )
  }
  function save() {
    if (!editing) return
    const ep = {
      ...editing,
      path: editing.path.trim(),
      description: editing.description.trim(),
      updated: new Date().toISOString(),
    }
    const problem = validateEndpoint(ep, api.endpoints)
    if (problem) {
      setError(problem)
      return
    }
    onChange(
      {
        endpoints: api.endpoints.some((item) => item.id === ep.id)
          ? api.endpoints.map((item) => (item.id === ep.id ? ep : item))
          : [...api.endpoints, ep],
      },
      'Endpoint saved.',
    )
    setEditing(null)
  }
  return (
    <>
      <Panel
        title="Endpoints"
        subtitle="Manage API endpoints, request parameters and response examples."
        action={<Button onClick={() => open()}>＋ Add Endpoint</Button>}
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Search endpoints">
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search endpoints..."
            />
          </Field>
          <Field label="Method">
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All methods</option>
              {methods.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All statuses</option>
              <option>Live</option>
              <option>Disabled</option>
            </select>
          </Field>
        </div>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-[#526783]">
              <tr>
                {[
                  'Endpoint',
                  'Method',
                  'Description',
                  'Status',
                  'Last updated',
                  'Actions',
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ep) => (
                <tr key={ep.id} className="border-t border-slate-100">
                  <th scope="row" className="px-4 py-4 font-mono font-normal">
                    {ep.path}
                  </th>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded border px-2 py-1 text-[10px] ${ep.method === 'DELETE' ? 'border-red-100 bg-red-50 text-red-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="max-w-56 px-4 py-4 text-[#526783]">
                    {ep.description}
                  </td>
                  <td className="px-4 py-4">
                    <Badge value={ep.status} />
                  </td>
                  <td className="px-4 py-4 text-[#526783]">
                    {date(ep.updated)}
                  </td>
                  <td className="px-4 py-4">
                    <details>
                      <summary
                        aria-label={`Actions for ${ep.method} ${ep.path}`}
                        className="cursor-pointer list-none p-2"
                      >
                        ⋯
                      </summary>
                      <div className="space-y-2 py-2">
                        <button
                          className="block text-blue-600"
                          onClick={() => open(ep)}
                        >
                          Edit
                        </button>
                        <button
                          className="block text-blue-600"
                          onClick={() =>
                            onChange(
                              {
                                endpoints: api.endpoints.map((item) =>
                                  item.id === ep.id
                                    ? {
                                        ...item,
                                        status:
                                          item.status === 'Live'
                                            ? 'Disabled'
                                            : 'Live',
                                        updated: new Date().toISOString(),
                                      }
                                    : item,
                                ),
                              },
                              'Endpoint status updated.',
                            )
                          }
                        >
                          {ep.status === 'Live' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="block text-red-600"
                          onClick={() => setRemoving(ep)}
                        >
                          Remove
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No endpoints match this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span>
            Showing {filtered.length ? (current - 1) * 8 + 1 : 0}–
            {Math.min(current * 8, filtered.length)} of {filtered.length}{' '}
            endpoints
          </span>
          <div className="flex items-center gap-2">
            <Button
              secondary
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </Button>
            <span>
              {current} / {pages}
            </span>
            <Button
              secondary
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              ›
            </Button>
          </div>
        </div>
      </Panel>
      {editing && (
        <Modal
          title={
            api.endpoints.some((ep) => ep.id === editing.id)
              ? 'Edit endpoint'
              : 'Add endpoint'
          }
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <Field label="Method">
                <select
                  value={editing.method}
                  onChange={(e) =>
                    setEditing({ ...editing, method: e.target.value as Method })
                  }
                >
                  {methods.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Field label="Endpoint path *">
                <input
                  required
                  value={editing.path}
                  onChange={(e) =>
                    setEditing({ ...editing, path: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Description *">
              <input
                required
                maxLength={300}
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Request example (JSON)">
                <textarea
                  rows={8}
                  spellCheck={false}
                  className="font-mono"
                  value={editing.request}
                  onChange={(e) =>
                    setEditing({ ...editing, request: e.target.value })
                  }
                />
              </Field>
              <Field label="Response example (JSON)">
                <textarea
                  rows={8}
                  spellCheck={false}
                  className="font-mono"
                  value={editing.response}
                  onChange={(e) =>
                    setEditing({ ...editing, response: e.target.value })
                  }
                />
              </Field>
            </div>
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button secondary onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save endpoint</Button>
            </div>
          </form>
        </Modal>
      )}
      {removing && (
        <Modal title="Remove endpoint?" onClose={() => setRemoving(null)}>
          <Notice>
            Remove {removing.method} {removing.path} from this API configuration.
          </Notice>
          <div className="mt-5 flex justify-end gap-3">
            <Button secondary onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              danger
              onClick={() => {
                onChange(
                  {
                    endpoints: api.endpoints.filter(
                      (ep) => ep.id !== removing.id,
                    ),
                    docs: api.docs.filter(
                      (doc) => doc.id !== `ep-${removing.id}`,
                    ),
                  },
                  'Endpoint removed.',
                )
                setRemoving(null)
              }}
            >
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
