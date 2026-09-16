import { useState } from 'react'
import { getPasswordChecks } from '../../../types/signup'
import type { SignupStepProps } from '../../../types/signup'
import FormField from './FormField'

interface PasswordInputProps {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function PasswordInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <FormField id={id} label={label}>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pr-14!"
        />

        <button
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-controls={id}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-1 flex w-11 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <svg
            aria-hidden="true"
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {!visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </FormField>
  )
}

export default function SecurityStep({
  data,
  update,
}: SignupStepProps) {
  const checks = getPasswordChecks(data.password)

  return (
    <div>
      <div className="space-y-6">
        <PasswordInput
          id="signup-password"
          label="Password"
          value={data.password}
          onChange={(value) => update('password', value)}
          placeholder="Create a password"
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm password"
          value={data.confirmPassword}
          onChange={(value) => update('confirmPassword', value)}
          placeholder="Re-enter your password"
        />
      </div>

      <div className="mt-5">
        <p className="text-xs text-body">
          Your password should include:
        </p>

        <ul className="mt-2 space-y-2">
          {checks.map((check) => (
            <li
              key={check.label}
              className={`flex items-center gap-2 text-xs ${
                check.passed ? 'text-blue-700' : 'text-muted'
              }`}
            >
              <span aria-hidden="true">
                {check.passed ? '✓' : '○'}
              </span>
              <span className="sr-only">
                {check.passed ? 'Met: ' : 'Not met: '}
              </span>
              {check.label}
            </li>
          ))}
        </ul>

        {data.confirmPassword && (
          <p
            role="status"
            className={`mt-4 text-xs ${
              data.password === data.confirmPassword
                ? 'text-blue-700'
                : 'text-red-600'
            }`}
          >
            {data.password === data.confirmPassword
              ? 'Passwords match.'
              : 'Passwords do not match.'}
          </p>
        )}
      </div>
    </div>
  )
}