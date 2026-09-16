import { useState } from 'react'
import type { CatalogApi, Developer } from './model'
import { csv, date, download, metrics, number } from './model'
import { Badge, Button, Field, Modal, Panel } from './ui'
export default function Developers({
  api,
  onChange,
}: {
  api: CatalogApi
  onChange: (patch: Partial<CatalogApi>, message: string) => void
}) {
  const [asOf] = useState(() => new Date())
  const [requests, setRequests] = useState(false),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('All'),
    [days, setDays] = useState('All'),
    [page, setPage] = useState(1)
  const [action, setAction] = useState<{
    developer: Developer
    status: Developer['status']
  } | null>(null)
  const m = metrics(api)
  const filtered = api.developers.filter(
    (d) =>
      (!requests || d.status === 'Pending') &&
      d.company.toLowerCase().includes(search.toLowerCase()) &&
      (status === 'All' || d.status === status) &&
      (days === 'All' ||
        new Date(d.joined).getTime() >=
          asOf.getTime() - Number(days) * 86400000),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    current = Math.min(page, pages)
  function exportRows() {
    download(
      csv([
        ['Company', 'Status', 'APIs', 'Calls (30 days)', 'Joined'],
        ...filtered.map((d) => [
          d.company,
          d.status,
          d.apiCount,
          d.calls,
          d.joined,
        ]),
      ]),
      `${api.id}-developers.csv`,
    )
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total developers', m.total],
          ['Active integrations', m.active],
          [
            'New this month',
            api.developers.filter(
              (d) =>
                d.status !== 'Rejected' &&
                new Date(d.joined).getMonth() === asOf.getMonth() &&
                new Date(d.joined).getFullYear() === asOf.getFullYear(),
            ).length,
          ],
          ['Pending approval', m.pending],
        ].map(([label, value]) => (
          <Panel key={label} title={String(label)}>
            <strong className="text-2xl">{number(Number(value))}</strong>
          </Panel>
        ))}
      </div>
      <div className="flex gap-4 border-b border-slate-200">
        {[false, true].map((value) => (
          <button
            key={String(value)}
            onClick={() => {
              setRequests(value)
              setStatus('All')
              setPage(1)
            }}
            className={`border-b-2 px-3 py-3 text-sm ${requests === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            {value ? `Access Requests (${m.pending})` : 'Developers'}
          </button>
        ))}
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_150px_160px_auto]">
        <Field label="Search developers">
          <input
            placeholder="Search company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </Field>
        <Field label="Status">
          <select
            disabled={requests}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            {['All', 'Active', 'Pending', 'Suspended', 'Rejected'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Joined">
          <select
            value={days}
            onChange={(e) => {
              setDays(e.target.value)
              setPage(1)
            }}
          >
            <option value="All">All dates</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </Field>
        <Button secondary onClick={exportRows}>
          Export CSV
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#dfe6f2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-[#526783]">
              <tr>
                {[
                  'Company',
                  'Status',
                  'APIs',
                  'Total Calls (30d)',
                  'Joined',
                  'Actions',
                ].map((h) => (
                  <th key={h} className="p-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((current - 1) * 8, current * 8).map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-4 font-semibold">
                    <span className="mr-3 inline-grid size-8 place-items-center rounded-full bg-blue-100 text-[10px] text-blue-600">
                      {d.company
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    {d.company}
                  </td>
                  <td className="p-4">
                    <Badge value={d.status} />
                  </td>
                  <td className="p-4">{d.apiCount}</td>
                  <td className="p-4">{number(d.calls)}</td>
                  <td className="p-4 text-[#657790]">{date(d.joined)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {d.status === 'Pending' ? (
                        <>
                          <Button
                            secondary
                            onClick={() =>
                              setAction({ developer: d, status: 'Active' })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            secondary
                            onClick={() =>
                              setAction({ developer: d, status: 'Rejected' })
                            }
                          >
                            Reject
                          </Button>
                        </>
                      ) : d.status === 'Active' ? (
                        <Button
                          secondary
                          onClick={() =>
                            setAction({ developer: d, status: 'Suspended' })
                          }
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          secondary
                          onClick={() =>
                            setAction({ developer: d, status: 'Active' })
                          }
                        >
                          Grant access
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="p-10 text-center text-sm text-slate-500">
              No developers match these filters.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between border-t p-4 text-xs text-slate-500">
          <span>
            {filtered.length
              ? `${(current - 1) * 8 + 1}–${Math.min(current * 8, filtered.length)} of ${filtered.length}`
              : '0 developers'}
          </span>
          <div className="flex items-center gap-3">
            <Button
              secondary
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            {current} / {pages}
            <Button
              secondary
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      {action && (
        <Modal title="Update developer access" onClose={() => setAction(null)}>
          <p className="text-sm leading-6">
            Set {action.developer.company} to <strong>{action.status}</strong>{' '}
            for {api.name}? This updates access for the selected developer.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button secondary onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              danger={
                action.status === 'Suspended' || action.status === 'Rejected'
              }
              onClick={() => {
                onChange(
                  {
                    developers: api.developers.map((d) =>
                      d.id === action.developer.id
                        ? { ...d, status: action.status }
                        : d,
                    ),
                  },
                  'Developer access updated.',
                )
                setAction(null)
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
