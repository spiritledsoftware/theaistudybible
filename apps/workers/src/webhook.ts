import { stripe } from '@/core/stripe';
import { allowedStripeEvents } from '@/core/stripe/constants';
import { syncStripeData } from '@/core/stripe/utils';
import * as Sentry from '@sentry/cloudflare';
import type Stripe from 'stripe';

interface WebhookEnv {
  CACHE: DurableObjectNamespace;
  DATABASE: D1Database;
  SENTRY_DSN: string;
  STAGE: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  WEB_APP_URL: string;
}

async function processEvent(event: Stripe.Event) {
  if (!allowedStripeEvents.includes(event.type)) return;
  const object = event.data.object;
  const customerId = 'customer' in object ? object.customer : undefined;
  if (typeof customerId !== 'string') {
    throw new Error(`Tracked Stripe event ${event.type} has no customer ID`);
  }
  await syncStripeData(customerId);
}

const worker: ExportedHandler<WebhookEnv> = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/stripe') {
      return new Response('Not found', { status: 404 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) return Response.json({ error: 'Missing Stripe signature' }, { status: 400 });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        await request.text(),
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      Sentry.captureException(error);
      return Response.json({ error: 'Invalid Stripe signature' }, { status: 400 });
    }

    try {
      await processEvent(event);
      return Response.json({ received: true });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { stripeEventType: event.type },
        extra: { stripeEventId: event.id },
      });
      return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
  },
};

export default Sentry.withSentry(
  (env: WebhookEnv) => ({
    dsn: env.SENTRY_DSN,
    environment: env.STAGE,
    sendDefaultPii: false,
    tracesSampleRate: env.STAGE === 'production' ? 0.1 : 1,
  }),
  worker,
);
