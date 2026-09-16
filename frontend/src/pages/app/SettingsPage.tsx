import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { API_URL, portalSession } from '../../lib/api'
import { portal } from '../../lib/portal'
import { Button, Chip, Notice, Panel } from '../../components/dash/ui'

/**
 * Account settings.
 *
 * Deliberately small: the portal backend exposes signup, login and app
 * management, so this page shows what the account actually is and ends the
 * session. Anything it cannot genuinely change, it does not offer.
 */
export default function SettingsPage() {
  const navigate = useNavigate()
  const developer = portalSession.developer()

  function signOut() {
    portal.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-canvas px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-2 text-sm leading-6 text-body">
            Your developer account and this environment.
          </p>
        </header>

        <Panel title="Your account" subtitle="The identity your apps are registered under.">
          {developer ? (
            <dl className="flex flex-col divide-y divide-canvas">
              {[
                ['Name', developer.name],
                ['Email', developer.email],
                ['Organisation', developer.company ?? 'Not set'],
                ['Account type', developer.role === 'admin' ? 'Bank staff' : 'Developer'],
                ['Member since', new Date(developer.created_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-3 py-3 first:pt-0">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted">No account details available. Sign in again.</p>
          )}
          <Notice>
            Account details are set at signup. To change them, contact your Stanbic IBTC partner manager — in this
            preview there is no self-service edit.
          </Notice>
        </Panel>

        <Panel title="Environment" subtitle="What this account is connected to.">
          <dl className="flex flex-col divide-y divide-canvas">
            {[
              ['API base URL', <code key="url" className="break-all font-mono text-xs">{API_URL}</code>],
              ['Environment', <Chip key="env" tone="accent">Sandbox</Chip>],
              ['Data', 'Mock core banking — no real customer data'],
              ['Production access', 'Not available in this preview'],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Credentials" subtitle="Client IDs and secrets live with the app they belong to.">
          <p className="text-xs leading-6 text-body">
            Each registered app has its own client ID and secret. Secrets are stored only as a hash and shown once —
            rotate from the app's menu if one is lost or you suspect it leaked. The previous secret stops working
            immediately.
          </p>
          <Link
            to="/app/my-apis"
            className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-4 text-xs font-semibold text-body hover:bg-blue-50"
          >
            Manage apps and secrets →
          </Link>
        </Panel>

        <Panel title="Session">
          <p className="text-xs leading-6 text-body">
            Signing out clears your portal session on this device. Access tokens your apps already hold are
            unaffected — they are tied to customer consent, not to your login.
          </p>
          <div className="mt-4">
            <Button danger onClick={signOut}>
              Sign out
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
