import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * The app's UI kit. Every surface — developer portal, bank pages, staff
 * console — builds from these so a button, a notice or an empty state looks
 * the same everywhere. Colours come from the tokens in index.css.
 *
 * Bank pages pass tone="bank" to the primary button; nothing else changes.
 */

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent'

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-red-700',
  neutral: 'text-body',
  accent: 'text-primary',
}

const TONE_CHIP: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  bad: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-slate-100 text-body ring-slate-500/20',
  accent: 'bg-blue-50 text-primary ring-blue-600/20',
}

const TONE_RULE: Record<Tone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-slate-300',
  accent: 'bg-primary',
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Panel({
  title,
  subtitle,
  action,
  footer,
  padded = true,
  children,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  footer?: ReactNode
  /** Turn off for tables, which manage their own edge-to-edge padding. */
  padded?: boolean
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`min-w-0 flex-1 ${padded ? 'px-5 pb-5' : 'pb-1'} ${title || action ? '' : padded ? 'pt-5' : 'pt-1'}`}>
        {children}
      </div>
      {footer && (
        <footer className="border-t border-canvas px-5 py-3 text-xs text-muted">{footer}</footer>
      )}
    </section>
  )
}

/**
 * A row of headline figures drawn as one block: the tiles sit edge to edge and
 * 1px of --color-line shows through the gaps, so four numbers read as one
 * instrument rather than four floating cards.
 */
export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  const cols = columns === 2 ? 'sm:grid-cols-2' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'
  return <div className={`tile-grid grid-cols-1 ${cols}`}>{children}</div>
}

/**
 * A headline figure, for use inside StatGrid. The label is a mono eyebrow, the
 * value is mono so digits line up across tiles, and the tone is a single dot —
 * enough to read severity at a glance without turning the row into a rainbow.
 */
export function StatTile({
  label,
  value,
  detail,
  tone = 'neutral',
  hint,
  children,
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: Tone
  /** Explains how the figure is derived — shown as a title attribute. */
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col bg-white p-5">
      <p className="eyebrow flex items-center gap-2" title={hint}>
        {tone !== 'neutral' && <span aria-hidden="true" className={`size-1.5 rounded-full ${TONE_RULE[tone]}`} />}
        {label}
      </p>
      <p className="mt-3.5 font-mono text-[30px] font-medium leading-none tabular-nums tracking-[-0.04em] text-ink">
        {value}
      </p>
      {detail && <p className="mt-2.5 text-[11.5px] leading-5 text-faint">{detail}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CHIP[tone]}`}
    >
      {children}
    </span>
  )
}

/** A status code, coloured by class and always monospaced so columns line up. */
export function StatusCode({ code }: { code: number }) {
  const tone: Tone = code >= 500 ? 'bad' : code >= 400 ? 'warn' : 'ok'
  return (
    <span className={`font-mono text-xs font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{code}</span>
  )
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className="inline-block min-w-[3.25rem] rounded border border-line bg-canvas px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold uppercase text-body">
      {method}
    </span>
  )
}

export function Button({
  children,
  onClick,
  secondary = false,
  danger = false,
  disabled = false,
  type = 'button',
  title,
  tone = 'primary',
  size = 'md',
  full = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  secondary?: boolean
  danger?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  title?: string
  /** Bank pages use navy; everywhere else the action blue. */
  tone?: 'primary' | 'bank'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  className?: string
}) {
  const style = danger
    ? 'border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-red-600'
    : secondary
      ? 'border-line bg-white text-body hover:bg-canvas focus-visible:outline-primary'
      : tone === 'bank'
        ? 'border-bank bg-bank text-white hover:bg-bank-hover focus-visible:outline-bank'
        : 'border-primary bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary'
  const sizing = size === 'sm' ? 'min-h-8 px-3 text-xs' : size === 'lg' ? 'min-h-12 px-6 text-base' : 'min-h-10 px-4 text-sm'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${full ? 'w-full' : ''} ${style} ${className}`}
    >
      {children}
    </button>
  )
}

/** Same look as Button, for navigation. */
export function ButtonLink({
  to,
  children,
  secondary = false,
  tone = 'primary',
  size = 'md',
  className = '',
  external = false,
}: {
  to: string
  children: ReactNode
  secondary?: boolean
  tone?: 'primary' | 'bank'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  external?: boolean
}) {
  const style = secondary
    ? 'border-line bg-white text-body hover:bg-canvas focus-visible:outline-primary'
    : tone === 'bank'
      ? 'border-bank bg-bank text-white hover:bg-bank-hover focus-visible:outline-bank'
      : 'border-primary bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary'
  const sizing = size === 'sm' ? 'min-h-8 px-3 text-xs' : size === 'lg' ? 'min-h-12 px-6 text-base' : 'min-h-10 px-4 text-sm'
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${sizing} ${style} ${className}`
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  )
}

