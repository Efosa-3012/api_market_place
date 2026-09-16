import { useState } from 'react'
import type { Contact, Partner } from './partners'
import {
  enabledCount,
  formattedDate,
  initials,
  partnerApis,
  safeWebsite,
} from './partners'
import {
  AccessSwitch,
  PartnerBadge,
  PartnerButton,
  PartnerPanel,
} from './PartnerUi'
export type PartnerDialog =
  | 'company'
  | 'contact'
  | 'contacts'
  | 'disable'
  | 'suspend'
  | 'resume'
  | 'approve'
  | 'info'
function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600">
        {initials(contact.name)}
      </span>
      <div className="min-w-0 text-xs leading-5">
        <strong className="block text-ink">{contact.name}</strong>
        <p className="text-body">{contact.role}</p>
        <p className="mt-2 break-all text-body">✉ {contact.email}</p>
        {contact.phone && <p className="text-body">{contact.phone}</p>}
      </div>
    </div>
  )
}
export function AdditionalContacts({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="space-y-5">
      {contacts.map((contact, index) => (
        <ContactCard key={`${contact.email}-${index}`} contact={contact} />
      ))}
      {!contacts.length && (
        <p className="text-sm text-slate-500">No additional contacts yet.</p>
      )}
    </div>
  )
}
export default function PartnerDetails({
  partner,
  view,
  onView,
  onBack,
  onDialog,
  onAccess,
  onNotes,
}: {
  partner: Partner
  view: 'overview' | 'activity'
  onView: (view: 'overview' | 'activity') => void
  onBack: () => void
  onDialog: (dialog: PartnerDialog) => void
  onAccess: (
    api: string,
    environment: 'sandbox' | 'production',
    enabled: boolean,
  ) => void
  onNotes: (notes: string) => void
}) {
  const [notes, setNotes] = useState(partner.notes)
  const website = safeWebsite(partner.website)
  const active = enabledCount(partner)
  const statusText =
    partner.status === 'Suspended'
      ? 'Access is suspended. Configured API permissions are preserved for resuming later.'
      : partner.status === 'Pending'
        ? 'Application awaiting review. Sandbox access can be configured; production requires approval.'
        : partner.status === 'More info requested'
          ? 'Additional information has been requested. Production remains unavailable.'
          : active
            ? `${active} API${active === 1 ? ' is' : 's are'} enabled for this approved partner.`
            : 'This partner is approved, but no APIs are currently enabled.'
  return (
    <div className="space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap gap-2 text-xs text-body"
      >
        <button onClick={onBack} className="text-muted hover:text-blue-600">
          ‹ Partners
        </button>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink">
          {partner.name}
        </span>
      </nav>
      <section className="rounded-xl bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-ink">
                {partner.name}
              </h1>
              <PartnerBadge status={partner.status} />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-body">
              {partner.description}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <details className="relative">
              <summary
                aria-label="Partner actions"
                className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-tint [&::-webkit-details-marker]:hidden"
              >
                ⋯
              </summary>
              <div className="absolute right-0 top-12 z-10 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <button
                  onClick={() => onDialog('company')}
                  className="block w-full rounded p-2 text-left text-xs hover:bg-blue-50"
                >
                  Edit company
                </button>
                {['Pending', 'More info requested'].includes(
                  partner.status,
                ) && (
                  <>
                    <button
                      onClick={() => onDialog('approve')}
                      className="block w-full rounded p-2 text-left text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Approve application
                    </button>
                    <button
                      onClick={() => onDialog('info')}
                      className="block w-full rounded p-2 text-left text-xs hover:bg-blue-50"
                    >
                      Request more info
                    </button>
                  </>
                )}
                <button
                  onClick={() => onView('activity')}
                  className="block w-full rounded p-2 text-left text-xs hover:bg-blue-50"
                >
                  View activity
                </button>
              </div>
            </details>
            {partner.status === 'Suspended' ? (
              <PartnerButton onClick={() => onDialog('resume')}>
                Resume access
              </PartnerButton>
            ) : (
              <PartnerButton
                danger
                disabled={!active}
                onClick={() => onDialog('disable')}
              >
                Disable Access
              </PartnerButton>
            )}
          </div>
        </div>
        <dl className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Industry', value: partner.industry },
            { label: 'Company size', value: partner.size },
            { label: 'Registered', value: formattedDate(partner.registered) },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[11px] uppercase text-body">
                {item.label}
              </dt>
              <dd className="mt-3">
                <span className="rounded bg-canvas px-2 py-1 text-xs">
                  {item.value}
                </span>
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] uppercase text-body">Website</dt>
            <dd className="mt-3 break-all text-xs">
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-canvas px-2 py-1"
                >
                  {new URL(website).hostname} ↗
                </a>
              ) : (
                'Not provided'
              )}
            </dd>
          </div>
        </dl>
      </section>
      <div
        role="group"
        aria-label="Partner detail view"
        className="flex gap-3 border-b border-line"
      >
        {(['overview', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            aria-pressed={tab === view}
            onClick={() => onView(tab)}
            className={`min-h-11 border-b-2 px-4 text-sm capitalize ${tab === view ? 'border-blue-600 font-medium' : 'border-transparent text-body'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {view === 'activity' ? (
        <PartnerPanel title="Activity">
          <p className="mb-5 text-xs text-slate-500">
            Review and access changes for this partner.
          </p>
          <ol className="divide-y divide-slate-100">
            {partner.activity.map((event) => (
              <li
                key={event.id}
                className="flex flex-col justify-between gap-2 py-4 sm:flex-row"
              >
                <p className="text-sm text-body">{event.text}</p>
                <time
                  dateTime={event.time}
                  className="shrink-0 text-xs text-slate-500"
                >
                  {new Date(event.time).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        </PartnerPanel>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
          <div className="min-w-0 space-y-5">
            <PartnerPanel
              title="Company information"
              action={
                <button
                  className="text-xs text-blue-600"
                  onClick={() => onDialog('company')}
                >
                  ✎ Edit
                </button>
              }
            >
              <dl className="grid gap-y-4 text-xs sm:grid-cols-[160px_1fr]">
                {[
                  { label: 'Company name', value: partner.name },
                  { label: 'Registration number', value: partner.registration },
                  { label: 'Company type', value: partner.tier },
                  { label: 'Industry', value: partner.industry },
                  { label: 'Company size', value: partner.size },
                ].map((item) => (
                  <div key={item.label} className="contents">
                    <dt className="text-body">{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
                <dt className="text-body">Website</dt>
                <dd className="break-all">
                  {website ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600"
                    >
                      {website} ↗
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </dd>
                <dt className="text-body">Description</dt>
                <dd className="leading-5 text-body">
                  {partner.description || 'No description provided.'}
                </dd>
                <dt className="text-body">Date registered</dt>
                <dd>{formattedDate(partner.registered)}</dd>
              </dl>
            </PartnerPanel>
            <PartnerPanel title="API access">
              <p className="mb-5 text-xs leading-5 text-muted">
                Enable or disable the APIs this partner can use.
                {partner.status !== 'Active' &&
                  ' Production access requires an approved, active partner.'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[470px] text-left text-xs">
                  <thead className="border-b border-slate-100 text-[11px] uppercase text-body">
                    <tr>
                      <th className="pb-4 pr-3">API</th>
                      <th className="pb-4 pr-4">
                        Sandbox
                        <br />
                        access
                      </th>
                      <th className="pb-4">
                        Production
                        <br />
                        access
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerApis.map((api) => {
                      const access = partner.access[api.id]
                      return (
                        <tr
                          key={api.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <th scope="row" className="py-4 pr-3 font-normal">
                            <div className="flex items-center gap-3">
                              <span
                                aria-hidden="true"
                                className={`grid size-8 shrink-0 place-items-center rounded-lg text-lg ${api.color}`}
                              >
                                {api.symbol}
                              </span>
                              <div>
                                <strong className="block">{api.name}</strong>
                                <p className="mt-1 text-[11px] text-body">
                                  {api.description}
                                </p>
                              </div>
                            </div>
                          </th>
                          <td className="py-4 pr-4">
                            <AccessSwitch
                              label={`${api.name} sandbox access`}
                              checked={
                                partner.status !== 'Suspended' && access.sandbox
                              }
                              disabled={partner.status === 'Suspended'}
                              onChange={(enabled) =>
                                onAccess(api.id, 'sandbox', enabled)
                              }
                            />
                          </td>
                          <td className="py-4">
                            <AccessSwitch
                              label={`${api.name} production access`}
                              checked={
                                partner.status === 'Active' && access.production
                              }
                              disabled={partner.status !== 'Active'}
                              onChange={(enabled) =>
                                onAccess(api.id, 'production', enabled)
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </PartnerPanel>
          </div>
          <div className="min-w-0 space-y-5">
            <PartnerPanel
              title="Primary contact"
              action={
                <button
                  className="text-xs text-blue-600"
                  onClick={() => onDialog('contact')}
                >
                  ✎ Edit
                </button>
              }
            >
              <ContactCard contact={partner.contact} />
            </PartnerPanel>
            <PartnerPanel
              title={`Additional contacts (${partner.additionalContacts.length})`}
              action={
                <button
                  className="text-xs text-blue-600"
                  onClick={() => onDialog('contacts')}
                >
                  View all
                </button>
              }
            >
              <AdditionalContacts
                contacts={partner.additionalContacts.slice(0, 1)}
              />
            </PartnerPanel>
            <PartnerPanel title="Partner status">
              <PartnerBadge status={partner.status} />
              <p className="my-4 text-xs leading-5 text-muted">
                {statusText}
              </p>
              <div className="flex flex-col gap-3">
                {['Pending', 'More info requested'].includes(
                  partner.status,
                ) && (
                  <>
                    <PartnerButton onClick={() => onDialog('approve')}>
                      Approve partner
                    </PartnerButton>
                    <PartnerButton secondary onClick={() => onDialog('info')}>
                      Request more information
                    </PartnerButton>
                  </>
                )}
                {partner.status === 'Suspended' ? (
                  <PartnerButton onClick={() => onDialog('resume')}>
                    Resume partner
                  </PartnerButton>
                ) : (
                  <button
                    onClick={() => onDialog('suspend')}
                    className="min-h-10 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Suspend Partner
                  </button>
                )}
              </div>
            </PartnerPanel>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <h2 className="text-xs font-semibold">ⓘ Next step</h2>
              <p className="mt-2 text-xs leading-5 text-body">
                {partner.status === 'Suspended'
                  ? 'Review this partner before resuming access.'
                  : partner.status === 'Active'
                    ? active
                      ? 'Review API permissions and monitor partner activity.'
                      : 'Enable API access for this approved partner.'
                    : 'Review the application before granting production access.'}
              </p>
            </div>
            <PartnerPanel title="Notes (optional)">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  onNotes(notes)
                }}
              >
                <label className="sr-only" htmlFor="partner-notes">
                  Internal notes
                </label>
                <textarea
                  id="partner-notes"
                  rows={4}
                  maxLength={4000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add internal notes about this partner..."
                  className="w-full resize-y rounded-lg border border-tint p-3 text-xs leading-5"
                />
                <div className="mt-4 flex justify-end">
                  <PartnerButton
                    type="submit"
                    secondary
                    disabled={notes === partner.notes}
                  >
                    Save
                  </PartnerButton>
                </div>
              </form>
            </PartnerPanel>
          </div>
        </div>
      )}
    </div>
  )
}
