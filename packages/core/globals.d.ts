import type { lucia } from '@/core/auth';
import type { users } from '@/core/database/schema';
import type { PostHog } from 'posthog-node';

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: typeof users.$inferSelect;
  }
}

declare global {
  export var posthog: PostHog | undefined;
}
