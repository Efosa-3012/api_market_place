import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  const canSubmit = identifier.trim().length > 0 && password.length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) return

    // Replace with the authentication service when the backend is ready.
    setMessage('Sign-in is not connected yet. Please try again once it is available.')
  }

  return (
    <section
  aria-labelledby="login-title"
  className="grid min-h-[calc(100dvh-80px)] bg-white lg:h-[calc(100dvh-80px)] lg:min-h-0 lg:grid-cols-[52%_48%]"
>
      <div className="flex justify-center px-6 py-10 sm:px-12 lg:justify-start lg:pl-[15%] lg:pr-12 lg:pt-24">
        <div className="w-full max-w-[360px]">
          <Link
            to="/"
            aria-label="Stanbic IBTC home"
            className="mb-8 inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <img
                        src="/images/LogoBlue_.png"
                        alt="Stanbic IBTC"
                        className="h-10 w-70 object-contain"
                    />
          </Link>

          <h1
            id="login-title"
            className="text-2xl font-semibold tracking-tight text-[#151c2d]"
          >
            Login to API Marketplace
          </h1>

          <p className="mt-3 text-sm text-[#58708f]">
            Provide the following credentials
          </p>

          <form
            onSubmit={handleSubmit}
            onChange={() => setMessage('')}
            className="mt-9"
          >
            <div>
              <label
                htmlFor="login-identifier"
                className="mb-2 block text-sm font-medium text-[#151c2d]"
              >
                Email
              </label>

              <input
                id="login-identifier"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Enter your email or username"
                className="h-12 w-full rounded-md border border-transparent bg-[#f7f7f8] px-4 text-sm text-[#151c2d] outline-none placeholder:text-[#8195b0] focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-[#151c2d]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-md border border-transparent bg-[#f7f7f8] py-3 pl-4 pr-14 text-sm text-[#151c2d] outline-none placeholder:text-[#8195b0] focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls="login-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-1 flex w-11 cursor-pointer items-center justify-center rounded-md text-[#58708f] hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
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
                    {!showPassword && <path d="m3 3 18 18" />}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-7 flex h-11 w-full cursor-pointer items-center justify-center rounded-md bg-[#080da6] text-sm font-medium text-white transition-colors hover:bg-[#003894] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-[#eff5ff] disabled:text-[#757575]"
            >
              Log in
            </button>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() =>
                  setMessage('Password recovery is not available yet.')
                }
                className="min-h-11 cursor-pointer rounded-sm text-sm text-[#1010ff] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                Forgot password?
              </button>
            </div>

            <p
              role="status"
              aria-live="polite"
              className="mt-3 min-h-10 text-sm leading-6 text-[#58708f]"
            >
              {message}
            </p>
          </form>
        </div>
      </div>

      <aside className="hidden min-h-0 pb-0 pr-4 pt-4 lg:block">
  <div className="relative h-full overflow-hidden rounded-t-2xl">
    <img
      src="/images/Sign in.png"
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
    />
  </div>
</aside>
    </section>
  )
}