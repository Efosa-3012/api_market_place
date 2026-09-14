import type { ReactNode } from 'react'

interface Props {
  id: string
  label: string
  children: ReactNode
}

export default function FormField({ id, label, children }: Props) {
  return (
    <div className="[&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-transparent [&_input]:bg-[#f7f7f8] [&_input]:px-4 [&_input]:text-sm [&_input]:outline-none [&_input::placeholder]:text-[#8195b0] [&_input:focus]:border-blue-600 [&_input:focus]:ring-2 [&_input:focus]:ring-blue-100 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-transparent [&_select]:bg-[#f7f7f8] [&_select]:px-4 [&_select]:text-sm [&_select]:outline-none [&_select:focus]:border-blue-600 [&_textarea]:min-h-16 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-transparent [&_textarea]:bg-[#f7f7f8] [&_textarea]:p-3 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea::placeholder]:text-[#8195b0] [&_textarea:focus]:border-blue-600">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-[#151c2d]"
      >
        {label}
      </label>

      {children}
    </div>
  )
}