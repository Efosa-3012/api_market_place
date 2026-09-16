import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError, bankSession } from '../../lib/api'
import { bank } from '../../lib/bank'
import { Button, Field, Notice, inputClass } from '../../components/ui'

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
      {expired && <Notice tone="warn" className="mb-4">Your session expired. Log in again to continue.</Notice>}

      {isConsentFlow && (
        <Notice className="mb-4">
          An app is asking to connect to your Stanbic account. Log in to review exactly what it wants before you decide.
        </Notice>
      )}

      <section aria-labelledby="bank-login-title" className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <h1 id="bank-login-title" className="text-2xl font-semibold tracking-tight">
          Log in to Internet Banking
        </h1>
        <p className="mt-2 text-base text-muted">Use your internet banking username and password.</p>

        <form onSubmit={handleSubmit} onChange={() => setError('')} className="mt-6 space-y-5">
          <Field id="bank-username" label="Username">
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
              className={`${inputClass} h-12 text-base`}
            />
          </Field>

          <Field id="bank-password" label="Password">
            <div className="relative">
              <input
                id="bank-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} h-12 pr-14 text-base`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-1 flex w-11 cursor-pointer items-center justify-center rounded-lg text-sm text-muted hover:text-bank"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>

          {error && <Notice tone="bad">{error}</Notice>}

          <Button type="submit" tone="bank" size="lg" full disabled={submitting || !username || !password}>
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </section>

      <p className="mt-4 text-center text-sm text-muted">
        Demo customers: <code>ada</code> / <code>adaeze-ada-okonkwo</code>, <code>emeka</code> / <code>emeka-emeka-okafor</code> — pattern <em>firstname-shortname-lastname</em>
      </p>
    </div>
  )
}
