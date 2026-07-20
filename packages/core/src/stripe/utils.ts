import { env } from '../env';
import { stripe } from '.';
import { cache } from '../cache';
import type { SubscriptionData } from './types';

// The contents of this function should probably be wrapped in a try/catch
export async function syncStripeData(customerId?: string | null): Promise<SubscriptionData> {
  if (!customerId) return { status: 'none' };

  // Fetch latest subscription data from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: 'all',
    expand: ['data.default_payment_method'],
  });

  if (subscriptions.data.length === 0) {
    const subData: SubscriptionData = { status: 'none' };
    await cache.set(`stripe:customer:${customerId}`, subData);
    return subData;
  }

  // If a user can have multiple subscriptions, that's your problem
  const subscription = subscriptions.data[0];

  let productId: string | null = null;
  const product = subscription.items.data[0].plan.product;
  if (!product) {
    throw new Error('Product not found');
  }

  if (typeof product === 'string') {
    productId = product;
  } else {
    productId = product.id;
  }

  // Store complete subscription state
  const subData: SubscriptionData = {
    subscriptionId: subscription.id,
    status: subscription.status,
    productId,
    priceId: subscription.items.data[0].price.id,
    currentPeriodEnd: subscription.items.data[0].current_period_end,
    currentPeriodStart: subscription.items.data[0].current_period_start,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
        ? {
            brand: subscription.default_payment_method.card?.brand ?? null,
            last4: subscription.default_payment_method.card?.last4 ?? null,
          }
        : null,
  };

  // Store the data in your KV
  await cache.set(`stripe:customer:${customerId}`, subData);
  return subData;
}

export async function getStripeData(customerId?: string | null): Promise<SubscriptionData> {
  if (!customerId) return { status: 'none' };
  const customer = await cache.get<SubscriptionData>(`stripe:customer:${customerId}`);
  if (!customer) return await syncStripeData(customerId);
  return customer;
}

export function isPro(subData: SubscriptionData): boolean {
  return (
    (subData.status === 'active' || subData.status === 'trialing') &&
    [env.PRO_MONTHLY_PRICE_ID, env.PRO_YEARLY_PRICE_ID].includes(subData.priceId)
  );
}
