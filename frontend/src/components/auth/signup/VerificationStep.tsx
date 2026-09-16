import { useEffect, useState } from 'react'
import type { SignupStepProps } from '../../../types/signup'

export default function VerificationStep({
  data,
  update,
}: SignupStepProps) {
  const [secondsLeft, setSecondsLeft] = useState(42)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (secondsLeft === 0) return

    const timer = window.setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const [emailName, emailDomain] = data.email.trim().split('@')
  const maskedEmail = `${emailName.slice(0, 1)}•••••@${emailDomain ?? ''}`

  function handleResend() {
    update('verificationCode', '')
    setSecondsLeft(42)
    setResent(true)
    document.getElementById('verification-code')?.focus()
  }

  return (
    <div>
      <label
        htmlFor="verification-code"
        className="block text-sm font-medium leading-6"
      >
        Enter the 6-digit code sent to
        <span className="block break-all text-[#1010ff]">
          {maskedEmail}
        </span>
      </label>

      <div className="group relative mt-5">
        <input
          id="verification-code"
          name="verification-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          aria-describedby="verification-help"
          value={data.verificationCode}
          onChange={(event) =>
            update(
              'verificationCode',
              event.target.value.replace(/\D/g, '').slice(0, 6),
            )
          }
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />

        <div
          aria-hidden="true"
          className="flex gap-2 rounded-lg group-focus-within:outline-2 group-focus-within:outline-offset-4 group-focus-within:outline-blue-600"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg border bg-[#f7f7f8] text-base ${
                data.verificationCode[index]
                  ? 'border-blue-300 text-[#151c2d]'
                  : 'border-[#dfe2e8] text-[#8a8a8a]'
              } ${index === 3 ? 'ml-2' : ''}`}
            >
              {data.verificationCode[index] || '0'}
            </span>
          ))}
        </div>
      </div>

      <p
        id="verification-help"
        className="mt-4 text-xs leading-5 text-[#58708f]"
      >
        Enter the verification code to continue.
      </p>

      <p className="mt-6 text-sm text-[#465b78]">
        Didn’t receive a code?
      </p>

      <div className="mt-1 flex items-center gap-2 text-sm">
        <button
          type="button"
          disabled={secondsLeft > 0}
          onClick={handleResend}
          className="min-h-11 cursor-pointer rounded-sm text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:text-[#a0a0a0] disabled:no-underline"
        >
          Resend code
        </button>

        {secondsLeft > 0 && (
          <span className="text-[#465b78]">
            (00:{String(secondsLeft).padStart(2, '0')})
          </span>
        )}
      </div>

      <p role="status" className="text-xs text-[#58708f]">
        {resent ? 'Code entry reset. Enter your verification code.' : ''}
      </p>
    </div>
  )
}