import { useState } from 'react'
import type { CatalogApi, DocPage } from './model'
import { Button, Copy, Field, Modal, Notice } from './ui'
export default function Documentation({
  api,
  onChange,
}: {
  api: CatalogApi
  onChange: (patch: Partial<CatalogApi>, message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('introduction')
  const [draft, setDraft] = useState<DocPage | null>(null)
  const pages = [
    ...api.docs.filter((doc) => !doc.id.startsWith('ep-')),
    ...api.endpoints.map(
      (ep) =>
        api.docs.find((doc) => doc.id === `ep-${ep.id}`) ?? {
          id: `ep-${ep.id}`,
          title: ep.description,
          body: `${ep.method} ${ep.path}\n\n${ep.description}`,
        },
    ),
  ]
  const matches = pages.filter((doc) =>
    `${doc.title} ${doc.body}`.toLowerCase().includes(query.toLowerCase()),
  )
  const current = matches.find((doc) => doc.id === selected) ?? matches[0]
  const endpoint = current
    ? api.endpoints.find((ep) => `ep-${ep.id}` === current.id)
    : undefined
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[200px_1fr]">
      <aside
        aria-label="Documentation pages"
        className="rounded-lg bg-white p-4"
      >
        <Field label="Search docs">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs..."
          />
        </Field>
        <nav aria-label="API documentation" className="mt-4 space-y-1">
          {matches.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc.id)}
              aria-current={current?.id === doc.id ? 'page' : undefined}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs ${current?.id === doc.id ? 'bg-blue-50 text-blue-600' : 'text-[#526783] hover:bg-slate-50'}`}
            >
              {doc.title}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 space-y-5">
        {current ? (
          <>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-semibold">{current.title}</h2>
              <Button secondary onClick={() => setDraft({ ...current })}>
                ✎ Edit page
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-[#526783]">
              {current.body}
            </p>
            <Notice>
              Manage the documentation for this API.
            </Notice>
            {endpoint && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Copy dark text={`Request example\n${endpoint.request}`} />
                <Copy dark text={`Response example\n${endpoint.response}`} />
              </div>
            )}
            {current.id === 'introduction' && (
              <>
                <h3 className="text-sm font-semibold">Base URLs</h3>
                <p className="text-xs text-[#526783]">
                  Choose the appropriate environment.
                </p>
                <div className="grid gap-4 xl:grid-cols-2">
                  {(['Sandbox', 'Production'] as const).map((env) => (
                    <div
                      key={env}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <p className="mb-2 text-xs font-semibold">
                        {env} ·{' '}
                        {api.environments[env].enabled ? 'Enabled' : 'Disabled'}
                      </p>
                      <Copy text={api.environments[env].url} />
                    </div>
                  ))}
                </div>
                <h3 className="text-sm font-semibold">Authentication</h3>
                <p className="text-xs text-[#526783]">
                  Configured method: {api.authentication}. Follow the documented token exchange.
                </p>
                <Copy
                  dark
                  text={
                    api.authentication === 'OAuth 2.0'
                      ? 'Authorization: Bearer <your_access_token>'
                      : 'X-API-Key: <your_server_side_api_key>'
                  }
                />
              </>
            )}
          </>
        ) : (
          <p className="rounded-lg bg-white p-8 text-sm text-slate-500">
            No documentation pages match your search.
          </p>
        )}
      </div>
      {draft && (
        <Modal title="Edit documentation page" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.title.trim() || !draft.body.trim()) return
              const saved = {
                ...draft,
                title: draft.title.trim(),
                body: draft.body.trim(),
              }
              onChange(
                {
                  docs: api.docs.some((doc) => doc.id === saved.id)
                    ? api.docs.map((doc) => (doc.id === saved.id ? saved : doc))
                    : [...api.docs, saved],
                },
                'Documentation saved.',
              )
              setDraft(null)
            }}
            className="space-y-4"
          >
            <Field label="Title">
              <input
                required
                maxLength={120}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="Page content (plain text)">
              <textarea
                required
                rows={12}
                maxLength={20000}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-3">
              <Button secondary onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!draft.title.trim() || !draft.body.trim()}
              >
                Save page
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
