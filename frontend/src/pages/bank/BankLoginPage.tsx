import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError, bankSession } from '../../lib/api'
import { bank } from '../../lib/bank'

/**
 * Mock internet-banking login. The customer types their password HERE, on the
 * bank's page — the fintech that sent them never sees it. That is the whole
 * point of the consent model versus screen scraping.
 */
export default function BankLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/bank/connected-apps'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const expired = params.get('reason') === 'expired'

  // Already logged in? Skip straight to where they were going.
  if (bankSession.token()) return <Navigate to={next} replace />

  const isConsentFlow = next.startsWith('/consent')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await bank.login(username.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_credentials') {
        setError('Incorrect username or password.')
      } else if (err instanceof ApiError && (err.code === 'rate_limited' || err.code === 'account_locked')) {
        setError(err.code === 'account_locked' ? err.message : 'Too many attempts. Wait a minute and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Could not log in. Try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      {expired && (
        <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your session expired. Log in again to continue.
        </p>
      )}

      {isConsentFlow && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          An app is asking to connect to your Stanbic account. Log in to review exactly what it wants
          before you decide.
        </p>
      )}

      <section aria-labelledby="bank-login-title" className="rounded-2xl border border-[#e3e9f2] bg-white p-6 shadow-sm sm:p-8">
        <h1 id="bank-login-title" className="text-2xl font-semibold tracking-tight">
          Log in to Internet Banking
        </h1>
        <p className="mt-2 text-sm text-[#58708f]">Use your internet banking username and password.</p>

        <form onSubmit={handleSubmit} onChange={() => setError('')} className="mt-6 space-y-5">
          <div>
            <label htmlFor="bank-username" className="mb-2 block text-sm font-medium">
              Username
            </label>
            <input
              id="bank-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ada"
              className="h-12 w-full rounded-md border border-[#e1e6ee] bg-[#f7f7f8] px-4 text-sm outline-none placeholder:text-[#8195b0] focus:border-[#0b2858] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="bank-password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="bank-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-md border border-[#e1e6ee] bg-[#f7f7f8] pl-4 pr-14 text-sm outline-none focus:border-[#0b2858] focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-1 flex w-11 cursor-pointer items-center justify-center rounded-md text-xs text-[#58708f] hover:text-[#0b2858]"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-[#0b2858] text-sm font-medium text-white hover:bg-[#0f3a7d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2858] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </section>

      <p className="mt-4 text-center text-xs text-[#58708f]">
        Demo customers: <code>ada</code> / <code>adaeze-ada-okonkwo</code>, <code>emeka</code> / <code>emeka-emeka-okafor</code> — pattern <em>firstname-shortname-lastname</em>
      </p>
    </div>
  )
}
