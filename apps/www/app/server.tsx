import { env } from '@/core/env';
import { setPosthog } from '@/core/utils/posthog';
import * as Sentry from '@sentry/cloudflare';
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { PostHog } from 'posthog-node';

const serverEntry = createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});

if (env.POSTHOG_API_KEY) {
  const posthog = new PostHog(env.POSTHOG_API_KEY, { host: env.POSTHOG_API_HOST });
  if (env.STAGE !== 'production') posthog.optOut();
  setPosthog(posthog);
}

export default Sentry.withSentry(
  () => ({
    dsn: env.SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: env.STAGE === 'production' ? 0.1 : 1,
    beforeSend(event) {
      event.user = undefined;
      if (event.request) {
        event.request.cookies = undefined;
        event.request.data = undefined;
        event.request.headers = undefined;
        if (event.request.url) {
          const url = new URL(event.request.url);
          event.request.url = `${url.origin}${url.pathname}`;
        }
      }
      event.breadcrumbs = event.breadcrumbs?.map(
        ({ data: _data, message: _message, ...rest }) => rest,
      );
      for (const exception of event.exception?.values ?? []) {
        exception.value = 'Redacted error';
      }
      return event;
    },
  }),
  serverEntry,
);
