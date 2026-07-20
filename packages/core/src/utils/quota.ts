import { env } from '../env';

export type DailyQuotaKey =
  | 'FREE_CHAT_DAILY_LIMIT'
  | 'FREE_IMAGE_DAILY_LIMIT'
  | 'FREE_SUGGESTION_DAILY_LIMIT'
  | 'PRO_CHAT_DAILY_LIMIT'
  | 'PRO_IMAGE_DAILY_LIMIT'
  | 'PRO_SUGGESTION_DAILY_LIMIT';

export function getConfiguredDailyQuota(key: DailyQuotaKey): number {
  const value = Number(env[key]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer derived from approved unit economics`);
  }
  return value;
}
