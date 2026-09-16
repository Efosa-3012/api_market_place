import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { PartnerStatus } from './partners'
export function PartnerPanel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[#dfe7f3] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#151515]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
export function PartnerBadge({ status }: { status: PartnerStatus }) {
  const colors: Record<PartnerStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700',
    Pending: 'bg-amber-50 text-amber-700',
    'More info requested': 'bg-indigo-50 text-indigo-700',
    Suspended: 'bg-red-50 text-red-700',
  }
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] ${colors[status]}`}
    >
      {status === 'More info requested' ? 'Info requested' : status}
    </span>
  )
}
export function PartnerButton({
  children,
  onClick,
  secondary = false,
  danger = false,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  secondary?: boolean
  danger?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'border-red-500 bg-red-500 text-white hover:bg-red-600' : secondary ? 'border-[#dfe7f3] bg-white text-[#405371] hover:bg-blue-50' : 'border-[#0450ff] bg-[#0450ff] text-white hover:bg-blue-700'}`}
    >
      {children}
    </button>
  )
}
export function PartnerModal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
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
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-xl overflow-auto rounded-2xl border-0 bg-white p-6 text-[#142033] shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="size-9 cursor-pointer rounded hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function PartnerField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-xs font-medium text-[#405371]">
      {label}
      <span className="mt-2 block [&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#dfe7f3] [&_input]:bg-white [&_input]:px-3 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dfe7f3] [&_select]:bg-white [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#dfe7f3] [&_textarea]:p-3">
        {children}
      </span>
    </label>
  )
}
export function AccessSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-[#0450ff]' : 'bg-[#e0e6ef]'}`}
    >
      <span
        className={`size-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
