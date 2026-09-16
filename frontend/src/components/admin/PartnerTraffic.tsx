import type { ClientTraffic, EndpointTraffic } from '../../lib/admin'
import { duration, percent, relativeTime } from '../../lib/admin'
import { Chip, EmptyState, MethodBadge, Panel, ShareBar } from '../dash/ui'

/**
 * Who is calling, and what they are calling.
 *
 * Both lists are ranked by volume against the busiest row, so the bar answers
 * "how much of our traffic is this?" without needing an axis.
 */

export function PartnerTraffic({ clients }: { clients: ClientTraffic[] }) {
  const busiest = Math.max(...clients.map((c) => c.calls), 1)
  const calling = clients.filter((c) => c.calls > 0)

  return (
    <Panel
      title="Partners"
      subtitle="Registered apps, busiest first. Traffic is counted for all time."
      padded={false}
      footer={
        <span className="tabular-nums">
          {clients.length} registered · {calling.length} have called
        </span>
      }
    >
      {clients.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState title="No partners yet" message="Apps registered on the developer portal appear here." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#eef2f8] text-[10px] uppercase tracking-wide text-[#8ea3c0]">
                <th scope="col" className="px-5 py-2 font-medium">Partner</th>
                <th scope="col" className="py-2 pr-3 font-medium">Share of traffic</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Calls</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Consents</th>
                <th scope="col" className="py-2 pr-5 text-right font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.client_id} className="border-b border-[#f4f7fb] last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-[#142033]">{client.name}</span>
                      {client.status === 'deactivated' && <Chip tone="bad">Deactivated</Chip>}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[#8ea3c0]">
                      {client.developer_company ?? client.developer_name} ·{' '}
                      <span className="font-mono">{client.client_id}</span>
                    </span>
                  </td>
                  <td className="min-w-[120px] py-3 pr-3">
                    <ShareBar
                      fraction={client.calls / busiest}
                      tone={client.status === 'deactivated' ? 'neutral' : client.errors > 0 ? 'warn' : 'accent'}
                    />
                    {client.errors > 0 && (
                      <span className="mt-1 block text-[10px] text-amber-700">
                        {percent(client.errors / client.calls, 0)} rejected
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right text-xs tabular-nums text-[#142033]">
                    {client.calls.toLocaleString()}
                  </td>
                  <td className="py-3 pr-3 text-right text-xs tabular-nums text-[#65758e]">
                    {client.active_consents}
                  </td>
                  <td className="py-3 pr-5 text-right text-[11px] tabular-nums text-[#8ea3c0]">
                    {client.last_call_at ? relativeTime(client.last_call_at) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

export function TopEndpoints({ endpoints, windowLabel }: { endpoints: EndpointTraffic[]; windowLabel: string }) {
  const busiest = Math.max(...endpoints.map((e) => e.calls), 1)

  return (
    <Panel title="Most used APIs" subtitle={`Partner-facing endpoints, ${windowLabel.toLowerCase()}.`}>
      {endpoints.length === 0 ? (
        <EmptyState
          title="No partner calls in this window"
          message="Partner API calls will appear here once traffic comes in."
        />
      ) : (
        <ol className="flex flex-col gap-4">
          {endpoints.map((endpoint, index) => (
            <li key={`${endpoint.method} ${endpoint.path}`} className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-[10px] font-semibold tabular-nums text-[#b6c2d4]">#{index + 1}</span>
                  <MethodBadge method={endpoint.method} />
                  <span className="truncate font-mono text-[11px] text-[#142033]">{endpoint.path}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-[#65758e]">
                  {endpoint.calls.toLocaleString()}
                </span>
              </div>
              <div className="mt-2">
                <ShareBar fraction={endpoint.calls / busiest} tone={endpoint.errors > 0 ? 'warn' : 'accent'} />
              </div>
              <p className="mt-1.5 text-[10px] text-[#8ea3c0]">
                p95 {duration(endpoint.p95_latency_ms)}
                {endpoint.errors > 0 && <span className="text-amber-700"> · {endpoint.errors} rejected</span>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
