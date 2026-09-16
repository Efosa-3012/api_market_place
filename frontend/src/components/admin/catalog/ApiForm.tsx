import { useState } from 'react'
import type { ApiInfo } from './model'
import { categories } from './model'
import { Button, Field } from './ui'
export default function ApiForm({
  initial,
  onSave,
  onClose,
}: {
  initial: ApiInfo
  onSave: (info: ApiInfo) => string | void
  onClose: () => void
}) {
  const [value, setValue] = useState<ApiInfo>({
    name: initial.name,
    category: initial.category,
    tagline: initial.tagline,
    description: initial.description,
    owner: initial.owner,
    version: initial.version,
  })
  const [error, setError] = useState('')
  function update(key: keyof ApiInfo, text: string) {
    setValue((current) => ({ ...current, [key]: text }))
    setError('')
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const clean = Object.fromEntries(
          Object.entries(value).map(([key, v]) => [
            key,
            typeof v === 'string' ? v.trim() : v,
          ]),
        ) as ApiInfo
        if (
          !clean.name ||
          !clean.description ||
          !clean.owner ||
          !clean.version
        ) {
          setError('Complete all required fields.')
          return
        }
        const result = onSave(clean)
        if (result) setError(result)
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="API name *">
          <input
            required
            autoFocus
            maxLength={100}
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select
            value={value.category}
            onChange={(e) => update('category', e.target.value)}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Owner *">
          <input
            required
            maxLength={100}
            value={value.owner}
            onChange={(e) => update('owner', e.target.value)}
          />
        </Field>
        <Field label="Version *">
          <input
            required
            maxLength={30}
            value={value.version}
            onChange={(e) => update('version', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Short summary">
        <input
          maxLength={200}
          value={value.tagline}
          onChange={(e) => update('tagline', e.target.value)}
        />
      </Field>
      <Field label="Description *">
        <textarea
          required
          rows={4}
          maxLength={3000}
          value={value.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </Field>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button secondary onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save API</Button>
      </div>
    </form>
  )
}
