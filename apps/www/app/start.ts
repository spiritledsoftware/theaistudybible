import { createCsrfMiddleware, createStart } from '@tanstack/react-start';
import { authMiddleware } from './server/middleware/auth';
import { rateLimitingMiddleware } from './server/middleware/rate-limiting';

export const startInstance = createStart(() => ({
  functionMiddleware: [rateLimitingMiddleware, authMiddleware],
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (context) => context.handlerType === 'serverFn',
    }),
  ],
}));
