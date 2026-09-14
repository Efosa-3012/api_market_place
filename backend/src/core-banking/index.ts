import { config } from '../config.js';
import { HttpCoreBankingAdapter } from './http.js';
import { MemoryCoreBankingAdapter } from './memory.js';
import type { CoreBankingAdapter } from './types.js';

export * from './types.js';

export function createCoreBanking(): CoreBankingAdapter {
  if (config.CORE_BANKING_ADAPTER === 'memory') return new MemoryCoreBankingAdapter();
  return new HttpCoreBankingAdapter({
    baseUrl: config.CORE_BANKING_URL,
    apiKey: config.CORE_BANKING_API_KEY,
  });
}

export const coreBanking: CoreBankingAdapter = createCoreBanking();
