import { env } from '@/core/env';
import { createId } from '@/core/utils/id';
import { createMiddleware } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';

const GLOBAL_RATE_LIMIT = 2_000;
const GLOBAL_RATE_WINDOW_MS = 60_000;

export const rateLimitingMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const ip = getRequestIP({ xForwardedFor: true });
    const limiter = env.QUOTA_LIMITER.getByName(`global:${ip}`);
    const reservationId = createId();
    const result = await limiter.reserve({
      id: reservationId,
      limit: GLOBAL_RATE_LIMIT,
      windowMs: GLOBAL_RATE_WINDOW_MS,
    });
    if (!result.allowed) {
      throw new Response('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(GLOBAL_RATE_LIMIT),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetAt),
        },
      });
    }
    await limiter.commit(reservationId);
    return next();
  },
);
