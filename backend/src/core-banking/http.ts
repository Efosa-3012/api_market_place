import { ApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { randomUUID } from 'node:crypto';
import type {
  Account,
  Balance,
  CoreBankingAdapter,
  Customer,
  Page,
  Pagination,
  Transaction,
  TransactionQuery,
} from './types.js';

interface Options {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

/** Talks to the Go mock core over HTTP with the internal API key. */
export class HttpCoreBankingAdapter implements CoreBankingAdapter {
  constructor(private readonly opts: Options) {}

  private async request<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T | null> {
    const url = new URL(path, this.opts.baseUrl);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'X-Internal-Api-Key': this.opts.apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 5000),
      });
    } catch (err) {
      logger.error({ err, url: url.toString() }, 'core banking request failed');
      throw ApiError.upstream();
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error({ status: res.status, body, url: url.toString() }, 'core banking returned an error');
      throw ApiError.upstream();
    }
    return (await res.json()) as T;
  }

  async getAccount(accountId: string) {
    const r = await this.request<{ data: Account }>(`/v1/accounts/${encodeURIComponent(accountId)}`);
    return r?.data ?? null;
  }

  async listCustomerAccounts(customerId: string) {
    const r = await this.request<{ data: Account[] }>(
      `/v1/customers/${encodeURIComponent(customerId)}/accounts`,
    );
    return r?.data ?? [];
  }

  async listBalances(accountId: string) {
    const r = await this.request<{ data: Balance[] }>(
      `/v1/accounts/${encodeURIComponent(accountId)}/balances`,
    );
    return r?.data ?? [];
  }

  async listTransactions(accountId: string, q: TransactionQuery = {}): Promise<Page<Transaction>> {
    const r = await this.request<{ data: Transaction[]; meta: { pagination: Pagination } }>(
      `/v1/accounts/${encodeURIComponent(accountId)}/transactions`,
      { limit: q.limit, cursor: q.cursor, from: q.from, to: q.to, type: q.type, sort: q.sort },
    );
    if (!r) return { items: [], pagination: { limit: q.limit ?? 0, has_more: false } };
    return { items: r.data, pagination: r.meta.pagination };
  }

  async authenticateCustomer(username: string, password: string) {
    let res: Response;
    try {
      res = await fetch(new URL('/v1/authorize', this.opts.baseUrl), {
        method: 'POST',
        headers: { 'X-Internal-Api-Key': this.opts.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        // request_id keys the core's out-of-band verification code; we do not use that step yet.
        body: JSON.stringify({ request_id: randomUUID(), username, password }),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 5000),
      });
    } catch (err) {
      logger.error({ err }, 'core banking authorize failed');
      throw ApiError.upstream();
    }
    if (res.status === 401) return null;
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text().catch(() => '') }, 'core banking authorize error');
      throw ApiError.upstream();
    }
    const body = (await res.json()) as { customer_id: string };
    return { customer_id: body.customer_id };
  }

  async getCustomer(customerId: string) {
    const r = await this.request<{ data: Omit<Customer, 'customer_id'> }>(`/v1/customers/${encodeURIComponent(customerId)}`);
    return r ? { customer_id: customerId, ...r.data } : null;
  }

  async healthy() {
    try {
      const res = await fetch(new URL('/readyz', this.opts.baseUrl), {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
