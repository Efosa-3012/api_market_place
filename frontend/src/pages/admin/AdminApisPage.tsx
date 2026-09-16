import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ApiForm from '../../components/admin/catalog/ApiForm'
import Overview from '../../components/admin/catalog/Overview'
import Endpoints from '../../components/admin/catalog/Endpoints'
import Pricing from '../../components/admin/catalog/Pricing'
import Documentation from '../../components/admin/catalog/Documentation'
import Developers from '../../components/admin/catalog/Developers'
import Settings from '../../components/admin/catalog/Settings'
import { Badge, Button, Modal, Notice } from '../../components/admin/catalog/ui'
import {
  createApi,
  dateTime,
  initialCatalog,
  lifecycle,
  newInfo,
  publicVisible,
  tabs,
  transition,
} from '../../components/admin/catalog/model'
import type {
  ApiInfo,
  CatalogApi,
  CatalogTab,
  Lifecycle,
} from '../../components/admin/catalog/model'
export default function AdminApisPage() {
  const [apis, setApis] = useState(initialCatalog),
    [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(''),
    [sort, setSort] = useState('updated'),
    [add, setAdd] = useState(false),
    [notice, setNotice] = useState('')
  const selected = apis.find((api) => api.id === params.get('api'))
  const tab = tabs.find((t) => t.id === params.get('tab'))?.id ?? 'overview'
  function open(id?: string) {
    setParams(id ? { api: id, tab: 'overview' } : {})
    setNotice('')
  }
  function changeTab(next: CatalogTab, section?: string) {
    if (selected)
      setParams({
        api: selected.id,
        tab: next,
        ...(section ? { section } : {}),
      })
  }
  function change(patch: Partial<CatalogApi>, message: string) {
    if (!selected) return
    const time = new Date().toISOString()
    setApis((current) =>
      current.map((api) =>
        api.id === selected.id
          ? { ...api, ...patch, id: api.id, updated: time }
          : api,
      ),
    )
    setNotice(message)
  }
  function addApi(info: ApiInfo) {
    if (apis.some((api) => api.name.toLowerCase() === info.name.toLowerCase()))
      return 'An API with this name already exists.'
    const api = createApi(info, crypto.randomUUID(), new Date().toISOString())
    setApis((current) => [api, ...current])
    setAdd(false)
    open(api.id)
    setNotice('Draft API added.')
  }
  const list = apis
    .filter((api) =>
      `${api.name} ${api.category} ${api.description} ${api.tags.join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'category'
          ? a.category.localeCompare(b.category)
          : b.updated.localeCompare(a.updated),
    )
  return (
    <div className="min-h-[calc(100dvh-4rem)] min-w-0 bg-canvas p-4 text-ink sm:p-6 xl:p-9">
      {notice && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
      {selected ? (
        <Detail
          key={selected.id}
          api={selected}
          tab={tab}
          section={params.get('section') ?? 'General'}
          onBack={() => open()}
          onTab={changeTab}
          onChange={change}
          nameExists={(name) =>
            apis.some(
              (api) =>
                api.id !== selected.id &&
                api.name.toLowerCase() === name.toLowerCase(),
            )
          }
        />
      ) : (
        <>
          {params.get('api') && (
            <div className="mb-4">
              <Notice>
                The requested API could not be found.
              </Notice>
            </div>
          )}
          <header className="flex flex-wrap items-center justify-between gap-5 bg-white p-6">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight">
                API Catalog
              </h1>
              <p className="mt-2 text-sm text-body">
                Explore and manage APIs on the Marketplace
              </p>
            </div>
            <Button onClick={() => setAdd(true)}>＋ Add API</Button>
          </header>
          <div className="my-6 flex flex-wrap items-center justify-between gap-4">
            <label className="relative">
              <span className="sr-only">Search API catalog</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search APIs..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm sm:w-64"
              />
            </label>
            <label className="flex items-center gap-3 text-xs text-body">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <option value="updated">Last updated</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3 xl:grid-cols-3">
            {list.map((api) => (
              <article
                key={api.id}
                className="flex min-h-72 flex-col rounded-lg border border-line bg-white p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {api.category}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-[11px] font-semibold uppercase ${api.pricing.model === 'Free' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                    >
                      {api.pricing.model === 'Free' ? 'Free' : 'Paid'}
                    </span>
                  </div>
                  {api.icon ? (
                    <img
                      src={api.icon}
                      className="size-6 object-contain"
                      alt=""
                    />
                  ) : (
                    <span aria-hidden="true" className="text-xl text-red-400">
                      ◎
                    </span>
                  )}
                </div>
                <h2 className="text-base font-semibold">
                  {api.name === 'Transfer API'
                    ? api.name
                    : api.tagline || api.name}
                </h2>
                <div className="my-3 h-[3px] w-8 bg-red-500" />
                <p className="mb-5 text-xs leading-5 text-body">
                  {api.description}
                </p>
                <div className="mb-5 mt-auto flex items-center gap-2">
                  <Badge value={api.status} />
                  {!publicVisible(api) && (
                    <span className="text-[11px] text-slate-500">
                      Not listed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => open(api.id)}
                  className="min-h-10 bg-primary px-4 py-2 text-xs font-semibold tracking-wide text-white hover:bg-blue-700"
                >
                  VIEW DETAILS<span className="sr-only"> for {api.name}</span>
                </button>
              </article>
            ))}
          </div>
          {!list.length && (
            <p className="p-12 text-center text-sm text-slate-500">
              No APIs match your search.
            </p>
          )}
        </>
      )}
      {add && (
        <Modal title="Add API" onClose={() => setAdd(false)}>
          <ApiForm
            initial={newInfo}
            onSave={addApi}
            onClose={() => setAdd(false)}
          />
        </Modal>
      )}
    </div>
  )
}
function Detail({
  api,
  tab,
  section,
  onBack,
  onTab,
  onChange,
  nameExists,
}: {
  api: CatalogApi
  tab: CatalogTab
  section: string
  onBack: () => void
  onTab: (tab: CatalogTab, section?: string) => void
  onChange: (patch: Partial<CatalogApi>, message: string) => void
  nameExists: (name: string) => boolean
}) {
  const [edit, setEdit] = useState(false),
    [actions, setActions] = useState(false),
    [status, setStatus] = useState<Lifecycle | null>(null),
    [preview, setPreview] = useState(false)
  function askStatus(next: Lifecycle) {
    setActions(false)
    setStatus(next)
  }
  function saveInfo(info: ApiInfo) {
    if (nameExists(info.name)) return 'Another API uses this name.'
    onChange(info, 'API information saved.')
    setEdit(false)
  }
  return (
    <>
      <button onClick={onBack} className="mb-5 text-xs text-body">
        ‹ API Catalog <span className="px-2 text-slate-400">/</span>
        <span className="text-ink">{api.name}</span>
      </button>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-5 bg-white p-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">{api.name}</h1>
          <p className="mt-2 text-sm text-body">{api.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <Badge value={api.status} />
            <span>· Last updated {dateTime(api.updated)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button secondary onClick={() => setPreview(true)}>
            View on Marketplace ↗
          </Button>
          <div className="relative">
            <Button secondary onClick={() => setActions(!actions)}>
              Actions ⌄
            </Button>
            {actions && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <button
                  onClick={() => {
                    setEdit(true)
                    setActions(false)
                  }}
                  className="block w-full rounded p-2 text-left text-xs hover:bg-blue-50"
                >
                  Edit API information
                </button>
                {lifecycle
                  .filter((s) => s !== api.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => askStatus(s)}
                      className="block w-full rounded p-2 text-left text-xs hover:bg-blue-50"
                    >
                      {s === 'Published' ? 'Publish API' : `Set to ${s}`}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </header>
      <nav
        aria-label="API detail sections"
        className="mb-4 flex overflow-x-auto border-b border-line"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => onTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-4 text-sm ${tab === t.id ? 'border-primary font-semibold text-ink' : 'border-transparent text-body'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div hidden={tab !== 'overview'}>
        <Overview
          api={api}
          onTab={onTab}
          onEdit={() => setEdit(true)}
          onStatus={askStatus}
        />
      </div>
      <div hidden={tab !== 'endpoints'}>
        <Endpoints api={api} onChange={onChange} />
      </div>
      <div hidden={tab !== 'pricing'}>
        <Pricing api={api} onChange={onChange} />
      </div>
      <div hidden={tab !== 'documentation'}>
        <Documentation api={api} onChange={onChange} />
      </div>
      <div hidden={tab !== 'developers'}>
        <Developers api={api} onChange={onChange} />
      </div>
      <div hidden={tab !== 'settings'}>
        <Settings
          key={api.status}
          api={api}
          section={section}
          onSection={(s) => onTab('settings', s)}
          onEdit={() => setEdit(true)}
          onStatus={askStatus}
          onChange={onChange}
        />
      </div>
      {edit && (
        <Modal title="Edit API information" onClose={() => setEdit(false)}>
          <ApiForm
            initial={api}
            onSave={saveInfo}
            onClose={() => setEdit(false)}
          />
        </Modal>
      )}
      {status && (
        <Modal title={`Set API to ${status}`} onClose={() => setStatus(null)}>
          <p className="text-sm leading-6">
            Change {api.name} from {api.status} to {status}?{' '}
            {status === 'Archived' || status === 'Draft'
              ? 'This removes its marketplace listing.'
              : status === 'Published'
                ? 'This makes the API available on the marketplace.'
                : 'The lifecycle badge will be updated.'}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Unsaved settings drafts will be reset.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button secondary onClick={() => setStatus(null)}>
              Cancel
            </Button>
            <Button
              danger={status === 'Archived' || status === 'Deprecated'}
              onClick={() => {
                const updated = transition(
                  api,
                  status,
                  new Date().toISOString(),
                )
                onChange(
                  {
                    status: updated.status,
                    visible: status === 'Published' ? true : updated.visible,
                  },
                  `API status changed to ${status}.`,
                )
                setStatus(null)
              }}
            >
              Confirm change
            </Button>
          </div>
        </Modal>
      )}
      {preview && (
        <Modal title="Marketplace details" onClose={() => setPreview(false)}>
          <div className="space-y-4">
            <Badge value={api.status} />
            <h3 className="text-xl font-semibold">{api.name}</h3>
            <p className="text-sm leading-6 text-slate-600">
              {api.description}
            </p>
            <p className="text-xs">
              {api.category} · {api.pricing.model} · {api.version}
            </p>
            <Notice>
              {publicVisible(api)
                ? 'This API is listed on the marketplace.'
                : 'This API is not listed. Publish it and enable marketplace visibility in Settings.'}{' '}
              
            </Notice>
            <Link
              to="/app/marketplace"
              className="inline-block rounded-lg bg-blue-600 px-4 py-3 text-xs font-semibold text-white"
            >
              Open developer marketplace →
            </Link>
          </div>
        </Modal>
      )}
    </>
  )
}