/** Window / filter switcher. One control, so every dashboard scopes the same way. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-line bg-canvas p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Notice({
  tone = 'accent',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  const style =
    tone === 'bad'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : tone === 'ok'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-blue-200 bg-blue-50/70 text-body'
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm leading-6 ${style} ${className}`}>
      {children}
    </div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-sm text-xs leading-5 text-muted">{message}</p>
      {action}
    </div>
  )
}

export function Skeleton({ rows = 3, height = 'h-9' }: { rows?: number; height?: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-lg bg-canvas`} />
      ))}
    </div>
  )
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-xs leading-5 text-red-800">{message}</p>
      {onRetry && (
        <Button secondary onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(value)
          .then(() => setCopied(true))
          .catch(() => setCopied(false))
      }}
      className="cursor-pointer rounded border border-line px-2 py-0.5 text-[11px] font-medium text-body hover:bg-blue-50"
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export function CodeBlock({ text, title = 'Example' }: { text: string; title?: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-ink bg-ink">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="text-[11px] font-medium text-faint">{title}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(text).catch(() => {})}
          className="cursor-pointer rounded border border-white/20 px-2.5 py-1 text-[11px] font-medium text-line hover:bg-white/10"
        >
          Copy
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto p-4 text-[11px] leading-6 text-line" tabIndex={0}>
        <code>{text}</code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Charts
//
// Drawn straight to SVG against one scale, with room in the viewBox for the
// outermost labels so nothing clips. Small enough not to warrant a library.
// ---------------------------------------------------------------------------

/** Nearest "nice" number at or above `value`, so the y-axis tops out on a round figure. */
function niceCeiling(value: number) {
  if (value <= 5) return 5
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

export function AreaChart({
  points,
  height = 220,
  labelFor,
  valueLabel = 'calls',
}: {
  points: { bucket: string; calls: number; errors: number }[]
  height?: number
  labelFor: (iso: string) => string
  valueLabel?: string
}) {
  const gradientId = useId()
  const width = 720
  const pad = { top: 16, right: 12, bottom: 26, left: 44 }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom

  if (points.length === 0) {
    return <EmptyState title="No traffic yet" message="Calls will appear here as soon as the gateway sees them." />
  }

  const peak = niceCeiling(Math.max(...points.map((p) => p.calls), 1))
  const x = (i: number) => pad.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth)
  const y = (v: number) => pad.top + plotHeight - (v / peak) * plotHeight

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.calls).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.top + plotHeight} L${x(0).toFixed(1)},${pad.top + plotHeight} Z`
  const errorLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.errors).toFixed(1)}`).join(' ')

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(peak * f))
  const last = points[points.length - 1]!
  const hasErrors = points.some((p) => p.errors > 0)
  const total = points.reduce((sum, p) => sum + p.calls, 0)

  // Roughly five x labels, always including the first and last bucket.
  const step = Math.max(1, Math.round((points.length - 1) / 4))
  const xTicks = points.map((_, i) => i).filter((i) => i % step === 0 || i === points.length - 1)

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${total} ${valueLabel} over the selected period, peaking at ${peak}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0450ff" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#0450ff" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(value)}
              y2={y(value)}
              stroke="#e8edf5"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(value) + 3.5}
              textAnchor="end"
              className="fill-faint text-[11px]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : value}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="#0450ff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hasErrors && (
          <path d={errorLine} fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 3" strokeLinejoin="round" />
        )}

        <circle cx={x(points.length - 1)} cy={y(last.calls)} r="3.5" fill="#0450ff" />
        <circle cx={x(points.length - 1)} cy={y(last.calls)} r="7" fill="#0450ff" fillOpacity="0.15" />

        {xTicks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            className="fill-faint text-[11px]"
          >
            {labelFor(points[i]!.bucket)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded bg-primary" /> Total {valueLabel}
        </span>
        {hasErrors && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded border-t-2 border-dashed border-red-600" /> Rejected
          </span>
        )}
        <span className="ml-auto tabular-nums">Peak {peak.toLocaleString()} per bucket</span>
      </figcaption>
    </figure>
  )
}

/** Proportion bar for a ranked list — the share is the point, not the axis. */
export function ShareBar({ fraction, tone = 'accent' }: { fraction: number; tone?: Tone }) {
  const width = Math.max(fraction * 100, fraction > 0 ? 1.5 : 0)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
      <div className={`h-full rounded-full ${TONE_RULE[tone]}`} style={{ width: `${width}%` }} />
    </div>
  )
}

/**
 * A single stacked bar of consent states. A pie would hide the small slices —
 * revoked and expired are exactly the ones the bank wants to see.
 */
export function StackedBar({ segments }: { segments: { label: string; value: number; className: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) return <div className="h-2.5 w-full rounded-full bg-canvas" />
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-canvas">
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div
            key={s.label}
            className={s.className}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
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
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-2xl overflow-auto rounded-2xl border-0 bg-white p-6 text-ink shadow-xl backdrop:bg-bank/40"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="size-9 shrink-0 cursor-pointer rounded-lg hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export const inputClass =
  'h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60'

export function Field({
  id,
  label,
  hint,
  children,
  className = '',
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-muted">{hint}</p>}
    </div>
  )
}
