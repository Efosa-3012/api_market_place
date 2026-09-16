import { Link } from 'react-router-dom'
import type { CatalogApi, CatalogTab, Lifecycle } from './model'
import { date, dateTime, metrics, number, publicVisible } from './model'
import { Badge, Button, Copy, Panel, Pairs } from './ui'
export default function Overview({
  api,
  onTab,
  onEdit,
  onStatus,
}: {
  api: CatalogApi
  onTab: (tab: CatalogTab, section?: string) => void
  onEdit: () => void
  onStatus: (status: Lifecycle) => void
}) {
  const m = metrics(api)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['API calls (30 days)', number(m.calls)],
          ['Success rate', m.calls ? `${api.successRate}%` : '—'],
          ['Active developers', number(m.active)],
          ['Avg. latency', m.calls ? `${api.latency} ms` : '—'],
        ].map(([label, value]) => (
          <Panel key={label} title={label}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-muted">
              API activity
            </p>
          </Panel>
        ))}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Panel
            title="API Information"
            action={
              <Button secondary onClick={onEdit}>
                ✎ Edit
              </Button>
            }
          >
            <Pairs
              items={[
                ['API Name', api.name],
                ['Category', api.category],
                ['Description', api.description],
                ['Owner', api.owner],
                ['Version', api.version],
                ['Date Created', date(api.created)],
                ['Last Updated', dateTime(api.updated)],
              ]}
            />
          </Panel>
          <Panel title="Quick Links">
            <div className="space-y-3">
              <button
                onClick={() => onTab('documentation')}
                className="flex w-full justify-between rounded-lg border border-slate-100 p-4 text-left text-xs"
              >
                View Documentation <span className="text-blue-600">→</span>
              </button>
              <Link
                to="/app/developer-portal?tab=explorer"
                className="flex justify-between rounded-lg border border-slate-100 p-4 text-xs"
              >
                Open Developer Portal <span className="text-blue-600">→</span>
              </Link>
              <Link
                to="/admin/dashboard"
                className="flex justify-between rounded-lg border border-slate-100 p-4 text-xs"
              >
                View Analytics <span className="text-blue-600">→</span>
              </Link>
            </div>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel
            title="Environments"
            action={
              <Button
                secondary
                onClick={() => onTab('settings', 'Environments')}
              >
                ✎ Edit
              </Button>
            }
          >
            {(['Sandbox', 'Production'] as const).map((env) => (
              <div className="mb-4 last:mb-0" key={env}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{env}</span>
                  <Badge
                    value={api.environments[env].enabled ? 'Live' : 'Disabled'}
                  />
                </div>
                <Copy text={api.environments[env].url} />
              </div>
            ))}
          </Panel>
          <Panel title="Authentication">
            <div className="flex items-center justify-between text-xs">
              <span>{api.authentication}</span>
              <button
                className="text-blue-600"
                onClick={() => onTab('settings', 'Security')}
              >
                View details →
              </button>
            </div>
          </Panel>
          <Panel title="Status & Lifecycle">
            <div className="mb-4 rounded-lg border border-slate-100 p-4">
              <Badge value={api.status} />
              <p className="mt-2 text-xs text-slate-500">
                {publicVisible(api)
                  ? 'Listed on the marketplace.'
                  : 'Not listed on the marketplace.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                secondary
                onClick={() => onStatus('Maintenance')}
                disabled={api.status === 'Maintenance'}
              >
                Put in Maintenance
              </Button>
              <Button
                secondary
                onClick={() => onStatus('Deprecated')}
                disabled={api.status === 'Deprecated'}
              >
                Deprecate API
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
