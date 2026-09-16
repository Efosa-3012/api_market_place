import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Role = 'Reviewer' | 'Catalog Admin' | 'Compliance Reviewer' | 'Read-only'
type Member = {
  id: string
  name: string
  email: string
  role: Role
  status: 'Active' | 'Invited'
  lastActive: string
  invitedAt?: string
  self?: boolean
}
const roles: {
  name: Role
  description: string
  color: string
  icon: string
}[] = [
  {
    name: 'Reviewer',
    description:
      'Approve or reject partner applications. No access to API Catalog or Management.',
    color: 'border-blue-100 bg-blue-50/40',
    icon: '◎',
  },
  {
    name: 'Catalog Admin',
    description:
      'Publish/unpublish APIs, set pricing and gateway policy in API Management. Cannot approve partners.',
    color: 'border-emerald-100 bg-emerald-50/50',
    icon: '▤',
  },
  {
    name: 'Compliance Reviewer',
    description:
      'View partner and API activity for compliance purposes. Read-only access.',
    color: 'border-purple-100 bg-purple-50/50',
    icon: '▣',
  },
  {
    name: 'Read-only',
    description: 'View everything on the console but cannot make changes.',
    color: 'border-slate-200 bg-slate-50',
    icon: '♙',
  },
]
const seed: Member[] = [
  {
    id: 'self',
    name: 'Idris Zainab',
    email: 'idris@example.com',
    role: 'Reviewer',
    status: 'Active',
    lastActive: 'Today, 10:24 AM',
    self: true,
  },
  {
    id: 'tobi',
    name: 'Tobi Eze',
    email: 'tobi@example.com',
    role: 'Catalog Admin',
    status: 'Active',
    lastActive: 'Sep 14, 2026',
  },
  {
    id: 'ngozi',
    name: 'Ngozi Chukwu',
    email: 'ngozi@example.com',
    role: 'Compliance Reviewer',
    status: 'Active',
    lastActive: 'Sep 12, 2026',
  },
  {
    id: 'femi',
    name: 'Femi Abiola',
    email: 'femi@example.com',
    role: 'Read-only',
    status: 'Active',
    lastActive: 'Sep 10, 2026',
  },
  {
    id: 'ronke',
    name: 'Ronke Jaiyeola',
    email: 'ronke@example.com',
    role: 'Catalog Admin',
    status: 'Invited',
    lastActive: '',
    invitedAt: '2026-09-15T12:00:00Z',
  },
  {
    id: 'kemi',
    name: 'Kemi Mohammed',
    email: 'kemi@example.com',
    role: 'Read-only',
    status: 'Active',
    lastActive: 'Sep 14, 2026',
  },
]
const inputClass =
  'mt-2 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink'
const primary =
  'rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
const secondary =
  'rounded-lg border border-line bg-white px-4 py-2.5 text-xs font-semibold text-body hover:bg-slate-50'
