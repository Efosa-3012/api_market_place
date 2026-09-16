import { useState } from 'react'
import type { CatalogApi, Pricing as PriceModel } from './model'
import { estimate, money, validatePricing } from './model'
import { Button, Field, Modal, Notice, Pairs, Panel } from './ui'
export default function Pricing({
  api,
  onChange,
}: {
  api: CatalogApi
  onChange: (patch: Partial<CatalogApi>, message: string) => void
}) {
  const [draft, setDraft] = useState({ ...api.pricing })
  const [editing, setEditing] = useState<'price' | 'tax' | null>(null)
  const [form, setForm] = useState({ ...draft })
  const [error, setError] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(api.pricing)
  function open(mode: 'price' | 'tax') {
    setForm({ ...draft })
    setError('')
    setEditing(mode)
  }
  function update(key: keyof PriceModel, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }))
  }
  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Panel
            title="Pricing Model"
            subtitle="Configure how this API is billed on the marketplace."
            action={
              <button
                onClick={() => open('price')}
                className="text-xs text-blue-600"
              >
                ✎ Edit
              </button>
            }
          >
            <Pairs
              items={[
                ['Model', draft.model],
                [
                  'Base Fee',
                  money(
                    draft.model === 'Free' ? 0 : draft.base,
                    draft.currency,
                  ),
                ],
                [
                  'Price per Call',
                  money(
                    draft.model === 'Pay-as-you-use' ? draft.perCall : 0,
                    draft.currency,
                  ),
                ],
                [
                  'Free Calls (Sandbox)',
                  `${draft.freeSandbox.toLocaleString()} calls/month`,
                ],
              ]}
            />
          </Panel>
          <Panel
            title="Currency & Taxes"
            subtitle="Set the currency and example tax treatment."
            action={
              <button
                onClick={() => open('tax')}
                className="text-xs text-blue-600"
              >
                ✎ Edit
              </button>
            }
          >
            <Pairs
              items={[
                ['Currency', draft.currency],
                ['Tax', `${draft.tax}% `],
                ['Tax Handling', draft.taxHandling],
              ]}
            />
          </Panel>
        </div>
        <Panel
          title="Usage Examples"
          subtitle="Examples recalculate from the current pricing draft."
        >
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="mb-3 text-xs font-semibold text-blue-600">
              Example calculations
            </h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-2">Calls</th>
                  <th className="py-2 text-right">Before added tax</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {[10000, 50000, 100000].map((calls) => {
                  const cost = estimate(draft, calls)
                  return (
                    <tr key={calls} className="border-t border-blue-100">
                      <td className="py-3">{calls.toLocaleString()}</td>
                      <td className="py-3 text-right">
                        {money(cost.subtotal, draft.currency)}
                      </td>
                      <td className="py-3 text-right">
                        {money(cost.total, draft.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[10px] leading-5 text-slate-500">
              Production usage examples. Sandbox allowance is separate.
              Subscription examples use a flat base fee; included tax is not
              added a second time.
            </p>
          </div>
        </Panel>
      </div>
      <Notice>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <strong>
              {dirty ? 'Unsaved pricing changes' : 'Pricing configuration'}
            </strong>
            <p>
              Review your pricing changes before saving.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              secondary
              disabled={!dirty}
              onClick={() => setDraft({ ...api.pricing })}
            >
              Discard
            </Button>
            <Button
              disabled={!dirty}
              onClick={() =>
                onChange(
                  { pricing: { ...draft } },
                  'Pricing changes saved.',
                )
              }
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Notice>
      {editing && (
        <Modal
          title={
            editing === 'price' ? 'Edit pricing model' : 'Edit currency and tax'
          }
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const problem = validatePricing(form)
              if (problem) {
                setError(problem)
                return
              }
              setDraft(form)
              setEditing(null)
            }}
            className="space-y-4"
          >
            {editing === 'price' ? (
              <>
                <Field label="Model">
                  <select
                    value={form.model}
                    onChange={(e) => update('model', e.target.value)}
                  >
                    {['Free', 'Pay-as-you-use', 'Subscription'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Base fee">
                  <input
                    disabled={form.model === 'Free'}
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={Number.isNaN(form.base) ? '' : form.base}
                    onChange={(e) =>
                      update(
                        'base',
                        e.target.value === '' ? NaN : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Price per call">
                  <input
                    disabled={form.model !== 'Pay-as-you-use'}
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={Number.isNaN(form.perCall) ? '' : form.perCall}
                    onChange={(e) =>
                      update(
                        'perCall',
                        e.target.value === '' ? NaN : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Free sandbox calls/month">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={
                      Number.isNaN(form.freeSandbox) ? '' : form.freeSandbox
                    }
                    onChange={(e) =>
                      update(
                        'freeSandbox',
                        e.target.value === '' ? NaN : Number(e.target.value),
                      )
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Currency">
                  <select
                    value={form.currency}
                    onChange={(e) => update('currency', e.target.value)}
                  >
                    <option>NGN</option>
                    <option>USD</option>
                  </select>
                </Field>
                <Field label="Tax percentage">
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={Number.isNaN(form.tax) ? '' : form.tax}
                    onChange={(e) =>
                      update(
                        'tax',
                        e.target.value === '' ? NaN : Number(e.target.value),
                      )
                    }
                  />
                </Field>
                <Field label="Tax handling">
                  <select
                    value={form.taxHandling}
                    onChange={(e) => update('taxHandling', e.target.value)}
                  >
                    <option>Added to invoice</option>
                    <option>Included in price</option>
                  </select>
                </Field>
              </>
            )}
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button secondary onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Apply to draft</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
