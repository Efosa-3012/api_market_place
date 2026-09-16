import type {
  Account,
  Balance,
  CoreBankingAdapter,
  Customer,
  Page,
  Transaction,
  TransactionQuery,
} from './types.js';

/**
 * Tiny deterministic dataset for tests and for running the platform without
 * the Go service. Ids match the Go seed so switching adapters is seamless.
 *
 * Activity dates are anchored to process start, the same way the Go seed anchors
 * to time.Now(). A fixed anchor would drift stale, and this fake is the fallback
 * if the Go service is unavailable during a demo — it must not show transactions
 * from months ago while the real service shows this week.
 */

/** Process-start anchor, so a single run is internally consistent. */
const ANCHOR = new Date();

/** `n` days before the anchor, at `hour` UTC. */
function daysAgo(n: number, hour = 0): string {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}
const accounts: Account[] = [
  {
    account_id: 'acct-demo-001',
    account_number: '10000001',
    customer_id: 'customer-demo-001',
    currency: 'NGN',
    account_type: 'current',
    status: 'active',
    account_balance: '1250500.50',
    ledger_balance: '1250500.50',
    account_opening_date: '2025-06-01T00:00:00Z',
    last_transaction_date: daysAgo(0, 12),
    bank_sort_code: '200000',
    branch_name: 'Victoria Island',
    account_manager_name: 'Bola Adeyemi',
    account_manager_phone: '08011111111',
  },
  // Ada holds three accounts, so the consent screen has a real choice to make
  // and an aggregation app has something worth aggregating. Mirrors the Go seed.
  {
    account_id: 'acct-demo-011',
    account_number: '10000011',
    customer_id: 'customer-demo-001',
    currency: 'NGN',
    account_type: 'savings',
    status: 'active',
    account_balance: '4180000.00',
    ledger_balance: '4180000.00',
    account_opening_date: '2024-03-12T00:00:00Z',
    last_transaction_date: daysAgo(3, 9),
    bank_sort_code: '200000',
    branch_name: 'Victoria Island',
    account_manager_name: 'Bola Adeyemi',
    account_manager_phone: '08011111111',
  },
  {
    account_id: 'acct-demo-012',
    account_number: '10000012',
    customer_id: 'customer-demo-001',
    currency: 'USD',
    account_type: 'domiciliary',
    status: 'active',
    account_balance: '12400.00',
    ledger_balance: '12400.00',
    account_opening_date: '2025-02-20T00:00:00Z',
    last_transaction_date: daysAgo(8, 14),
    bank_sort_code: '200000',
    branch_name: 'Victoria Island',
    account_manager_name: 'Bola Adeyemi',
    account_manager_phone: '08011111111',
  },
  {
    account_id: 'acct-demo-002',
    account_number: '10000002',
    customer_id: 'customer-demo-002',
    currency: 'NGN',
    account_type: 'savings',
    status: 'active',
    account_balance: '84000.00',
    ledger_balance: '84000.00',
    account_opening_date: '2024-11-15T00:00:00Z',
    last_transaction_date: daysAgo(1, 9),
    bank_sort_code: '200000',
    branch_name: 'Ikeja',
    account_manager_name: 'Chidi Okeke',
    account_manager_phone: '08022222222',
  },
  {
    account_id: 'acct-demo-006',
    account_number: '10000006',
    customer_id: 'customer-demo-006',
    currency: 'NGN',
    account_type: 'current',
    status: 'dormant',
    account_balance: '0.00',
    ledger_balance: '0.00',
    account_opening_date: '2023-01-05T00:00:00Z',
    last_transaction_date: null,
    bank_sort_code: '200000',
    branch_name: 'Abuja Central',
    account_manager_name: 'Halima Bello',
    account_manager_phone: '08066666666',
  },
];

