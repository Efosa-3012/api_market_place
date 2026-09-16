import type { ConsentBreakdown, ConsentStatus } from '../../lib/admin'
import { relativeTime } from '../../lib/admin'
import { Chip, EmptyState, Panel, StackedBar } from '../dash/ui'

/**
 * The consent ledger — what makes this an open banking platform rather than an
 * API gateway with a login.
 *
 * Every row is a customer decision: who granted access to which partner, and
 * who took it back. `revoked_by` distinguishes a customer changing their mind
 * from the bank deactivating a partner, which is the difference between a
 * normal event and an incident.
 */

const STATUS_STYLE: Record<ConsentStatus, { label: string; bar: string; dot: string }> = {
  authorised: { label: 'Active', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  awaiting_authorisation: { label: 'Awaiting customer', bar: 'bg-amber-400', dot: 'bg-amber-400' },
  revoked: { label: 'Revoked', bar: 'bg-red-500', dot: 'bg-red-500' },
  expired: { label: 'Expired', bar: 'bg-slate-400', dot: 'bg-slate-400' },
  rejected: { label: 'Declined', bar: 'bg-slate-300', dot: 'bg-slate-300' },
}

const ORDER: ConsentStatus[] = ['authorised', 'awaiting_authorisation', 'revoked', 'expired', 'rejected']

/** Who ended a consent, in the words a reviewer would use. */
function revokedByLabel(by: string | null) {
  if (by === 'customer') return 'Customer withdrew access'
  if (by === 'client_deactivated') return 'Partner app deactivated'
  if (by === 'bank') return 'Withdrawn by the bank'
  if (by === 'developer') return 'Developer reset the sandbox'
  return 'Access removed'
}

export default function ConsentPanel({ consents }: { consents: ConsentBreakdown }) {
  const counts = new Map(consents.data.map((row) => [row.status, row.count]))
  const segments = ORDER.map((status) => ({
    label: STATUS_STYLE[status].label,
    value: counts.get(status) ?? 0,
    className: STATUS_STYLE[status].bar,
  }))

  const live = counts.get('authorised') ?? 0
  const revoked = counts.get('revoked') ?? 0

  return (
    <Panel
      title="Consent ledger"
      subtitle="Every grant of access customers have made, and every one they have taken back."
      action={<Chip tone={live > 0 ? 'ok' : 'neutral'}>{live} live</Chip>}
    >
      <div className="flex flex-col gap-5">
        <div>
          <StackedBar segments={segments} />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
            {ORDER.filter((status) => (counts.get(status) ?? 0) > 0 || status === 'authorised').map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} />
                <dt className="min-w-0 truncate text-[11px] text-[#65758e]">{STATUS_STYLE[status].label}</dt>
                <dd className="ml-auto text-xs font-semibold tabular-nums text-[#142033]">
                  {counts.get(status) ?? 0}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] leading-5 text-[#8ea3c0]">
            {consents.total} consents on record. {revoked > 0 ? `${revoked} were withdrawn — ` : ''}
            a revoked consent stops the partner on its very next call, with no token to invalidate.
          </p>
        </div>

        <div className="border-t border-[#eef2f8] pt-4">
          <h3 className="text-xs font-semibold text-[#142033]">Latest decisions</h3>
          {consents.recent.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No consents yet" message="Customer decisions appear here as soon as they are made." />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {consents.recent.slice(0, 6).map((consent) => {
                const ended = consent.status === 'revoked' || consent.status === 'expired'
                const when = consent.revoked_at ?? consent.authorised_at ?? consent.created_at
                return (
                  <li key={consent.id} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_STYLE[consent.status].dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[#142033]">
                        <span className="font-medium">{consent.client_name}</span>
                        {consent.sandbox && <span className="ml-1.5 text-[10px] text-[#8ea3c0]">sandbox</span>}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-[#65758e]">
                        {ended
                          ? revokedByLabel(consent.revoked_by)
                          : consent.status === 'authorised'
                            ? `Shared ${consent.account_count ?? 0} ${consent.account_count === 1 ? 'account' : 'accounts'} · ${consent.scopes.length} ${consent.scopes.length === 1 ? 'scope' : 'scopes'}`
                            : STATUS_STYLE[consent.status].label}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-[#8ea3c0]">{relativeTime(when)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  )
}
