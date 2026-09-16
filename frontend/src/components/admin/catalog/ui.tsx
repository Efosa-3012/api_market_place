import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-xl border border-[#dfe6f2] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-[#657790]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
export function Button({
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
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'border-red-600 bg-red-600 text-white' : secondary ? 'border-[#dbe4f1] bg-white text-[#405371] hover:bg-blue-50' : 'border-[#0450ff] bg-[#0450ff] text-white hover:bg-blue-700'}`}
    >
      {children}
    </button>
  )
}
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-xs font-medium text-[#465b78]">
      {label}
      <span className="mt-2 block [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#dfe6f2] [&_input]:bg-white [&_input]:px-3 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dfe6f2] [&_select]:bg-white [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#dfe6f2] [&_textarea]:p-3">
        {children}
      </span>
    </label>
  )
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[11px] ${['Published', 'Live', 'Active'].includes(value) ? 'bg-emerald-50 text-emerald-700' : ['Deprecated', 'Disabled', 'Suspended', 'Archived', 'Rejected'].includes(value) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}
    >
      {value}
    </span>
  )
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs leading-5 text-[#405371]">
      ⓘ {children}
    </div>
  )
}
export function Modal({
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
    const d = ref.current
    d?.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-2xl overflow-auto rounded-2xl border-0 bg-white p-6 text-[#142033] shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="size-8 rounded hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Copy({ text, dark = false }: { text: string; dark?: boolean }) {
  const [notice, setNotice] = useState('')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Copied')
    } catch {
      setNotice('Copy unavailable; select the text.')
    }
  }
  return (
    <div
      className={`overflow-hidden rounded-lg border ${dark ? 'border-slate-700 bg-[#172233] text-slate-200' : 'border-[#dfe6f2] bg-[#f8faff] text-blue-600'}`}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="text-[10px]">{dark ? 'HTTP' : 'Base URL'}</span>
        <button
          onClick={() => void copy()}
          className="rounded px-2 py-1 text-[10px]"
        >
          Copy
        </button>
      </div>
      <pre
        tabIndex={0}
        className="overflow-auto px-3 pb-3 text-[11px] leading-5"
      >
        <code>{text}</code>
      </pre>
      {notice && (
        <p role="status" className="px-3 pb-2 text-[10px]">
          {notice}
        </p>
      )}
    </div>
  )
}
export function Switch({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full disabled:opacity-40 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span
        className={`size-5 rounded-full bg-white shadow ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
export function Pairs({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-2 py-3 text-xs sm:grid-cols-[140px_1fr]"
        >
          <dt className="text-[#526783]">{label}</dt>
          <dd className="min-w-0 break-words leading-5">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
