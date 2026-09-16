import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PartnerDetails, {
  AdditionalContacts,
} from '../../components/admin/PartnerDetails'
import type { PartnerDialog } from '../../components/admin/PartnerDetails'
import PartnerForms from '../../components/admin/PartnerForms'
import {
  PartnerBadge,
  PartnerButton,
  PartnerField,
  PartnerModal,
} from '../../components/admin/PartnerUi'
import {
  changeAccess,
  changeStatus,
  disableAccess,
  emptyProfile,
  enabledCount,
  formattedDate,
  initialPartners,
  makePartner,
  partnerApis,
  partnersCsv,
  statuses,
} from '../../components/admin/partners'
import type {
  Partner,
  PartnerProfile,
  PartnerStatus,
} from '../../components/admin/partners'

export default function AdminDevelopersPage() {
  const [partners, setPartners] = useState<Partner[]>(initialPartners)
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('partner')
  const partner = partners.find((item) => item.id === selectedId)
  const view = params.get('view') === 'activity' ? 'activity' : 'overview'
  const [filter, setFilter] = useState<'All' | PartnerStatus>('All')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<PartnerDialog | 'add' | null>(null)
  const [reason, setReason] = useState('')
  const counts = Object.fromEntries(
    statuses.map((status) => [
      status,
      partners.filter((item) => item.status === status).length,
    ]),
  ) as Record<PartnerStatus, number>
  const filtered = partners.filter(
    (item) =>
      (filter === 'All' || item.status === filter) &&
      `${item.name} ${item.registration} ${item.website} ${item.contact.name}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / 8))
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * 8, current * 8)
  function select(id: string | null) {
    setNotice('')
    setModal(null)
    setParams((currentParams) => {
      const next = new URLSearchParams(currentParams)
      next.delete('view')
      if (id) next.set('partner', id)
      else next.delete('partner')
      return next
    })
  }
  function setView(nextView: 'overview' | 'activity') {
    setParams((currentParams) => {
      const next = new URLSearchParams(currentParams)
      next.set('view', nextView)
      return next
    })
  }
  function open(dialog: PartnerDialog | 'add') {
    setReason('')
    setModal(dialog)
  }
  function update(
    id: string,
    transform: (partner: Partner) => Partner,
    text: string,
  ) {
    const event = {
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      text,
    }
    setPartners((currentPartners) =>
      currentPartners.map((item) =>
        item.id === id
          ? { ...transform(item), activity: [event, ...item.activity] }
          : item,
      ),
    )
    setNotice(text)
  }
  function saveProfile(value: PartnerProfile) {
    if (
      modal !== 'contact' &&
      partners.some(
        (item) =>
          item.id !== (modal === 'add' ? undefined : partner?.id) &&
          item.registration.toLowerCase() === value.registration.toLowerCase(),
      )
    )
      return 'A partner with this registration number already exists.'
    if (modal === 'add') {
      const next = makePartner(
        value,
        crypto.randomUUID(),
        new Date().toISOString(),
      )
      setPartners((currentPartners) => [next, ...currentPartners])
      select(next.id)
      setNotice('Partner added. Application pending review.')
    } else if (partner) {
      update(
        partner.id,
        (currentPartner) => ({ ...currentPartner, ...value }),
        modal === 'contact'
          ? 'Primary contact updated.'
          : 'Company information updated.',
      )
    }
    setModal(null)
  }
  function access(
    api: string,
    environment: 'sandbox' | 'production',
    enabled: boolean,
  ) {
    if (!partner) return
    update(
      partner.id,
      (item) => changeAccess(item, api, environment, enabled),
      `${partnerApis.find((item) => item.id === api)?.name} ${environment} access ${enabled ? 'enabled' : 'disabled'}.`,
    )
  }
  function confirm() {
    if (!partner) return
    if (modal === 'disable')
      update(partner.id, disableAccess, 'All configured API access disabled.')
    if (modal === 'suspend')
      update(
        partner.id,
        (item) => changeStatus(item, 'Suspended'),
        `Partner suspended.${reason.trim() ? ` Reason: ${reason.trim()}` : ''}`,
      )
    if (modal === 'resume')
      update(
        partner.id,
        (item) => changeStatus(item, item.previousStatus ?? 'Pending'),
        'Partner resumed to its previous application status.',
      )
    if (modal === 'approve')
      update(
        partner.id,
        (item) => changeStatus(item, 'Active'),
        'Application approved. Production access can now be configured.',
      )
    if (modal === 'info') {
      if (!reason.trim()) return
      update(
        partner.id,
        (item) => changeStatus(item, 'More info requested'),
        `More information requested: ${reason.trim()}`,
      )
    }
    setModal(null)
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([partnersCsv(filtered)], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'partners.csv'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Exported ${filtered.length} matching partners.`)
  }
  const actionText: Record<string, string> = {
    disable: 'Disable all API access?',
    suspend: 'Suspend partner?',
    resume: 'Resume partner?',
    approve: 'Approve partner?',
    info: 'Request more information',
  }
  const descriptions: Record<string, string> = {
    disable:
      'All sandbox and production switches will be turned off. The partner’s approval status will remain unchanged.',
    suspend:
      'All effective access will be blocked. Configured permissions are retained so they can be restored when the partner resumes.',
    resume:
      'Restore the previous application status and its configured permissions.',
    approve:
      'Mark this application as approved. Production permissions remain off until you explicitly enable them.',
    info: 'Record the information needed to continue the review.',
  }
  return (
    <div className="min-h-[calc(100dvh-64px)] p-4 sm:p-6 lg:p-8 [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-blue-600 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-blue-600 [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-blue-600 [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-blue-600">
      <div className="mx-auto max-w-[1450px] space-y-5">
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700"
          >
            {notice}
          </p>
        )}
        {selectedId && !partner ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8">
            <h1 className="text-xl font-semibold">Partner not found</h1>
            <p className="my-4 text-sm text-slate-500">
              The requested partner could not be found.
            </p>
            <PartnerButton onClick={() => select(null)}>
              Back to partners
            </PartnerButton>
          </div>
        ) : partner ? (
          <PartnerDetails
            key={partner.id}
            partner={partner}
            view={view}
            onView={setView}
            onBack={() => select(null)}
            onDialog={open}
            onAccess={access}
            onNotes={(notes) =>
              update(
                partner.id,
                (item) => ({ ...item, notes }),
                'Internal notes saved.',
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#10243a]">
                  Partners
                </h1>
                <p className="mt-2 text-sm text-[#465b78]">
                  Review and approve fintech applications before they can
                  integrate
                </p>
              </div>
              <div className="flex gap-2">
                <PartnerButton secondary onClick={exportCsv}>
                  ⇩ Export CSV
                </PartnerButton>
                <PartnerButton onClick={() => open('add')}>
                  Add partner
                </PartnerButton>
              </div>
            </div>
            <section
              aria-label="Partner applications"
              className="overflow-hidden rounded-xl border border-[#e1e7f0] bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div
                  role="group"
                  aria-label="Partner status filter"
                  className="flex flex-wrap gap-1"
                >
                  {(['All', ...statuses] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={filter === status}
                      onClick={() => {
                        setFilter(status)
                        setPage(1)
                      }}
                      className={`min-h-10 rounded px-3 text-sm ${filter === status ? 'bg-blue-50 font-medium text-[#1010ff]' : 'text-[#465b78] hover:bg-slate-50'}`}
                    >
                      {status} (
                      {status === 'All' ? partners.length : counts[status]})
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="partner-search">
                  Search partners
                </label>
                <input
                  id="partner-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search..."
                  className="h-10 w-full rounded-lg border border-[#e5e9f0] bg-[#f8f9fb] px-3 text-sm placeholder:text-slate-400 sm:w-44"
                />
              </div>
              <p role="status" className="sr-only">
                {filtered.length} matching partners
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[690px] text-left text-xs">
                  <thead className="border-y border-[#e5e9f0] bg-[#f8f9fb] text-[10px] uppercase tracking-wider text-[#52627d]">
                    <tr>
                      {[
                        'Partner & registration',
                        'Company type',
                        'API access',
                        'Applied',
                        'Status',
                      ].map((label) => (
                        <th key={label} className="px-4 py-4 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-[#fafcff]"
                      >
                        <th scope="row" className="px-4 py-3 font-normal">
                          <button
                            onClick={() => select(item.id)}
                            className="text-left text-sm font-semibold text-[#151515] hover:text-blue-600 hover:underline"
                          >
                            {item.name}
                          </button>
                          <p className="mt-1 text-[11px] text-[#465b78]">
                            {item.registration}
                          </p>
                          <p className="mt-1 text-[11px] text-[#465b78]">
                            {new URL(item.website).hostname}
                          </p>
                        </th>
                        <td className="px-4 py-3 text-[#52627d]">
                          {item.tier}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded border border-[#e9ecf1] bg-[#f7f8fa] px-3 py-2 font-mono text-[#52627d]">
                            {enabledCount(item)}{' '}
                            {enabledCount(item) === 1 ? 'API' : 'APIs'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#52627d]">
                          {formattedDate(item.registered)}
                        </td>
                        <td className="px-4 py-3">
                          <PartnerBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                    {!visible.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-10 text-center text-slate-500"
                        >
                          No partners match this search.{' '}
                          <button
                            onClick={() => {
                              setQuery('')
                              setFilter('All')
                              setPage(1)
                            }}
                            className="text-blue-600"
                          >
                            Reset filters
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e9f0] p-4 text-xs text-[#465b78]">
                <span>
                  Showing{' '}
                  <strong>
                    {filtered.length ? (current - 1) * 8 + 1 : 0} –{' '}
                    {Math.min(current * 8, filtered.length)}
                  </strong>{' '}
                  of <strong>{filtered.length}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Previous page"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                    className="size-9 rounded border border-slate-100 disabled:text-slate-300"
                  >
                    ‹
                  </button>
                  <span className="grid size-9 place-items-center rounded bg-[#1010ff] text-white">
                    {current}
                  </span>
                  <button
                    aria-label="Next page"
                    disabled={current === pages}
                    onClick={() => setPage(current + 1)}
                    className="size-9 rounded border border-slate-100 disabled:text-slate-300"
                  >
                    ›
                  </button>
                </div>
              </div>
            </section>
            <p className="text-[11px] text-slate-400">
              Review partner applications and manage access.
            </p>
          </>
        )}
        {modal === 'add' && (
          <PartnerModal title="Add partner" onClose={() => setModal(null)}>
            <PartnerForms
              initial={emptyProfile}
              mode="add"
              onSave={saveProfile}
              onCancel={() => setModal(null)}
            />
          </PartnerModal>
        )}
        {partner && (modal === 'company' || modal === 'contact') && (
          <PartnerModal
            title={
              modal === 'company'
                ? 'Edit company information'
                : 'Edit primary contact'
            }
            onClose={() => setModal(null)}
          >
            <PartnerForms
              initial={partner}
              mode={modal}
              onSave={saveProfile}
              onCancel={() => setModal(null)}
            />
          </PartnerModal>
        )}
        {partner && modal === 'contacts' && (
          <PartnerModal
            title="Additional contacts"
            onClose={() => setModal(null)}
          >
            <AdditionalContacts contacts={partner.additionalContacts} />
          </PartnerModal>
        )}
        {partner && modal && actionText[modal] && (
          <PartnerModal
            title={actionText[modal]}
            onClose={() => setModal(null)}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault()
                confirm()
              }}
              className="space-y-5"
            >
              <p className="text-sm leading-6 text-[#52627d]">
                {descriptions[modal]}
              </p>
              {(modal === 'suspend' || modal === 'info') && (
                <PartnerField
                  label={
                    modal === 'info'
                      ? 'Information required *'
                      : 'Reason (optional)'
                  }
                >
                  <textarea
                    rows={4}
                    required={modal === 'info'}
                    maxLength={2000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </PartnerField>
              )}
              <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                Confirm the requested change to this partner.
              </p>
              <div className="flex justify-end gap-3">
                <PartnerButton secondary onClick={() => setModal(null)}>
                  Cancel
                </PartnerButton>
                <PartnerButton
                  type="submit"
                  danger={modal === 'suspend' || modal === 'disable'}
                  disabled={modal === 'info' && !reason.trim()}
                >
                  Confirm
                </PartnerButton>
              </div>
            </form>
          </PartnerModal>
        )}
      </div>
    </div>
  )
}
