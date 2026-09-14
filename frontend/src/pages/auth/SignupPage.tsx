import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

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
  const [step, setStep] = useState<SignupStep>(1)
  const [data, setData] = useState<SignupData>(initialSignupData)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [step, complete])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  function update<K extends keyof SignupData>(
    field: K,
    value: SignupData[K],
  ) {
    setData((current) => ({
      ...current,
      [field]: value,
      ...(
        field === 'email' ||
        field === 'phone' ||
        field === 'countryCode'
          ? { verificationCode: '' }
          : {}
      ),
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
      if (getPasswordChecks(data.password).some((check) => !check.passed)) {
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

    // UI demo only: no account is created or authenticated.
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

  function restart() {
    setData({ ...initialSignupData })
    setError('')
    setStep(1)
    setComplete(false)
  }

  const buttonClass =
    'min-h-10 cursor-pointer rounded-lg bg-[#0450ff] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#003bd0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600'

  if (complete) {
    return (
      <SignupLayout>
        <div
          aria-hidden="true"
          className="mb-6 grid size-14 place-items-center rounded-full bg-blue-50 text-2xl text-blue-600"
        >
          ✓
        </div>

        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none"
        >
          Signup preview complete
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#58708f]">
          You’ve completed all four screens. This is a frontend demo;
          no account has been created.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/login" className={buttonClass}>
            View sign-in
          </Link>

          <button
            type="button"
            onClick={restart}
            className="min-h-11 cursor-pointer rounded-lg bg-[#f0f0f0] px-5 text-sm text-[#465b78] hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Start again
          </button>
        </div>
      </SignupLayout>
    )
  }

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

      <form onSubmit={handleContinue} className="mt-8">
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
            className="mt-5 rounded-md bg-red-50 p-3 text-sm leading-5 text-red-700 outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            {error}
          </p>
        )}

        <div
          className={`mt-7 flex items-center ${
            step === 1 ? '' : 'justify-between gap-4'
          }`}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-11 cursor-pointer rounded-lg bg-[#eeeeef] px-5 text-sm font-medium text-[#465b78] hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
              Back
            </button>
          )}

          <button
            type="submit"
            className={`${buttonClass} ${step === 1 ? 'w-full' : ''}`}
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
    </SignupLayout>
  )
}