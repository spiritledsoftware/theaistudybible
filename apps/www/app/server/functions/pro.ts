import { getStripeData, isPro } from '@/core/stripe/utils';
import { createServerFn } from '@tanstack/react-start';
import { authMiddleware } from '../middleware/auth';

export const getSubscription = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    let type: 'pro' | 'free' = 'free';
    if (!context.user || !context.user.stripeCustomerId) return { subscription: null, type };

    const subData = await getStripeData(context.user.stripeCustomerId);
    if (isPro(subData)) {
      type = 'pro';
    }
    return { subscription: subData, type };
  });
