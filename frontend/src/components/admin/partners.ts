export type PartnerStatus =
  'Pending' | 'More info requested' | 'Active' | 'Suspended'
export interface Contact {
  name: string
  role: string
  email: string
  phone: string
}
export interface PartnerProfile {
  name: string
  registration: string
  tier: string
  industry: string
  size: string
  website: string
  description: string
  contact: Contact
}
export interface Access {
  sandbox: boolean
  production: boolean
}
export interface Activity {
  id: string
  time: string
  text: string
}
export interface Partner extends PartnerProfile {
  id: string
  status: PartnerStatus
  previousStatus?: Exclude<PartnerStatus, 'Suspended'>
  registered: string
  additionalContacts: Contact[]
  access: Record<string, Access>
  notes: string
  activity: Activity[]
}
export const statuses: PartnerStatus[] = [
  'Pending',
  'More info requested',
  'Active',
  'Suspended',
]
export const partnerApis = [
  {
    id: 'transfer',
    name: 'Transfer API',
    description: 'Initiate and manage fund transfers.',
    symbol: '↗',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    id: 'balance',
    name: 'Balance API',
    description: 'Retrieve account balances.',
    symbol: '▣',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    id: 'identity',
    name: 'Identity Verification API',
    description: 'Verify customer identity (KYC).',
    symbol: '◇',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    id: 'payments',
    name: 'Payments API',
    description: 'Process bill payments.',
    symbol: '▤',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    id: 'collections',
    name: 'Collections API',
    description: 'Manage direct debits and collections.',
    symbol: '▰',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    id: 'profile',
    name: 'Customer Profile API',
    description: 'Access customer profile data.',
    symbol: '♙',
    color: 'bg-cyan-50 text-cyan-600',
  },
]
export const emptyProfile: PartnerProfile = {
  name: '',
  registration: '',
  tier: 'Business',
  industry: 'Fintech',
  size: '1–10 employees',
  website: '',
  description: '',
  contact: { name: '', role: '', email: '', phone: '' },
}
export function emptyAccess(): Record<string, Access> {
  return Object.fromEntries(
    partnerApis.map((api) => [api.id, { sandbox: false, production: false }]),
  )
}
export function makePartner(
  profile: PartnerProfile,
  id: string,
  time: string,
): Partner {
  return {
    ...profile,
    id,
    status: 'Pending',
    registered: time,
    additionalContacts: [],
    access: emptyAccess(),
    notes: '',
    activity: [
      {
        id: `${id}-created`,
        time,
        text: 'Partner application added for review.',
      },
    ],
  }
}
export function initialPartners(): Partner[] {
  const names = [
    'Meridian Payments Ltd',
    'Kobo Wallet',
    'Verda Logistics',
    'Bright Path Savings',
    'Zenith Retail Tech',
    'Naira Bridge',
    'Paylight NG',
    'Atlas Commerce',
  ]
  const state: PartnerStatus[] = [
    'Active',
    'Pending',
    'More info requested',
    'Active',
    'Suspended',
    'Active',
    'Pending',
    'Active',
  ]
  const tiers = [
    'Business',
    'Startup',
    'Enterprise',
    'Business',
    'Starter',
    'Enterprise',
    'Startup',
    'Business',
  ]
  return names.map((name, i) => {
    const id = [
      'meridian',
      'kobo',
      'verda',
      'bright',
      'zenith',
      'naira',
      'paylight',
      'atlas',
    ][i]
    const time = new Date(Date.now() - (i + 1) * 86400000).toISOString()
    const base = makePartner(
      {
        ...emptyProfile,
        name,
        registration: `RC-${1492048 + i * 1387}`,
        tier: tiers[i],
        industry: i === 2 ? 'Logistics' : 'Fintech',
        size: i === 0 ? '50–200 employees' : '11–50 employees',
        website: `https://${id}.example.com`,
        description:
          i === 0
            ? 'Meridian Payments provides secure payment infrastructure for businesses across Africa.'
            : `${name} builds digital services for businesses and consumers.`,
        contact: {
          name: i === 0 ? 'Ada Eze' : 'Primary Contact',
          role: i === 0 ? 'Chief Technology Officer' : 'Integration Lead',
          email: `${i === 0 ? 'ada' : 'contact'}@${id}.example.com`,
          phone: '+234 801 234 5678',
        },
      },
      id,
      time,
    )
    const access = emptyAccess()
    if (state[i] === 'Active' || state[i] === 'Suspended') {
      access.transfer = { sandbox: true, production: state[i] === 'Active' }
      if (i === 0 || i === 5) {
        access.identity = { sandbox: true, production: false }
        access.payments = { sandbox: true, production: false }
      }
    }
    return {
      ...base,
      status: state[i],
      previousStatus: state[i] === 'Suspended' ? 'Active' : undefined,
      access,
      additionalContacts:
        i === 0
          ? [
              {
                name: 'Tomi Oladipo',
                role: 'Product Manager',
                email: 'tomi@meridian.example.com',
                phone: '',
              },
            ]
          : [],
      activity: [
        { id: `${id}-status`, time, text: `Application status: ${state[i]}.` },
        ...base.activity,
      ],
    }
  })
}
export function enabledCount(partner: Partner) {
  return partner.status === 'Suspended'
    ? 0
    : Object.values(partner.access).filter(
        (access) =>
          access.sandbox || (partner.status === 'Active' && access.production),
      ).length
}
export function changeAccess(
  partner: Partner,
  api: string,
  environment: 'sandbox' | 'production',
  enabled: boolean,
): Partner {
  if (
    partner.status === 'Suspended' ||
    !partner.access[api] ||
    (environment === 'production' && partner.status !== 'Active')
  )
    return partner
  return {
    ...partner,
    access: {
      ...partner.access,
      [api]: { ...partner.access[api], [environment]: enabled },
    },
  }
}
export function changeStatus(partner: Partner, status: PartnerStatus): Partner {
  if (status === 'Suspended')
    return partner.status === 'Suspended'
      ? partner
      : { ...partner, status, previousStatus: partner.status }
  return { ...partner, status, previousStatus: undefined }
}
export function disableAccess(partner: Partner): Partner {
  return { ...partner, access: emptyAccess() }
}
export function safeWebsite(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null
  } catch {
    return null
  }
}
export function formattedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P'
  )
}
export function partnersCsv(partners: Partner[]) {
  const quote = (value: unknown) =>
    `"${String(value)
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`
  const rows = [
    [
      'Company',
      'Registration',
      'Company type',
      'Industry',
      'Website',
      'Applied',
      'Status',
      'Enabled APIs',
    ],
    ...partners.map((partner) => [
      partner.name,
      partner.registration,
      partner.tier,
      partner.industry,
      partner.website,
      partner.registered,
      partner.status,
      enabledCount(partner),
    ]),
  ]
  return '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n')
}
