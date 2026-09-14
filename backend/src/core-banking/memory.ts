import type {
  Account,
  Balance,
  CoreBankingAdapter,
  Page,
  Transaction,
  TransactionQuery,
} from './types.js';

/**
 * Tiny deterministic dataset for tests and for running the platform without
 * the Go service. Ids match the Go seed so switching adapters is seamless.
 */
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
    last_transaction_date: '2026-01-15T12:00:00Z',
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
    last_transaction_date: '2026-01-14T09:30:00Z',
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
    as_of: '2026-01-15T12:00:00Z',
  },
  {
    account_id: a.account_id,
    currency: a.currency,
    type: 'ledger',
    amount: a.ledger_balance,
    credit_limit: '0.00',
    available_balance: a.account_balance,
    as_of: '2026-01-15T12:00:00Z',
  },
]);

const transactions: Transaction[] = Array.from({ length: 12 }, (_, i) => ({
  transaction_id: `txn-demo-001-${String(i + 1).padStart(3, '0')}`,
  account_id: 'acct-demo-001',
  type: i % 3 === 0 ? 'credit' : 'debit',
  amount: i % 3 === 0 ? '150000.00' : '12500.00',
  currency: 'NGN',
  reference: `REF${1000 + i}`,
  narration: i % 3 === 0 ? 'Salary payment' : 'POS purchase',
  counterparty: i % 3 === 0 ? 'Acme Ltd' : 'Shoprite',
  running_balance: '1250500.50',
  booked_at: new Date(Date.UTC(2026, 0, 15 - i, 10)).toISOString(),
  value_date: new Date(Date.UTC(2026, 0, 15 - i)).toISOString(),
}));

export class MemoryCoreBankingAdapter implements CoreBankingAdapter {
  async getAccount(accountId: string) {
    return accounts.find((a) => a.account_id === accountId) ?? null;
  }

  async listCustomerAccounts(customerId: string) {
    return accounts.filter((a) => a.customer_id === customerId);
  }

  async listBalances(accountId: string) {
    return balances.filter((b) => b.account_id === accountId);
  }

  /** Supports type/sort/limit/cursor. `from`/`to` are accepted but ignored — use the HTTP adapter to test date filters. */
  async listTransactions(accountId: string, q: TransactionQuery = {}): Promise<Page<Transaction>> {
    let items = transactions.filter((t) => t.account_id === accountId);
    if (q.type) items = items.filter((t) => t.type === q.type);
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
