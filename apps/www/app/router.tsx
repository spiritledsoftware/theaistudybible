import { QueryClient } from '@tanstack/react-query';
import { Link, createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { Button } from './components/ui/button';
import { CodeBlock, H1, P } from './components/ui/typography';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 5,
        gcTime: 1000 * 60 * 60 * 24,
      },
    },
  });

  return routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      scrollRestoration: true,
      context: { queryClient },
      defaultPreload: 'intent',
      defaultErrorComponent: ({ error, reset }) => (
        <div className='flex min-h-full w-full flex-col items-center justify-center'>
          <div className='mx-auto flex max-w-3xl flex-col items-center justify-center px-2'>
            <H1>An error occurred</H1>
            <P>{error.message}</P>
            {error.stack && <CodeBlock className='mt-2'>{error.stack}</CodeBlock>}
            <Button className='mt-4' onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      ),
      defaultNotFoundComponent: () => (
        <div className='flex min-h-full w-full flex-col items-center justify-center'>
          <div className='mx-auto flex max-w-3xl flex-col items-center justify-center px-2'>
            <H1>Page not found</H1>
            <Button className='mt-4' asChild>
              <Link to='/'>Go home</Link>
            </Button>
          </div>
        </div>
      ),
    }),
    queryClient,
  );
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
