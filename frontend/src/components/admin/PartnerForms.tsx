import { useState } from 'react'
import type { PartnerProfile } from './partners'
import { safeWebsite } from './partners'
import { PartnerButton, PartnerField } from './PartnerUi'
export default function PartnerForms({
  initial,
  mode,
  onSave,
  onCancel,
}: {
  initial: PartnerProfile
  mode: 'add' | 'company' | 'contact'
  onSave: (value: PartnerProfile) => string | void
  onCancel: () => void
}) {
  const [value, setValue] = useState<PartnerProfile>(() => ({
    ...initial,
    contact: { ...initial.contact },
  }))
  const [error, setError] = useState('')
  function update(field: keyof Omit<PartnerProfile, 'contact'>, text: string) {
    setValue((current) => ({ ...current, [field]: text }))
    setError('')
  }
  function contact(field: keyof PartnerProfile['contact'], text: string) {
    setValue((current) => ({
      ...current,
      contact: { ...current.contact, [field]: text },
    }))
    setError('')
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const next = {
          ...value,
          name: value.name.trim(),
          registration: value.registration.trim(),
          industry: value.industry.trim(),
          description: value.description.trim(),
          contact: {
            name: value.contact.name.trim(),
            role: value.contact.role.trim(),
            email: value.contact.email.trim(),
            phone: value.contact.phone.trim(),
          },
        }
        if (
          mode !== 'contact' &&
          (!next.name || !next.registration || !next.industry)
        ) {
          setError('Complete the company name, registration and industry.')
          return
        }
        if (mode !== 'contact' && !safeWebsite(value.website)) {
          setError(
            'Enter a valid HTTP or HTTPS website without embedded credentials.',
          )
          return
        }
        if (
          mode !== 'company' &&
          (!next.contact.name || !next.contact.role || !next.contact.email)
        ) {
          setError('Complete the primary contact details.')
          return
        }
        if (mode !== 'contact') next.website = safeWebsite(value.website)!
        const result = onSave(next)
        if (result) setError(result)
      }}
      className="space-y-4"
    >
      {mode !== 'contact' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <PartnerField label="Company name *">
              <input
                autoFocus
                required
                maxLength={100}
                value={value.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </PartnerField>
            <PartnerField label="Registration number *">
              <input
                required
                maxLength={50}
                value={value.registration}
                onChange={(e) => update('registration', e.target.value)}
              />
            </PartnerField>
            <PartnerField label="Company type">
              <select
                value={value.tier}
                onChange={(e) => update('tier', e.target.value)}
              >
                {['Business', 'Startup', 'Enterprise', 'Starter'].map(
                  (tier) => (
                    <option key={tier}>{tier}</option>
                  ),
                )}
              </select>
            </PartnerField>
            <PartnerField label="Industry *">
              <input
                required
                maxLength={80}
                value={value.industry}
                onChange={(e) => update('industry', e.target.value)}
              />
            </PartnerField>
            <PartnerField label="Company size">
              <select
                value={value.size}
                onChange={(e) => update('size', e.target.value)}
              >
                {[
                  '1–10 employees',
                  '11–50 employees',
                  '50–200 employees',
                  '201–500 employees',
                  '501+ employees',
                ].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </PartnerField>
            <PartnerField label="Website *">
              <input
                type="url"
                required
                placeholder="https://company.example.com"
                value={value.website}
                onChange={(e) => update('website', e.target.value)}
              />
            </PartnerField>
          </div>
          <PartnerField label="Description">
            <textarea
              rows={3}
              maxLength={1000}
              value={value.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </PartnerField>
        </>
      )}
      {mode !== 'company' && (
        <>
          <h3 className="border-t border-slate-100 pt-4 text-sm font-semibold">
            Primary contact
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <PartnerField label="Full name *">
              <input
                required
                maxLength={100}
                value={value.contact.name}
                onChange={(e) => contact('name', e.target.value)}
              />
            </PartnerField>
            <PartnerField label="Role *">
              <input
                required
                maxLength={100}
                value={value.contact.role}
                onChange={(e) => contact('role', e.target.value)}
              />
            </PartnerField>
            <PartnerField label="Email *">
              <input
                required
                type="email"
                value={value.contact.email}
                onChange={(e) => contact('email', e.target.value)}
              />
            </PartnerField>
            <PartnerField label="Phone">
              <input
                type="tel"
                value={value.contact.phone}
                onChange={(e) => contact('phone', e.target.value)}
              />
            </PartnerField>
          </div>
        </>
      )}
      {mode === 'add' && (
        <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-700">
          The partner will be added as Pending. No invitation or email will be
          sent.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <PartnerButton secondary onClick={onCancel}>
          Cancel
        </PartnerButton>
        <PartnerButton type="submit">
          {mode === 'add' ? 'Add partner' : 'Save changes'}
        </PartnerButton>
      </div>
    </form>
  )
}
