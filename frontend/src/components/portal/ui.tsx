import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#e1e8f2] bg-white p-5">
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#142033]">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-[#65758e]">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  secondary?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? 'border-[#dfe6f0] bg-white text-[#405371] hover:bg-blue-50' : 'border-[#0450ff] bg-[#0450ff] text-white hover:bg-[#003bd0]'}`}
    >
      {children}
    </button>
  )
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-[#405371]">
      <span aria-hidden="true" className="mr-2 text-blue-600">
        ⓘ
      </span>
      {children}
    </div>
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
    <label className="block min-w-0 text-xs font-medium text-[#142033]">
      {label}
      <span className="mt-2 block [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#d6deea] [&_input]:bg-white [&_input]:px-3 [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#d6deea] [&_select]:bg-white [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#d6deea] [&_textarea]:p-3">
        {children}
      </span>
    </label>
  )
}
export function CodeBlock({
  text,
  title = 'Example',
}: {
  text: string
  title?: string
}) {
  const [status, setStatus] = useState('')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('Copied')
    } catch {
      setStatus('Copy unavailable — select the text below.')
    }
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-lg bg-[#111927] text-[#d2dce9]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="cursor-pointer rounded border border-white/20 px-3 py-1"
        >
          Copy
        </button>
      </div>
      {status && (
        <p role="status" className="px-4 pt-2 text-xs text-emerald-300">
          {status}
        </p>
      )}
      <pre
        className="max-h-[460px] overflow-auto p-4 text-[11px] leading-6"
        tabIndex={0}
      >
        <code>{text}</code>
      </pre>
    </div>
  )
}
export function Badge({
  children,
  bad = false,
  amber = false,
}: {
  children: ReactNode
  bad?: boolean
  amber?: boolean
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${bad ? 'bg-red-50 text-red-700' : amber ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
    >
      {children}
    </span>
  )
}
export function Modal({
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
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-lg overflow-auto rounded-2xl border-0 bg-white p-6 text-[#142033] shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="size-9 cursor-pointer rounded hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
