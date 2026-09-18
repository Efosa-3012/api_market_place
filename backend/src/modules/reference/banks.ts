/**
 * Nigerian deposit money banks with their 3-digit CBN codes — the code that
 * goes into the NUBAN check digit and that transfer systems route on.
 *
 * Reference data, maintained by hand: it changes when the CBN licenses or
 * merges a bank, a few times a year at most. `code` is the value partners
 * pass to the NUBAN endpoints; `slug` is a stable id for their own records.
 */
export interface Bank {
  code: string;
  name: string;
  slug: string;
  /** commercial | non_interest | merchant */
  type: 'commercial' | 'non_interest' | 'merchant';
}

export const BANKS: readonly Bank[] = [
  { code: '044', name: 'Access Bank', slug: 'access', type: 'commercial' },
  { code: '023', name: 'Citibank Nigeria', slug: 'citibank', type: 'commercial' },
  { code: '050', name: 'Ecobank Nigeria', slug: 'ecobank', type: 'commercial' },
  { code: '070', name: 'Fidelity Bank', slug: 'fidelity', type: 'commercial' },
  { code: '011', name: 'First Bank of Nigeria', slug: 'first-bank', type: 'commercial' },
  { code: '214', name: 'First City Monument Bank', slug: 'fcmb', type: 'commercial' },
  { code: '103', name: 'Globus Bank', slug: 'globus', type: 'commercial' },
  { code: '058', name: 'Guaranty Trust Bank', slug: 'gtbank', type: 'commercial' },
  { code: '082', name: 'Keystone Bank', slug: 'keystone', type: 'commercial' },
  { code: '526', name: 'Parallex Bank', slug: 'parallex', type: 'commercial' },
  { code: '076', name: 'Polaris Bank', slug: 'polaris', type: 'commercial' },
  { code: '105', name: 'Premium Trust Bank', slug: 'premium-trust', type: 'commercial' },
  { code: '101', name: 'Providus Bank', slug: 'providus', type: 'commercial' },
  { code: '106', name: 'Signature Bank', slug: 'signature', type: 'commercial' },
  { code: '221', name: 'Stanbic IBTC Bank', slug: 'stanbic-ibtc', type: 'commercial' },
  { code: '068', name: 'Standard Chartered Bank Nigeria', slug: 'standard-chartered', type: 'commercial' },
  { code: '232', name: 'Sterling Bank', slug: 'sterling', type: 'commercial' },
  { code: '100', name: 'SunTrust Bank', slug: 'suntrust', type: 'commercial' },
  { code: '102', name: 'Titan Trust Bank', slug: 'titan-trust', type: 'commercial' },
  { code: '032', name: 'Union Bank of Nigeria', slug: 'union', type: 'commercial' },
  { code: '033', name: 'United Bank for Africa', slug: 'uba', type: 'commercial' },
  { code: '215', name: 'Unity Bank', slug: 'unity', type: 'commercial' },
  { code: '035', name: 'Wema Bank', slug: 'wema', type: 'commercial' },
  { code: '057', name: 'Zenith Bank', slug: 'zenith', type: 'commercial' },
  { code: '301', name: 'Jaiz Bank', slug: 'jaiz', type: 'non_interest' },
  { code: '303', name: 'Lotus Bank', slug: 'lotus', type: 'non_interest' },
  { code: '302', name: 'TAJ Bank', slug: 'taj', type: 'non_interest' },
  { code: '502', name: 'Rand Merchant Bank Nigeria', slug: 'rand-merchant', type: 'merchant' },
  { code: '561', name: 'Nova Merchant Bank', slug: 'nova-merchant', type: 'merchant' },
  { code: '060', name: 'Coronation Merchant Bank', slug: 'coronation', type: 'merchant' },
  { code: '413', name: 'FBNQuest Merchant Bank', slug: 'fbnquest', type: 'merchant' },
  { code: '415', name: 'FSDH Merchant Bank', slug: 'fsdh', type: 'merchant' },
  { code: '546', name: 'Greenwich Merchant Bank', slug: 'greenwich', type: 'merchant' },
] as const;

export const banksByCode = new Map(BANKS.map((b) => [b.code, b]));
