import type { ReactNode } from 'react'

interface Props {
  id: string
  label: string
  children: ReactNode
}

export default function FormField({ id, label, children }: Props) {
  return (
    <div className="[&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-transparent [&_input]:bg-canvas [&_input]:px-4 [&_input]:text-sm [&_input]:outline-none [&_input::placeholder]:text-muted [&_input:focus]:border-blue-600 [&_input:focus]:ring-2 [&_input:focus]:ring-blue-100 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-transparent [&_select]:bg-canvas [&_select]:px-4 [&_select]:text-sm [&_select]:outline-none [&_select:focus]:border-blue-600 [&_textarea]:min-h-16 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-transparent [&_textarea]:bg-canvas [&_textarea]:p-3 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea::placeholder]:text-muted [&_textarea:focus]:border-blue-600">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-ink"
      >
        {label}
      </label>

      {children}
    </div>
  )
}