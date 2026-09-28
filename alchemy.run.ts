import alchemy from 'alchemy';
import {
  D1Database,
  DurableObjectNamespace,
  EmailSender,
  Queue,
  R2Bucket,
  TanStackStart,
  VectorizeIndex,
  Worker,
} from 'alchemy/cloudflare';
import { CloudflareStateStore } from 'alchemy/state';
import { Price, Product, WebhookEndpoint } from 'alchemy/stripe';
import { allowedStripeEvents } from './packages/core/src/stripe/constants.ts';

const app = await alchemy('theaistudybible', {
  // A dedicated state worker keeps this app's state token independent of other Alchemy apps
  // on the same Cloudflare account.
  stateStore: process.env.ALCHEMY_STATE_TOKEN
    ? (scope) => new CloudflareStateStore(scope, { scriptName: 'theaistudybible-alchemy-state' })
    : undefined,
});
const isProduction = app.stage === 'production';
const rootDomain = 'theaistudybible.com';
const webDomain = isProduction
  ? rootDomain
  : app.stage === 'staging'
    ? `staging.${rootDomain}`
    : app.stage.startsWith('pr-')
      ? `${app.stage}.preview.${rootDomain}`
      : undefined;
// Deployed stages have fixed hostnames, so URLs that workers need about each other (and the
// Stripe webhook endpoint) are known before the workers exist. Other stages (local `alchemy dev`)
// read them from the environment instead.
const webhookDomain = webDomain ? `webhooks.${webDomain}` : undefined;
const webAppUrl = webDomain ? `https://${webDomain}` : alchemy.env('WEB_APP_URL');
const emailSender = `noreply@${rootDomain}`;
const compatibilityDate = '2026-05-01';
const protectedResource = { delete: !isProduction };

function secret(name: string) {
  return alchemy.secret.env(name);
}

const embeddingDimensions = Number(process.env.OPENROUTER_EMBEDDING_DIMENSIONS);
if (!Number.isInteger(embeddingDimensions) || embeddingDimensions <= 0) {
  throw new Error('OPENROUTER_EMBEDDING_DIMENSIONS must be a positive integer');
}

const stripeApiKey = secret('STRIPE_SECRET_KEY');

export const proProduct = await Product('pro-product', {
  apiKey: stripeApiKey,
  description: 'Higher daily usage limits for the AI Scripture Assistant.',
  name: 'The AI Study Bible Pro',
});
export const proMonthlyPrice = await Price('pro-monthly-price', {
  apiKey: stripeApiKey,
  currency: 'usd',
  product: proProduct.id,
  recurring: { interval: 'month' },
  unitAmount: 999,
});
export const proYearlyPrice = await Price('pro-yearly-price', {
  apiKey: stripeApiKey,
  currency: 'usd',
  product: proProduct.id,
  recurring: { interval: 'year' },
  unitAmount: 9999,
});
export const stripeWebhook = webhookDomain
  ? await WebhookEndpoint('stripe-webhook', {
      apiKey: stripeApiKey,
      description: `The AI Study Bible (${app.stage})`,
      enabledEvents: allowedStripeEvents,
      url: `https://${webhookDomain}/stripe`,
    })
  : undefined;

export const database = await D1Database('database', {
  ...protectedResource,
  migrationsDir: './migrations/d1',
  migrationsTable: 'd1_migrations',
  readReplication: { mode: 'auto' },
});

export const canonicalSources = await R2Bucket('canonical-sources', {
  ...protectedResource,
  empty: !isProduction,
});
export const privateSources = await R2Bucket('private-sources', {
  ...protectedResource,
  empty: !isProduction,
});
export const publicMedia = await R2Bucket('public-media', {
  ...protectedResource,
  devDomain: !isProduction,
  domains: isProduction ? ['media.theaistudybible.com'] : undefined,
  empty: !isProduction,
});

export const scriptureIndex = await VectorizeIndex('scripture-index', {
  description: 'Derived Semantic Scripture Search index; rebuild from canonical R2 sources',
  dimensions: embeddingDimensions,
  metric: 'cosine',
});

export const deadLetterQueue = await Queue('dead-letter', {
  ...protectedResource,
  settings: { messageRetentionPeriod: 1_209_600 },
});

const queueSettings = {
  ...protectedResource,
  dlq: deadLetterQueue,
  settings: { messageRetentionPeriod: 345_600 },
};

export const bibleImportQueue = await Queue('bible-import', queueSettings);
export const devotionalQueue = await Queue('devotional', queueSettings);
export const emailQueue = await Queue('email', queueSettings);
export const groundingSourceQueue = await Queue('grounding-source', queueSettings);
export const notificationQueue = await Queue('notification', queueSettings);

const appCache = DurableObjectNamespace('app-cache', {
  className: 'AppCache',
  sqlite: true,
});

