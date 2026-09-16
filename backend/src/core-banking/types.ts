/**
 * Shapes returned by the core banking service (mirrors the Go models in
 * github.com/Derakoptes/core-banking). Money is a decimal string, never a float.
 */
export interface Account {
  account_id: string;
  account_number: string;
  customer_id: string;
  currency: string;
  account_type: string; // current | savings | domiciliary | fixed_deposit
  status: string; // active | dormant | ...
  account_balance: string;
  ledger_balance: string;
  account_opening_date: string;
  last_transaction_date: string | null;
  bank_sort_code: string;
  branch_name: string;
  account_manager_name: string;
  account_manager_phone: string;
}

export interface Balance {
  account_id: string;
  currency: string;
  type: string; // e.g. available | ledger
  amount: string;
  credit_limit: string;
  available_balance: string;
  as_of: string;
}

export interface Transaction {
  transaction_id: string;
  account_id: string;
  type: string; // credit | debit
  amount: string;
  currency: string;
  reference: string;
  narration: string;
  counterparty: string;
  running_balance: string;
  booked_at: string;
  value_date: string;
}

export interface TransactionQuery {
  limit?: number;
  cursor?: string;
  from?: string;
  to?: string;
  type?: 'credit' | 'debit';
  sort?: 'booked_at_desc' | 'booked_at_asc';
}

export interface Pagination {
  limit: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

/** Customer profile from the core (never exposed to partners as-is). */
export interface Customer {
  customer_id: string;
  full_name: string;
  short_name: string;
  email: string;
  phone_number: string;
}

/**
 * The adapter boundary. Everything above this line is the same in production;
 * only the implementation behind it changes (mock today, real core tomorrow).
 */
export interface CoreBankingAdapter {
  getAccount(accountId: string): Promise<Account | null>;
  listCustomerAccounts(customerId: string): Promise<Account[]>;
  listBalances(accountId: string): Promise<Balance[]>;
  listTransactions(accountId: string, query?: TransactionQuery): Promise<Page<Transaction>>;
  /**
   * The bank's own customer login. Returns the customer id on success, null on
   * bad credentials. In production this is the bank's identity provider; the
   * marketplace never stores customer passwords.
   */
  authenticateCustomer(username: string, password: string): Promise<{ customer_id: string } | null>;
  getCustomer(customerId: string): Promise<Customer | null>;
  healthy(): Promise<boolean>;
}
