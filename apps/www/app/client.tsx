import * as Sentry from '@sentry/react';
import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  sendDefaultPii: false,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: import.meta.env.DEV
    ? 0
    : import.meta.env.VITE_STAGE === 'production'
      ? 0.1
      : 0.25,
  beforeSend(event) {
    event.user = undefined;
    if (event.request) {
      event.request.cookies = undefined;
      event.request.data = undefined;
      event.request.headers = undefined;
      if (event.request.url) {
        const url = new URL(event.request.url, window.location.origin);
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
});

hydrateRoot(document, <StartClient />);
