export type Environment = 'Production' | 'Sandbox'
export const apiDefinitions = [
  {
    id: 'payments',
    name: 'Payments API',
    latency: 118,
    uptime: 99.98,
    failure: 0.006,
    price: 1.8,
    weight: 1,
  },
  {
    id: 'transfers',
    name: 'Transfers API',
    latency: 184,
    uptime: 99.91,
    failure: 0.012,
    price: 1.5,
    weight: 0.74,
  },
  {
    id: 'accounts',
    name: 'Accounts API',
    latency: 96,
    uptime: 99.99,
    failure: 0.003,
    price: 0.9,
    weight: 0.45,
  },
  {
    id: 'identity',
    name: 'Identity / KYC',
    latency: 212,
    uptime: 99.98,
    failure: 0.048,
    price: 3.2,
    weight: 0.22,
  },
  {
    id: 'cards',
    name: 'Cards API',
    latency: 77,
    uptime: 98.4,
    failure: 0.004,
    price: 1.2,
    weight: 0.13,
  },
  {
    id: 'virtual',
    name: 'Virtual Accounts',
    latency: 118,
    uptime: 99.95,
    failure: 0.006,
    price: 1.1,
    weight: 0.1,
  },
]
export const partnerDefinitions = [
  { id: 'meridian', name: 'Meridian Payments' },
  { id: 'kobo', name: 'Kobo Wallet' },
  { id: 'verda', name: 'Verda Logistics' },
  { id: 'bright', name: 'Bright Path Savings' },
  { id: 'atlas', name: 'Atlas Commerce' },
  { id: 'nova', name: 'Nova Finance' },
]
export interface RecordRow {
  date: string
  api: string
  partner: string
  environment: Environment
  calls: number
  clientErrors: number
  serverErrors: number
  timeouts: number
  latency: number
  uptime: number
  revenue: number
  developers: string[]
}
export interface Filters {
  api: string
  partner: string
  environment: string
  start: string
  end: string
  query: string
}
export const isoDate = (value: Date) => value.toISOString().slice(0, 10)
export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return isoDate(value)
}
export function dateCount(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
}
export function buildRecords(today = isoDate(new Date())): RecordRow[] {
  const rows: RecordRow[] = []
  for (let day = 179; day >= 0; day--)
    for (const [a, api] of apiDefinitions.entries())
      for (const [p, partner] of partnerDefinitions.entries())
        for (const environment of ['Production', 'Sandbox'] as const) {
          const date = shiftDate(today, -day)
          const variation =
            1 +
            0.24 * Math.sin((179 - day) / 4 + a) +
            0.1 * Math.cos((179 - day) / 2 + p)
          const calls = Math.round(
            38000 *
              api.weight *
              (1 - p * 0.12) *
              (environment === 'Production' ? 1 : 0.19) *
              variation *
              (1 + (179 - day) / 600),
          )
          const errors = Math.round(calls * api.failure)
          const clientErrors = Math.round(errors * 0.65)
          const serverErrors = Math.round(errors * 0.28)
          rows.push({
            date,
            api: api.id,
            partner: partner.id,
            environment,
            calls,
            clientErrors,
            serverErrors,
            timeouts: errors - clientErrors - serverErrors,
            latency: api.latency + Math.round(8 * Math.sin(day / 3)),
            uptime: api.uptime,
            revenue:
              environment === 'Production'
                ? Math.round((calls - errors) * api.price * 100) / 100
                : 0,
            developers: Array.from(
              { length: Math.max(2, Math.round(27 * variation)) },
              (_, i) => `${partner.id}-dev-${(i + a * 4 + day) % 42}`,
            ),
          })
        }
  return rows
}
export function selectRecords(rows: RecordRow[], filters: Filters) {
  const needle = filters.query.trim().toLowerCase()
  return rows.filter(
    (row) =>
      row.date >= filters.start &&
      row.date <= filters.end &&
      (filters.api === 'all' || row.api === filters.api) &&
      (filters.partner === 'all' || row.partner === filters.partner) &&
      (filters.environment === 'all' ||
        row.environment === filters.environment) &&
      (!needle ||
        `${apiDefinitions.find((api) => api.id === row.api)?.name} ${partnerDefinitions.find((partner) => partner.id === row.partner)?.name}`
          .toLowerCase()
          .includes(needle)),
  )
}
export function summarize(rows: RecordRow[]) {
  const calls = rows.reduce((sum, row) => sum + row.calls, 0)
  const clientErrors = rows.reduce((sum, row) => sum + row.clientErrors, 0),
    serverErrors = rows.reduce((sum, row) => sum + row.serverErrors, 0),
    timeouts = rows.reduce((sum, row) => sum + row.timeouts, 0)
  const failures = clientErrors + serverErrors + timeouts
  return {
    calls,
    clientErrors,
    serverErrors,
    timeouts,
    failures,
    successes: calls - failures,
    successRate: calls ? ((calls - failures) / calls) * 100 : 0,
    latency: calls
      ? rows.reduce((sum, row) => sum + row.latency * row.calls, 0) / calls
      : 0,
    uptime: calls
      ? rows.reduce((sum, row) => sum + row.uptime * row.calls, 0) / calls
      : 0,
    revenue:
      Math.round(rows.reduce((sum, row) => sum + row.revenue, 0) * 100) / 100,
    developers: new Set(rows.flatMap((row) => row.developers)).size,
  }
}
export function apiSummary(rows: RecordRow[]) {
  return apiDefinitions
    .map((api) => ({
      id: api.id,
      name: api.name,
      ...summarize(rows.filter((row) => row.api === api.id)),
    }))
    .filter((api) => api.calls > 0)
    .sort((a, b) => b.calls - a.calls)
}
export function partnerSummary(rows: RecordRow[]) {
  return partnerDefinitions
    .map((partner) => ({
      id: partner.id,
      name: partner.name,
      ...summarize(rows.filter((row) => row.partner === partner.id)),
    }))
    .filter((partner) => partner.calls > 0)
    .sort((a, b) => b.calls - a.calls)
}
export interface Point {
  label: string
  production: number
  sandbox: number
}
export function buildSeries(
  rows: RecordRow[],
  start: string,
  end: string,
): Point[] {
  if (dateCount(start, end) === 1) {
    const sums = {
      Production: summarize(
        rows.filter((row) => row.environment === 'Production'),
      ).calls,
      Sandbox: summarize(rows.filter((row) => row.environment === 'Sandbox'))
        .calls,
    }
    const weights = Array.from({ length: 24 }, (_, hour) =>
      hour < 7
        ? 0.15
        : hour === 15
          ? 2.9
          : 0.6 + Math.sin(((hour - 7) / 17) * Math.PI),
    )
    const total = weights.reduce((a, b) => a + b, 0)
    let p = 0,
      s = 0
    return weights.map((weight, hour) => {
      const production =
          hour === 23
            ? sums.Production - p
            : Math.floor((sums.Production * weight) / total),
        sandbox =
          hour === 23
            ? sums.Sandbox - s
            : Math.floor((sums.Sandbox * weight) / total)
      p += production
      s += sandbox
      return {
        label: `${String(hour).padStart(2, '0')}:00`,
        production,
        sandbox,
      }
    })
  }
  return Array.from({ length: dateCount(start, end) }, (_, index) => {
    const date = shiftDate(start, index)
    return {
      label: date,
      production: summarize(
        rows.filter(
          (row) => row.date === date && row.environment === 'Production',
        ),
      ).calls,
      sandbox: summarize(
        rows.filter(
          (row) => row.date === date && row.environment === 'Sandbox',
        ),
      ).calls,
    }
  })
}
export const compact = (number: number) =>
  new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number)