const balances: Balance[] = accounts.flatMap((a) => [
  {
    account_id: a.account_id,
    currency: a.currency,
    type: 'available',
    amount: a.account_balance,
    credit_limit: '0.00',
    available_balance: a.account_balance,
    as_of: daysAgo(0, 12),
  },
  {
    account_id: a.account_id,
    currency: a.currency,
    type: 'ledger',
    amount: a.ledger_balance,
    credit_limit: '0.00',
    available_balance: a.account_balance,
    as_of: daysAgo(0, 12),
  },
]);

/**
 * Recognisable spending, not filler.
 *
 * An aggregation app is only convincing when the history looks like somebody's
 * actual month — a salary landing, rent leaving, a few subscriptions, some
 * card spend. Tuples are [daysAgo, hour, type, amount, narration, counterparty].
 */
type Entry = [number, number, 'credit' | 'debit', string, string, string];

const NGN_CURRENT: Entry[] = [
  [0, 9, 'debit', '4500.00', 'Card purchase — coffee', 'Cafe Neo'],
  [1, 19, 'debit', '18200.00', 'POS purchase — groceries', 'Shoprite Lekki'],
  [2, 8, 'debit', '3000.00', 'Airtime top-up', 'MTN Nigeria'],
  [3, 12, 'debit', '250000.00', 'Transfer to savings', 'Own account ····0011'],
  [4, 21, 'debit', '12400.00', 'Ride hailing', 'Uber Nigeria'],
  [5, 16, 'debit', '9900.00', 'Streaming subscription', 'Netflix'],
  [6, 11, 'debit', '35000.00', 'Fuel purchase', 'Total Energies'],
  [7, 13, 'debit', '24500.00', 'Restaurant', 'Nok by Alara'],
  [8, 10, 'credit', '85000.00', 'Transfer received', 'Chidinma Okonkwo'],
  [9, 18, 'debit', '7800.00', 'Card purchase — pharmacy', 'HealthPlus'],
  [11, 9, 'debit', '15000.00', 'Data bundle', 'Spectranet'],
  [12, 14, 'debit', '62000.00', 'Online purchase', 'Jumia Nigeria'],
  [14, 8, 'debit', '450000.00', 'Rent payment', 'Lekki Gardens Estate'],
  [15, 10, 'credit', '1450000.00', 'Salary — September', 'Andela Nigeria Ltd'],
  [18, 17, 'debit', '11500.00', 'Cable TV subscription', 'MultiChoice Nigeria'],
  [21, 12, 'debit', '28000.00', 'POS purchase — pharmacy', 'Medplus'],
  [24, 15, 'debit', '19900.00', 'Gym membership', 'i-Fitness'],
  [28, 10, 'credit', '1450000.00', 'Salary — August', 'Andela Nigeria Ltd'],
];

const NGN_SAVINGS: Entry[] = [
  [3, 12, 'credit', '250000.00', 'Transfer from current', 'Own account ····0001'],
  [10, 0, 'credit', '18450.00', 'Interest earned', 'Stanbic IBTC'],
  [31, 12, 'credit', '250000.00', 'Transfer from current', 'Own account ····0001'],
  [40, 0, 'credit', '17980.00', 'Interest earned', 'Stanbic IBTC'],
];

const USD_DOM: Entry[] = [
  [8, 14, 'credit', '2500.00', 'Inward remittance', 'Upwork Global Inc'],
  [16, 11, 'debit', '49.00', 'Card purchase — software', 'JetBrains s.r.o.'],
  [23, 9, 'debit', '120.00', 'Card purchase — hosting', 'Amazon Web Services'],
];

