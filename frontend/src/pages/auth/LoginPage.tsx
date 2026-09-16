import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../lib/api'
import { portal } from '../../lib/portal'
import SignInModeSelector from '../../components/auth/SignInModeSelector'
import type { SignInMode } from '../../components/auth/SignInModeSelector'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [signInMode, setSignInMode] = useState<SignInMode>(
    params.get('mode') === 'admin' || (location.state as { mode?: string } | null)?.mode === 'admin' ? 'admin' : 'developer',
  )
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(
    params.get('reason') === 'expired' ? 'Your session expired. Log in again to continue.' : '',
  )
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !submitting

 const requestedPath =
  (location.state as { from?: string } | null)?.from ?? params.get('from') ?? undefined

const allowedPrefix = signInMode === 'admin' ? '/admin/' : '/app/'

/**
 * Where to land after signing in. The mode picker is a destination, not a
 * credential — the account's own role decides whether the admin console opens,
 * and that is enforced by the backend on every analytics call regardless of
 * what this page does.
 */
function destinationFor(role: 'developer' | 'admin') {
  const home = role === 'admin' ? '/admin/dashboard' : '/app/marketplace'
  if (role !== 'admin' && requestedPath?.startsWith('/admin/')) return home
  return requestedPath?.startsWith(allowedPrefix) ? requestedPath : home
}

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()

  if (!canSubmit || submitting) return

  setSubmitting(true)
  setMessage('')

  try {
    const developer = await portal.login(identifier.trim(), password)

    if (signInMode === 'admin' && developer.role !== 'admin') {
      // Signed in fine, but this is not a staff account. Say so instead of
      // redirecting to a console that would only turn them away again.
      setMessage(
        'That account is a developer account, so the admin console is not available. Switch to Developer to continue.',
      )
      setSignInMode('developer')
      return
    }

    navigate(destinationFor(developer.role), { replace: true })
  } catch (err) {
    if (err instanceof ApiError && err.code === 'invalid_credentials') {
      setMessage('Incorrect email or password.')
    } else if (err instanceof ApiError && err.code === 'validation_error') {
      setMessage('Enter the email address you registered with.')
    } else if (err instanceof ApiError && err.code === 'rate_limited') {
      setMessage('Too many attempts. Wait a minute and try again.')
    } else {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Try again.',
      )
    }
  } finally {
    setSubmitting(false)
  }
}
  return (
    <section
      aria-labelledby="login-title"
      className="grid min-h-dvh bg-white lg:h-dvh lg:grid-cols-[52%_48%] lg:grid-rows-[minmax(0,1fr)]"
    >
      <div className="flex min-h-0 justify-center px-6 py-6 sm:px-12 lg:overflow-y-auto lg:py-4 lg:pl-[15%] lg:pr-12">
        <div className="my-auto w-full max-w-[360px] shrink-0">
          <Link
            to="/"
            aria-label="Stanbic IBTC home"
            className="mb-5 inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            <img
              src="/images/LogoBlue_.png"
              alt="Stanbic IBTC"
              className="h-10 w-70 max-w-full object-contain"
            />
          </Link>

          <h1
            id="login-title"
            className="text-2xl font-semibold tracking-tight text-ink"
          >
            Login to API Marketplace
          </h1>

          <p className="mt-2 text-sm text-muted">
            Provide the following credentials
          </p>

          <form
            onSubmit={handleSubmit}
            onChange={() => setMessage('')}
            className="mt-5"
          >
            <SignInModeSelector
              value={signInMode}
              onChange={setSignInMode}
            />

            <div>
              <label
                htmlFor="login-identifier"
                className="mb-2 block text-sm font-medium text-ink"
              >
                Email
              </label>

              <input
                id="login-identifier"
                name="username"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Enter your email"
                className="h-12 w-full rounded-lg border border-transparent bg-canvas px-4 text-sm text-ink outline-none placeholder:text-muted focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-ink"
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
                  className="h-11 w-full rounded-lg border border-transparent bg-canvas pl-4 pr-14 text-sm text-ink outline-none placeholder:text-muted focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls="login-password"
                  onClick={() => setShowPassword((current) => !current)}
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
                    {!showPassword && <path d="m3 3 18 18" />}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-primary-hover text-sm font-medium text-white transition-colors hover:bg-bank-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-tint disabled:text-muted"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>

            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() =>
                  setMessage('Password recovery is not available yet.')
                }
                className="min-h-10 cursor-pointer rounded-sm text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                Forgot password?
              </button>
            </div>

            {message && (
              <p
                role="status"
                aria-live="polite"
                className="mt-2 text-sm leading-5 text-muted"
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>

      <aside className="hidden min-h-0 p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-2xl">
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