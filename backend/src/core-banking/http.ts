import { ApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type {
  Account,
  Balance,
  CoreBankingAdapter,
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
