import appCss from '@/www/styles/globals.css?url';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { NotificationPromptDialog } from '../components/notification-prompt-dialog';
import { Toaster } from '../components/ui/sonner';
import { BibleProvider } from '../contexts/bible';
import { ChatProvider } from '../contexts/chat';
import { DevotionProvider } from '../contexts/devotion';
import { ServiceWorkerProvider } from '../contexts/service-worker';
import { ThemeProvider, useTheme } from '../contexts/theme';
import { cn } from '../lib/utils';
import { getAuth } from '../server/functions/auth';
import { getSubscription } from '../server/functions/pro';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    const [{ auth }, { subscription, type }] = await Promise.all([getAuth(), getSubscription()]);
    return { ...auth, subscription, subscriptionType: type };
  },
  head: () => {
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'The AI Study Bible' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    };
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <ServiceWorkerProvider>
      <ThemeProvider defaultTheme='system' storageKey='asb-theme'>
        <RootDocument>
          <Outlet />
        </RootDocument>
      </ThemeProvider>
    </ServiceWorkerProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const { resolvedTheme } = useTheme();

  return (
    <html suppressHydrationWarning className={cn(resolvedTheme)}>
      <head>
        <HeadContent />
      </head>
      <body>
        <BibleProvider>
          <ChatProvider>
            <DevotionProvider>
              {children}
              <Toaster />
              <NotificationPromptDialog />
            </DevotionProvider>
          </ChatProvider>
        </BibleProvider>
        <TanStackRouterDevtools position='bottom-right' />
        <ReactQueryDevtools buttonPosition='bottom-left' />
        <Scripts />
        {import.meta.env.DEV && (
          <script crossOrigin='anonymous' src='//unpkg.com/react-scan/dist/auto.global.js' />
        )}
        {/* <PostHog /> */}
      </body>
    </html>
  );
}