const quotaLimiter = DurableObjectNamespace('quota-limiter', {
  className: 'QuotaLimiter',
  sqlite: true,
});

export const backgroundBindings = {
  AI_CONTEXT_SIZE: alchemy.env('AI_CONTEXT_SIZE'),
  APPLE_AUTH_KEY: secret('APPLE_AUTH_KEY'),
  APPLE_CLIENT_ID: alchemy.env('APPLE_CLIENT_ID'),
  APPLE_KEY_ID: alchemy.env('APPLE_KEY_ID'),
  APPLE_TEAM_ID: alchemy.env('APPLE_TEAM_ID'),
  BIBLE_IMPORT_QUEUE: bibleImportQueue,
  CANONICAL_SOURCES: canonicalSources,
  DATABASE: database,
  CACHE: appCache,
  DEAD_LETTER_QUEUE: deadLetterQueue,
  DEVOTIONAL_QUEUE: devotionalQueue,
  EMAIL_QUEUE: emailQueue,
  GROUNDING_SOURCE_QUEUE: groundingSourceQueue,
  NOTIFICATION_QUEUE: notificationQueue,
  GOOGLE_CLIENT_ID: alchemy.env('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: secret('GOOGLE_CLIENT_SECRET'),
  OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY'),
  OPENROUTER_CHAT_MODEL: alchemy.env('OPENROUTER_CHAT_MODEL'),
  OPENROUTER_EMBEDDING_DIMENSIONS: String(embeddingDimensions),
  OPENROUTER_EMBEDDING_MODEL: alchemy.env('OPENROUTER_EMBEDDING_MODEL'),
  OPENROUTER_IMAGE_MODEL: alchemy.env('OPENROUTER_IMAGE_MODEL'),
  OPENROUTER_RERANK_MODEL: alchemy.env('OPENROUTER_RERANK_MODEL'),
  POSTHOG_API_HOST: alchemy.env('POSTHOG_API_HOST'),
  POSTHOG_API_KEY: secret('POSTHOG_API_KEY'),
  PRO_MONTHLY_PRICE_ID: proMonthlyPrice.id,
  PRO_YEARLY_PRICE_ID: proYearlyPrice.id,
  PRIVATE_SOURCES: privateSources,
  PUBLIC_MEDIA: publicMedia,
  QUOTA_LIMITER: quotaLimiter,
  SCRIPTURE_INDEX: scriptureIndex,
  PUBLIC_MEDIA_URL:
    publicMedia.devDomain ?? `https://${publicMedia.domains?.[0] ?? 'media.theaistudybible.com'}`,
  SENTRY_DSN: secret('SENTRY_DSN'),
  EMAIL: EmailSender({ allowedSenderAddresses: [emailSender] }),
  STAGE: app.stage,
  VAPID_PRIVATE_KEY: secret('VAPID_PRIVATE_KEY'),
  VAPID_PUBLIC_KEY: alchemy.env('VAPID_PUBLIC_KEY'),
  WEB_APP_URL: webAppUrl,
} as const;

export const backgroundWorker = await Worker('background-worker', {
  bindings: backgroundBindings,
  compatibilityDate,
  compatibilityFlags: ['nodejs_compat'],
  crons: ['0 0 * * *', '0 * * * *'],
  entrypoint: './apps/workers/src/background.ts',
  eventSources: [
    ...[bibleImportQueue, devotionalQueue, emailQueue, groundingSourceQueue, notificationQueue].map(
      (queue) => ({
        queue,
        settings: {
          batchSize: 10,
          deadLetterQueue,
          maxRetries: 5,
          maxWaitTimeMs: 5_000,
          retryDelay: 30,
        },
      }),
    ),
    // Reports dead-lettered messages to Sentry and admins; it never dead-letters itself.
    {
      queue: deadLetterQueue,
      settings: { batchSize: 50, maxRetries: 3, maxWaitTimeMs: 30_000, retryDelay: 60 },
    },
  ],
  observability: { enabled: true, headSamplingRate: isProduction ? 0.1 : 1 },
  url: !isProduction,
});

export const webBindings = {
  AI_CONTEXT_SIZE: alchemy.env('AI_CONTEXT_SIZE'),
  APPLE_CLIENT_ID: alchemy.env('APPLE_CLIENT_ID'),
  APPLE_AUTH_KEY: secret('APPLE_AUTH_KEY'),
  APPLE_KEY_ID: alchemy.env('APPLE_KEY_ID'),
  APPLE_TEAM_ID: alchemy.env('APPLE_TEAM_ID'),
  BIBLE_IMPORT_QUEUE: bibleImportQueue,
  CACHE: backgroundWorker.bindings.CACHE,
  DATABASE: database,
  DEVOTIONAL_QUEUE: devotionalQueue,
  DEV: String(app.local),
  EMAIL_QUEUE: emailQueue,
  GOOGLE_CLIENT_ID: alchemy.env('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: secret('GOOGLE_CLIENT_SECRET'),
  FREE_CHAT_DAILY_LIMIT: alchemy.env('FREE_CHAT_DAILY_LIMIT'),
  FREE_IMAGE_DAILY_LIMIT: alchemy.env('FREE_IMAGE_DAILY_LIMIT'),
  FREE_SUGGESTION_DAILY_LIMIT: alchemy.env('FREE_SUGGESTION_DAILY_LIMIT'),
  GROUNDING_SOURCE_QUEUE: groundingSourceQueue,
  NOTIFICATION_QUEUE: notificationQueue,
  OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY'),
  OPENROUTER_CHAT_MODEL: alchemy.env('OPENROUTER_CHAT_MODEL'),
  OPENROUTER_EMBEDDING_DIMENSIONS: String(embeddingDimensions),
  OPENROUTER_EMBEDDING_MODEL: alchemy.env('OPENROUTER_EMBEDDING_MODEL'),
  OPENROUTER_IMAGE_MODEL: alchemy.env('OPENROUTER_IMAGE_MODEL'),
  OPENROUTER_RERANK_MODEL: alchemy.env('OPENROUTER_RERANK_MODEL'),
  POSTHOG_API_HOST: alchemy.env('POSTHOG_API_HOST'),
  POSTHOG_API_KEY: secret('POSTHOG_API_KEY'),
  PRO_MONTHLY_PRICE_ID: proMonthlyPrice.id,
  PRO_YEARLY_PRICE_ID: proYearlyPrice.id,
  PRO_CHAT_DAILY_LIMIT: alchemy.env('PRO_CHAT_DAILY_LIMIT'),
  PRO_IMAGE_DAILY_LIMIT: alchemy.env('PRO_IMAGE_DAILY_LIMIT'),
  PRO_SUGGESTION_DAILY_LIMIT: alchemy.env('PRO_SUGGESTION_DAILY_LIMIT'),
  PRIVATE_SOURCES: privateSources,
  PUBLIC_MEDIA_URL:
    publicMedia.devDomain ?? `https://${publicMedia.domains?.[0] ?? 'media.theaistudybible.com'}`,
  PUBLIC_MEDIA: publicMedia,
  QUOTA_LIMITER: backgroundWorker.bindings.QUOTA_LIMITER,
  SCRIPTURE_INDEX: scriptureIndex,
  SENTRY_DSN: secret('SENTRY_DSN'),
  STAGE: app.stage,
  STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
  VAPID_PUBLIC_KEY: alchemy.env('VAPID_PUBLIC_KEY'),
  VAPID_PRIVATE_KEY: secret('VAPID_PRIVATE_KEY'),
  WEB_APP_URL: webAppUrl,
} as const;

export const webWorker = await TanStackStart('web-worker', {
  bindings: webBindings,
  build: {
    env: {
      VITE_DONATION_LINK: alchemy.env('DONATION_LINK'),
      VITE_POSTHOG_API_HOST: alchemy.env('POSTHOG_API_HOST'),
      VITE_POSTHOG_API_KEY: alchemy.env('POSTHOG_API_KEY'),
      VITE_SENTRY_DSN: alchemy.env('SENTRY_DSN'),
      VITE_STAGE: app.stage,
    },
  },
  compatibilityDate,
  compatibilityFlags: ['nodejs_compat'],
  cwd: './apps/www',
  domains: webDomain ? [webDomain] : undefined,
  observability: { enabled: true, headSamplingRate: isProduction ? 0.1 : 1 },
  url: !isProduction,
});

export const webhookBindings = {
  DATABASE: database,
  CACHE: backgroundWorker.bindings.CACHE,
  SENTRY_DSN: secret('SENTRY_DSN'),
  STAGE: app.stage,
  STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: stripeWebhook
    ? alchemy.secret(stripeWebhook.secret)
    : secret('STRIPE_WEBHOOK_SECRET'),
  WEB_APP_URL: webAppUrl,
} as const;

export const webhookWorker = await Worker('webhook-worker', {
  bindings: webhookBindings,
  compatibilityDate,
  compatibilityFlags: ['nodejs_compat'],
  domains: webhookDomain ? [webhookDomain] : undefined,
  entrypoint: './apps/workers/src/webhook.ts',
  observability: { enabled: true, headSamplingRate: isProduction ? 0.1 : 1 },
  url: !isProduction,
});

console.log({
  background: backgroundWorker.url,
  stage: app.stage,
  web: webDomain ? webAppUrl : webWorker.url,
  webhook: webhookDomain ? `https://${webhookDomain}` : webhookWorker.url,
});

await app.finalize();