export const integer = (number: number) =>
  new Intl.NumberFormat('en-NG').format(number)
export const money = (number: number) => `₦${compact(number)}`
export function exportReport(rows: RecordRow[], filters: Filters) {
  const quote = (value: unknown) =>
    `"${String(value)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`
  const result = summarize(rows)
  const table: unknown[][] = [
    ['Portal Overview'],
    ['Start', filters.start, 'End', filters.end],
    [
      'API',
      filters.api,
      'Partner',
      filters.partner,
      'Environment',
      filters.environment,
      'Search',
      filters.query,
    ],
    [],
    [
      'Total calls',
      'Success rate %',
      'Weighted latency ms',
      'Active developers',
      'Revenue NGN',
    ],
    [
      result.calls,
      result.successRate,
      result.latency,
      result.developers,
      result.revenue,
    ],
    [],
    [
      'Date',
      'API',
      'Partner',
      'Environment',
      'Calls',
      '4xx',
      '5xx',
      'Timeouts',
      'Latency ms',
      'Availability %',
      'Revenue NGN',
    ],
  ]
  rows.forEach((row) =>
    table.push([
      row.date,
      apiDefinitions.find((api) => api.id === row.api)?.name,
      partnerDefinitions.find((partner) => partner.id === row.partner)?.name,
      row.environment,
      row.calls,
      row.clientErrors,
      row.serverErrors,
      row.timeouts,
      row.latency,
      row.uptime,
      row.revenue,
    ]),
  )
  return '\uFEFF' + table.map((row) => row.map(quote).join(',')).join('\r\n')
}