const avatarColors = [
  'bg-blue-100 text-blue-600',
  'bg-indigo-100 text-indigo-600',
  'bg-rose-100 text-rose-600',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-sky-100 text-sky-700',
]
function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-labelledby="staff-dialog-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-2xl bg-white p-6 text-ink shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id="staff-dialog-title" className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="size-8 rounded hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
export default function AdminSettingsPage() {
  const [members, setMembers] = useState<Member[]>(seed)
  const [invite, setInvite] = useState(false),
    [editing, setEditing] = useState<Member | null>(null),
    [removing, setRemoving] = useState<Member | null>(null)
  const [notice, setNotice] = useState('')
  function resend(member: Member) {
    if (member.status !== 'Invited' || member.self) return
    const now = new Date().toISOString()
    setMembers((current) =>
      current.map((m) => (m.id === member.id ? { ...m, invitedAt: now } : m)),
    )
    setNotice(
      `Invitation for ${member.name} refreshed.`,
    )
  }
  const active = members.filter((m) => m.status === 'Active').length,
    pending = members.length - active
  return (
    <div className="min-h-[calc(100dvh-4rem)] min-w-0 bg-canvas p-4 text-ink sm:p-6 xl:p-9">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
          <p className="mt-1 max-w-sm text-sm leading-6 text-body">
            Internal access — who at Stanbic IBTC can do
            <br className="hidden sm:block" /> what on this console.
          </p>
        </div>
        <button
          type="button"
          className={primary}
          onClick={() => setInvite(true)}
        >
          Invite staff member
        </button>
      </header>
      {notice && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            ✕
          </button>
        </div>
      )}
      <section
        aria-labelledby="staff-heading"
        className="overflow-hidden rounded-xl border border-line bg-white"
      >
        <div className="p-4">
          <h2 id="staff-heading" className="text-sm font-semibold">
            Staff access
          </h2>
          <p className="mt-1 text-xs text-muted">
            {active} {active === 1 ? 'person has' : 'people have'} access to
            this console
            {pending
              ? ` · ${pending} pending ${pending === 1 ? 'invitation' : 'invitations'}`
              : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="border-y border-line bg-canvas text-[11px] uppercase tracking-wide text-body">
              <tr>
                {[
                  'Member',
                  'Console role',
                  'Status',
                  'Last active',
                  'Actions',
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-4 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr
                  key={member.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <th scope="row" className="px-6 py-4 font-normal">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium ${avatarColors[index % avatarColors.length]}`}
                      >
                        {member.name
                          .split(/\s+/)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span>
                        {member.name}
                        {member.self && (
                          <span className="text-body"> (you)</span>
                        )}
                      </span>
                    </div>
                  </th>
                  <td className="px-4 py-4">
                    <span className="inline-block rounded bg-canvas px-2.5 py-1.5 text-[11px]">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-body'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      {member.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-body">
                    {member.status === 'Invited'
                      ? `Invited ${dateLabel(member.invitedAt!)}`
                      : member.lastActive}
                  </td>
                  <td className="px-4 py-4">
                    {member.self ? (
                      <span
                        className="text-slate-400"
                        aria-label="Your access cannot be changed here"
                      >
                        —
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            member.status === 'Invited'
                              ? resend(member)
                              : setRemoving(member)
                          }
                          className="text-blue-600 hover:underline"
                        >
                          {member.status === 'Invited' ? 'Resend' : 'Remove'}
                          <span className="sr-only"> {member.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(member)}
                          className="rounded p-2 font-bold text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          aria-label={`Manage ${member.name}`}
                        >
                          ⋯
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section
        aria-labelledby="roles-heading"
        className="mt-4 rounded-xl border border-line bg-white p-6"
      >
        <h2 id="roles-heading" className="text-sm font-semibold">
          What each role can do
        </h2>
        <p className="mt-1 text-xs text-muted">
          Reference for what to grant when inviting someone.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4 xl:grid-cols-4">
          {roles.map((role, index) => (
            <article
              key={role.name}
              className={`rounded-xl border p-4 ${role.color}`}
            >
              <div
                aria-hidden="true"
                className={`mb-3 grid size-7 place-items-center rounded-lg text-lg ${['bg-blue-600 text-white', 'bg-emerald-500 text-white', 'bg-purple-500 text-white', 'bg-slate-200 text-slate-600'][index]}`}
              >
                {role.icon}
              </div>
              <h3 className="text-sm font-semibold">{role.name}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                {role.description}
              </p>
            </article>
          ))}
        </div>
      </section>
      {invite && (
        <Dialog title="Invite staff member" onClose={() => setInvite(false)}>
          <StaffForm
            onCancel={() => setInvite(false)}
            onSave={(value) => {
              if (
                members.some(
                  (m) => m.email.toLowerCase() === value.email.toLowerCase(),
                )
              )
                return 'This email already has access or a pending invitation.'
              const now = new Date().toISOString()
              setMembers((current) => [
                ...current,
                {
                  ...value,
                  id: crypto.randomUUID(),
                  status: 'Invited',
                  lastActive: '',
                  invitedAt: now,
                },
              ])
              setInvite(false)
              setNotice(
                `Invitation for ${value.name} created.`,
              )
            }}
          />
        </Dialog>
      )}
      {editing && (
        <Dialog title="Manage staff access" onClose={() => setEditing(null)}>
          <StaffForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onRemove={() => {
              setRemoving(editing)
              setEditing(null)
            }}
            onSave={(value) => {
              if (editing.self) return 'You cannot change your own access here.'
              setMembers((current) =>
                current.map((m) =>
                  m.id === editing.id ? { ...m, role: value.role } : m,
                ),
              )
              setEditing(null)
              setNotice(`Role for ${editing.name} updated.`)
            }}
          />
        </Dialog>
      )}
      {removing && (
        <Dialog
          title={
            removing.status === 'Invited'
              ? 'Cancel invitation?'
              : 'Remove staff access?'
          }
          onClose={() => setRemoving(null)}
        >
          <p className="text-sm leading-6">
            {removing.status === 'Invited'
              ? `Cancel the pending invitation for ${removing.name}?`
              : `Remove ${removing.name} from this console?`}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Confirm this change to staff access.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button className={secondary} onClick={() => setRemoving(null)}>
              Keep {removing.status === 'Invited' ? 'invitation' : 'access'}
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
              onClick={() => {
                if (removing.self) return
                setMembers((current) =>
                  current.filter((m) => m.id !== removing.id),
                )
                setNotice(
                  `${removing.name}: ${removing.status === 'Invited' ? 'invitation cancelled' : 'access removed'}.`,
                )
                setRemoving(null)
              }}
            >
              {removing.status === 'Invited'
                ? 'Cancel invitation'
                : 'Remove access'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
function StaffForm({
  initial,
  onSave,
  onCancel,
  onRemove,
}: {
  initial?: Member
  onSave: (value: Pick<Member, 'name' | 'email' | 'role'>) => string | void
  onCancel: () => void
  onRemove?: () => void
}) {
  const [name, setName] = useState(initial?.name ?? ''),
    [email, setEmail] = useState(initial?.email ?? ''),
    [role, setRole] = useState<Role>(initial?.role ?? 'Read-only'),
    [error, setError] = useState('')
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError('Enter the staff member’s name.')
          return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          setError('Enter a valid email address.')
          return
        }
        const problem = onSave({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        })
        if (problem) setError(problem)
      }}
    >
      <label className="block text-xs font-medium text-body">
        Full name
        <input
          autoFocus={!initial}
          required
          readOnly={Boolean(initial)}
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-body">
        Work email
        <input
          type="email"
          required
          readOnly={Boolean(initial)}
          maxLength={254}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium text-body">
        Console role
        <select
          autoFocus={Boolean(initial)}
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className={inputClass}
        >
          {roles.map((r) => (
            <option key={r.name}>{r.name}</option>
          ))}
        </select>
      </label>
      <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-body">
        {roles.find((r) => r.name === role)?.description}
      </p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mr-auto text-xs text-red-600"
          >
            {initial?.status === 'Invited'
              ? 'Cancel invitation'
              : 'Remove access'}
          </button>
        )}
        <button type="button" className={secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={primary}>
          {initial ? 'Save role' : 'Create invitation'}
        </button>
      </div>
    </form>
  )
}
