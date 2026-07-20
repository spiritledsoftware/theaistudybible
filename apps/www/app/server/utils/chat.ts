import { getStripeData, isPro } from '@/core/stripe/utils';
import { getConfiguredDailyQuota, type DailyQuotaKey } from '@/core/utils/quota';
import type { Role } from '@/schemas/roles/types';
import type { User } from '@/schemas/users/types';

const QUOTA_WINDOW_MS = 86_400_000;

export type ChatQuota = {
  limit: number | null;
  windowMs: number;
};

async function getChatQuota({
  user,
  roles,
  proKey,
  freeKey,
}: {
  user?: User | null;
  roles?: Role[] | null;
  proKey: DailyQuotaKey;
  freeKey: DailyQuotaKey;
}): Promise<ChatQuota> {
  if (roles?.some((role) => role.id === 'admin')) {
    return { limit: null, windowMs: QUOTA_WINDOW_MS };
  }

  if (user) {
    const subscription = await getStripeData(user.stripeCustomerId);
    if (isPro(subscription)) {
      return { limit: getConfiguredDailyQuota(proKey), windowMs: QUOTA_WINDOW_MS };
    }
  }

  return { limit: getConfiguredDailyQuota(freeKey), windowMs: QUOTA_WINDOW_MS };
}

export function getChatMessageQuota(options: { user?: User | null; roles?: Role[] | null }) {
  return getChatQuota({
    ...options,
    freeKey: 'FREE_CHAT_DAILY_LIMIT',
    proKey: 'PRO_CHAT_DAILY_LIMIT',
  });
}

export function getChatSuggestionQuota(options: { user?: User | null; roles?: Role[] | null }) {
  return getChatQuota({
    ...options,
    freeKey: 'FREE_SUGGESTION_DAILY_LIMIT',
    proKey: 'PRO_SUGGESTION_DAILY_LIMIT',
  });
}