/** Build a ledger for one account, walking the balance backwards from today. */
function ledgerFor(accountId: string, currency: string, closing: string, entries: Entry[]): Transaction[] {
  let running = Number(closing);
  return entries.map(([days, hour, type, amount, narration, counterparty], i) => {
    const row: Transaction = {
      transaction_id: `txn-${accountId.replace('acct-', '')}-${String(i + 1).padStart(3, '0')}`,
      account_id: accountId,
      type,
      amount,
      currency,
      reference: `${accountId.slice(-3)}-${String(i + 1).padStart(4, '0')}`,
      narration,
      counterparty,
      running_balance: running.toFixed(2),
      booked_at: daysAgo(days, hour),
      value_date: daysAgo(days),
    };
    // Walking back in time: undo this entry to get the balance before it.
    running += type === 'credit' ? -Number(amount) : Number(amount);
    return row;
  });
}

const transactions: Transaction[] = [
  ...ledgerFor('acct-demo-001', 'NGN', '1250500.50', NGN_CURRENT),
  ...ledgerFor('acct-demo-011', 'NGN', '4180000.00', NGN_SAVINGS),
  ...ledgerFor('acct-demo-012', 'USD', '12400.00', USD_DOM),
];

/** Demo logins for the in-memory core. Same password for everyone; ids match the Go seed. */
export const MEMORY_CUSTOMER_PASSWORD = 'password123';
const customers: (Customer & { username: string })[] = [
  { customer_id: 'customer-demo-001', username: 'ada', full_name: 'Adaeze Ngozi Okonkwo', short_name: 'Ada', email: 'ada.okonkwo@example.ng', phone_number: '08031234567' },
  { customer_id: 'customer-demo-002', username: 'emeka', full_name: 'Emeka Chukwuemeka Okafor', short_name: 'Emeka', email: 'emeka.okafor@example.ng', phone_number: '08059876543' },
  { customer_id: 'customer-demo-006', username: 'ibrahim', full_name: 'Ibrahim Musa Danjuma', short_name: 'Ibrahim', email: 'ibrahim.danjuma@example.ng', phone_number: '08134567890' },
];

export class MemoryCoreBankingAdapter implements CoreBankingAdapter {
  async authenticateCustomer(username: string, password: string) {
    const c = customers.find((x) => x.username === username.toLowerCase());
    return c && password === MEMORY_CUSTOMER_PASSWORD ? { customer_id: c.customer_id } : null;
  }

  async getCustomer(customerId: string) {
    const c = customers.find((x) => x.customer_id === customerId);
    if (!c) return null;
    const { username: _username, ...profile } = c;
    return profile;
  }

  async getAccount(accountId: string) {
    return accounts.find((a) => a.account_id === accountId) ?? null;
  }

  async listCustomerAccounts(customerId: string) {
    return accounts.filter((a) => a.customer_id === customerId);
  }

  async listBalances(accountId: string) {
    return balances.filter((b) => b.account_id === accountId);
  }

  /** Supports every documented filter, so a client behaves the same on either adapter. */
  async listTransactions(accountId: string, q: TransactionQuery = {}): Promise<Page<Transaction>> {
    let items = transactions.filter((t) => t.account_id === accountId);
    if (q.type) items = items.filter((t) => t.type === q.type);
    // `to` is inclusive of the whole day when a bare date is given, which is what
    // a caller passing 2026-09-16 means.
    if (q.from) {
      const from = Date.parse(q.from);
      items = items.filter((t) => Date.parse(t.booked_at) >= from);
    }
    if (q.to) {
      const to = /^\d{4}-\d{2}-\d{2}$/.test(q.to) ? Date.parse(`${q.to}T23:59:59.999Z`) : Date.parse(q.to);
      items = items.filter((t) => Date.parse(t.booked_at) <= to);
    }
    if (q.sort === 'booked_at_asc') items = [...items].reverse();
    const limit = q.limit && q.limit > 0 ? q.limit : 20;
    const offset = q.cursor ? Number(q.cursor) : 0;
    const slice = items.slice(offset, offset + limit);
    const has_more = offset + limit < items.length;
    return {
      items: slice,
      pagination: { limit, has_more, ...(has_more ? { next_cursor: String(offset + limit) } : {}) },
    };
  }

  async healthy() {
    return true;
  }
}
