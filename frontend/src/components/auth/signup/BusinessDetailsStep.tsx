import type { SignupStepProps } from '../../../types/signup'
import FormField from './FormField'

export default function BusinessDetailsStep({
  data,
  update,
}: SignupStepProps) {
  return (
    <div className="space-y-5">
      <FormField id="company-name" label="Company name">
        <input
          id="company-name"
          name="organization"
          autoComplete="organization"
          required
          value={data.companyName}
          onChange={(event) => update('companyName', event.target.value)}
          placeholder="Enter your company name"
        />
      </FormField>

      <FormField id="company-type" label="Company type">
        <select
          id="company-type"
          required
          value={data.companyType}
          onChange={(event) => update('companyType', event.target.value)}
        >
          <option value="" disabled>
            Select company type
          </option>
          <option value="sole-proprietorship">Sole Proprietorship</option>
          <option value="partnership">Partnership</option>
          <option value="limited-company">Limited Company</option>
          <option value="nonprofit">Nonprofit Organization</option>
          <option value="other">Other</option>
        </select>
      </FormField>

      <FormField
        id="registration-number"
        label="CAC / Business Registration Number"
      >
        <input
          id="registration-number"
          required
          value={data.registrationNumber}
          onChange={(event) =>
            update('registrationNumber', event.target.value)
          }
          placeholder="Enter registration number"
        />
      </FormField>

      <FormField id="tin" label="Tax Identification Number (TIN)">
        <input
          id="tin"
          required
          value={data.tin}
          onChange={(event) => update('tin', event.target.value)}
          placeholder="Enter TIN"
        />
      </FormField>

      <FormField id="api-usage" label="How do you plan to use our APIs?">
        <textarea
          id="api-usage"
          required
          rows={3}
          value={data.apiUsage}
          onChange={(event) => update('apiUsage', event.target.value)}
          placeholder="e.g. Build a budgeting app that connects customers to their bank accounts."
        />
      </FormField>
    </div>
  )
}