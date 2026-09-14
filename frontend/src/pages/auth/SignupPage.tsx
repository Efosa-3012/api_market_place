import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import SignupLayout from '../../components/auth/SignupLayout'
import AccountDetailsStep from '../../components/auth/signup/AccountDetailsStep'
import VerificationStep from '../../components/auth/signup/VerificationStep'
import BusinessDetailsStep from '../../components/auth/signup/BusinessDetailsStep'
import SecurityStep from '../../components/auth/signup/SecurityStep'

import {
  getPasswordChecks,
  initialSignupData,
} from '../../types/signup'
import type { SignupData, SignupStep } from '../../types/signup'

const headings = {
  1: {
    title: 'Create your account',
    description: 'Provide your information to continue',
  },
  2: {
    title: 'Verify your account',
    description:
      'Enter the email verification code below to continue your registration.',
  },
  3: {
    title: 'Tell us about your business',
    description:
      'Help us understand how you plan to use Stanbic IBTC APIs.',
  },
  4: {
    title: 'Secure your account',
    description:
      'Create a strong password to protect your API Marketplace account.',
  },
}

export default function SignupPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<SignupStep>(1)
  const [data, setData] = useState<SignupData>(initialSignupData)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const successDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!complete) {
      headingRef.current?.focus()
    }
  }, [step, complete])

  useEffect(() => {
    const dialog = successDialogRef.current

    if (complete && dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [complete])

  useEffect(() => {
    if (error) {
      errorRef.current?.focus()
    }
  }, [error])

  function goToLogin() {
    navigate('/login', { replace: true })
  }

  function update<K extends keyof SignupData>(
    field: K,
    value: SignupData[K],
  ) {
    setData((current) => ({
      ...current,
      [field]: value,
      ...(field === 'email' ||
      field === 'phone' ||
      field === 'countryCode'
        ? { verificationCode: '' }
        : {}),
    }))

    setError('')
  }

  function validateStep(): string {
    if (step === 1) {
      if (!data.firstName.trim() || !data.lastName.trim()) {
        return 'Enter your first and last name.'
      }

      const phone = data.phone.replace(/[\s()-]/g, '')

      if (!/^[0-9]{6,14}$/.test(phone)) {
        return 'Enter a valid phone number without the country code.'
      }

      if (
        !data.role ||
        !data.acceptedTerms ||
        !data.consentedToVerification
      ) {
        return 'Select your role and complete both consent checkboxes.'
      }
    }

    if (step === 2 && data.verificationCode !== '123456') {
      return 'Incorrect demo code. Enter 123456 to continue.'
    }

    if (step === 3) {
      const requiredValues = [
        data.companyName,
        data.companyType,
        data.registrationNumber,
        data.tin,
        data.apiUsage,
      ]

      if (requiredValues.some((value) => !value.trim())) {
        return 'Complete all business details before continuing.'
      }
    }

    if (step === 4) {
      const passwordIsValid = getPasswordChecks(data.password).every(
        (check) => check.passed,
      )

      if (!passwordIsValid) {
        return 'Your password must meet every requirement listed above.'
      }

      if (data.password !== data.confirmPassword) {
        return 'Your passwords do not match.'
      }
    }

    return ''
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (complete) return

    const validationError = validateStep()

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')

    if (step < 4) {
      setStep((current) => (current + 1) as SignupStep)
      return
    }

    // Frontend-only completion.
    // When the backend is connected, submit the registration data here
    // and only clear the fields/show success after the request succeeds.
    setData((current) => ({
      ...current,
      password: '',
      confirmPassword: '',
      verificationCode: '',
    }))

    setComplete(true)
  }

  function handleBack() {
    setError('')
    setStep((current) => Math.max(1, current - 1) as SignupStep)
  }

  const buttonClass =
    'min-h-10 cursor-pointer rounded-lg bg-[#0450ff] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#003bd0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600'

  return (
    <SignupLayout>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight outline-none"
      >
        <span className="sr-only">Step {step} of 4: </span>
        {headings[step].title}
      </h1>

      <p className="mt-2 text-sm leading-5 text-[#58708f]">
        {headings[step].description}
      </p>

      <form onSubmit={handleContinue} className="mt-5">
        {step === 1 && (
          <AccountDetailsStep data={data} update={update} />
        )}

        {step === 2 && (
          <VerificationStep data={data} update={update} />
        )}

        {step === 3 && (
          <BusinessDetailsStep data={data} update={update} />
        )}

        {step === 4 && (
          <SecurityStep data={data} update={update} />
        )}

        {error && (
          <p
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="mt-4 rounded-md bg-red-50 p-3 text-sm leading-5 text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            {error}
          </p>
        )}

        <div
          className={`mt-4 flex items-center ${
            step === 1 ? '' : 'justify-between gap-4'
          }`}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-10 cursor-pointer rounded-lg bg-[#eeeeef] px-5 text-sm font-medium text-[#465b78] hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              Back
            </button>
          )}

          <button
            type="submit"
            disabled={complete}
            className={`${buttonClass} ${
              step === 1 ? 'w-full' : ''
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {step === 4 ? 'Verify & Create Account' : 'Continue'}
          </button>
        </div>

        {step === 1 && (
          <p className="mt-3 text-center text-sm text-[#003bce]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Sign in
            </Link>
          </p>
        )}
      </form>

      <dialog
        ref={successDialogRef}
        aria-labelledby="signup-success-title"
        aria-describedby="signup-success-description"
        onCancel={(event) => {
          event.preventDefault()
          goToLogin()
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-48px)] w-[calc(100%_-_48px)] max-w-sm overflow-y-auto rounded-2xl border-0 bg-white p-8 text-center shadow-xl backdrop:bg-black/50"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-green-50 text-3xl text-green-600"
        >
          ✓
        </div>

        <h2
          id="signup-success-title"
          className="text-2xl font-semibold text-[#151c2d]"
        >
          Registration successful
        </h2>

        <p
          id="signup-success-description"
          className="mt-3 text-sm leading-6 text-[#58708f]"
        >
          Continue to sign in to the API Marketplace.
        </p>

        <button
          type="button"
          autoFocus
          onClick={goToLogin}
          className={`${buttonClass} mt-6 w-full`}
        >
          Continue to sign in
        </button>
      </dialog>
    </SignupLayout>
  )
}