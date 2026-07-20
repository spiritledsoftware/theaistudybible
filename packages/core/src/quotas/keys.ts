export type QuotaWorkload = 'message' | 'suggestion' | 'image';

export function getQuotaLedgerName(workload: QuotaWorkload, readerId: string) {
  return `${workload}:${readerId}`;
}
