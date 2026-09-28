import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

let allowlist: RegExp[] | undefined;
if (import.meta.env.DEV) allowlist = [/^\/$/];

// Pages are server-rendered per request and per Reader, so navigations always go to the
// network. The precached '/' shell is only the offline fallback. Workbox uses the first
// matching route, so this must be registered before the precache route, which would
// otherwise answer navigations to '/' with the shell cached at install time.
registerRoute(
  new NavigationRoute(
    async ({ request }) => {
      try {
        return await fetch(request);
      } catch {
        return (await matchPrecache('/')) ?? Response.error();
      }
    },
    { allowlist },
  ),
);

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
clientsClaim();

// Push notification event handlers
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  if (!event.data) return;

  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    data: data.url || '/',
    icon: data.icon || '/pwa/512x512.png',
    badge: data.badge || '/pwa/512x512.png',
    tag: data.tag || 'default',
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Default action - open the app/specific URL
  const urlToOpen = event.notification.data || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen) {
          return client.focus();
        }
        return client.navigate(urlToOpen);
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});
