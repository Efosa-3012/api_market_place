import type { SignupStepProps } from '../../../types/signup'
import FormField from './FormField'

export default function AccountDetailsStep({
  data,
  update,
}: SignupStepProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField id="first-name" label="First name">
          <input
            id="first-name"
            name="given-name"
            autoComplete="given-name"
            required
            value={data.firstName}
            onChange={(event) => update('firstName', event.target.value)}
            placeholder="Enter your first name"
          />
        </FormField>

        <FormField id="last-name" label="Last name">
          <input
            id="last-name"
            name="family-name"
            autoComplete="family-name"
            required
            value={data.lastName}
            onChange={(event) => update('lastName', event.target.value)}
            placeholder="Enter your last name"
          />
        </FormField>
      </div>

      <FormField id="business-email" label="Business email">
        <input
          id="business-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={data.email}
          onChange={(event) => update('email', event.target.value)}
          placeholder="Enter your business email"
        />
      </FormField>

      <div>
        <label
          htmlFor="phone"
          className="mb-2 block text-sm font-medium"
        >
          Phone number
        </label>

        <div className="flex overflow-hidden rounded-md border border-transparent bg-[#f7f7f8] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
          <select
            aria-label="Country calling code"
            autoComplete="tel-country-code"
            value={data.countryCode}
            onChange={(event) => update('countryCode', event.target.value)}
            className="w-24 shrink-0 bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
          >
            <option value="+234">NG +234</option>
            <option value="+233">GH +233</option>
            <option value="+27">ZA +27</option>
            <option value="+44">UK +44</option>
            <option value="+1">US/CA +1</option>
          </select>

          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel-national"
            required
            value={data.phone}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="801 234 5678"
            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#8195b0]"
          />
        </div>
      </div>

      <FormField id="role" label="Your role">
        <select
          id="role"
          required
          value={data.role}
          onChange={(event) => update('role', event.target.value)}
        >
          <option value="" disabled>
            Select your role
          </option>
          <option value="developer">Developer</option>
          <option value="product-manager">Product Manager</option>
          <option value="business-owner">Business Owner / Founder</option>
          <option value="technology-lead">Technology Lead</option>
          <option value="other">Other</option>
        </select>
      </FormField>

      <div className="space-y-3 pt-1">
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#465b78]">
          <input
            type="checkbox"
            required
            checked={data.acceptedTerms}
            onChange={(event) =>
              update('acceptedTerms', event.target.checked)
            }
            className="mt-0.5 size-4 shrink-0 accent-blue-600"
          />
          <span>
            I agree to the Terms & Conditions and Privacy Policy.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#465b78]">
          <input
            type="checkbox"
            required
            checked={data.consentedToVerification}
            onChange={(event) =>
              update('consentedToVerification', event.target.checked)
            }
            className="mt-0.5 size-4 shrink-0 accent-blue-600"
          />
          <span>
            I consent to the verification and processing of my information
            where required.
          </span>
        </label>
      </div>
    </div>
  )
}