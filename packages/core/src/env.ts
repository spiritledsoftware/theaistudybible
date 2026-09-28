import { env as cloudflareEnv } from 'cloudflare:workers';

export type AppCacheStub = DurableObjectStub & {
  acquireLease(
    key: string,
    request: { token: string; now: number; expiresAt: number },
  ): Promise<boolean>;
  addToSet(key: string, value: string): Promise<number>;
  get<T>(key: string): Promise<T | null>;
  removeFromSet(key: string, value: string): Promise<number>;
  releaseLease(key: string, token: string): Promise<void>;
  set(key: string, value: unknown): Promise<void>;
};
export type AppCacheNamespace = {
  getByName(name: string): AppCacheStub;
};

export type QuotaLimiterStub = DurableObjectStub & {
  commit(id: string): Promise<void>;
  reserve(request: { id: string; limit: number; windowMs: number }): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }>;
  status(request: { limit: number; windowMs: number }): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }>;
  rollback(id: string): Promise<void>;
};
export type QuotaLimiterNamespace = {
  getByName(name: string): QuotaLimiterStub;
};
export type RuntimeEnv = {
  AI_CONTEXT_SIZE: string;
  APPLE_CLIENT_ID: string;
  APPLE_AUTH_KEY: string;
  APPLE_KEY_ID: string;
  APPLE_TEAM_ID: string;
  BIBLE_IMPORT_QUEUE: Queue;
  CACHE: AppCacheNamespace;
  CANONICAL_SOURCES: R2Bucket;
  DATABASE: D1Database;
  DEAD_LETTER_QUEUE: Queue;
  DEV: string;
  DEVOTIONAL_QUEUE: Queue;
  /** Cloudflare Email Service `send_email` binding, restricted to noreply@theaistudybible.com. */
  EMAIL: SendEmail;
  EMAIL_QUEUE: Queue;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GROUNDING_SOURCE_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
  FREE_CHAT_DAILY_LIMIT: string;
  FREE_IMAGE_DAILY_LIMIT: string;
  FREE_SUGGESTION_DAILY_LIMIT: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_CHAT_MODEL: string;
  OPENROUTER_EMBEDDING_DIMENSIONS: string;
  OPENROUTER_EMBEDDING_MODEL: string;
  OPENROUTER_IMAGE_MODEL: string;
  OPENROUTER_RERANK_MODEL: string;
  POSTHOG_API_HOST?: string;
  PRO_MONTHLY_PRICE_ID: string;
  PRO_CHAT_DAILY_LIMIT: string;
  PRO_IMAGE_DAILY_LIMIT: string;
  PRO_SUGGESTION_DAILY_LIMIT: string;
  PRO_YEARLY_PRICE_ID: string;
  POSTHOG_API_KEY?: string;
  PRIVATE_SOURCES: R2Bucket;
  PUBLIC_MEDIA: R2Bucket;
  PUBLIC_MEDIA_URL: string;
  QUOTA_LIMITER: QuotaLimiterNamespace;
  SCRIPTURE_INDEX: VectorizeIndex;
  SENTRY_DSN: string;
  STAGE: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  WEB_APP_URL: string;
};

export const env = new Proxy({} as RuntimeEnv, {
  get(_target, property) {
    return Reflect.get(cloudflareEnv as object, property);
  },
});
