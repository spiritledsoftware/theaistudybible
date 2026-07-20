import { describe, expect, it } from 'vitest';
import { getQuotaLedgerName } from './keys';

describe('getQuotaLedgerName', () => {
  it('isolates each workload for the same Reader', () => {
    const readerId = 'reader-1';
    const ledgers = [
      getQuotaLedgerName('message', readerId),
      getQuotaLedgerName('suggestion', readerId),
      getQuotaLedgerName('image', readerId),
    ];

    expect(new Set(ledgers).size).toBe(ledgers.length);
  });
});
