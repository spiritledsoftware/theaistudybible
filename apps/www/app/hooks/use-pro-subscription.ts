import type { SubscriptionData } from '@/core/stripe/types';
import { getSubscription } from '@/www/server/functions/pro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

type ActiveSubscription = SubscriptionData & { status: 'active' | 'trialing' };

export type UseSubscriptionReturn = {
  refetch: () => void;
} & (
  | {
      isActive: false;
      isPro: false;
      subscription: { status: 'none' } | null | undefined;
    }
  | {
      isActive: true;
      isPro: boolean;
      subscription: ActiveSubscription;
    }
);

export const useSubscription = (): UseSubscriptionReturn => {
  const { data, refetch } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: () => getSubscription(),
    placeholderData: (prev) => prev ?? { subscription: null, type: 'free' as const },
    staleTime: 1000 * 60 * 5,
  });

  return {
    isActive: useMemo(
      () => data?.subscription?.status === 'active' || data?.subscription?.status === 'trialing',
      [data?.subscription?.status],
    ),
    isPro: useMemo(() => data?.type === 'pro', [data?.type]),
    subscription: useMemo(() => data?.subscription, [data?.subscription]),
    refetch,
  } as UseSubscriptionReturn;
};
