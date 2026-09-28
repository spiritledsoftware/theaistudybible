import { db } from '@/core/database';
import { QueryBoundary } from '@/www/components/query-boundary';
import { useDevotionStore } from '@/www/contexts/devotion';
import { useQuery } from '@tanstack/react-query';
import { Navigate, createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

export const Route = createFileRoute('/_with-footer/_with-header/devotion/')({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(getLatestDevotionQueryOptions);
  },
  component: RouteComponent,
});

const getLatestDevotion = createServerFn({ method: 'GET' }).handler(async () => {
  const devotion = await db.query.devotions.findFirst({
    where: (devotions, { eq }) => eq(devotions.publicationStatus, 'PUBLISHED'),
    orderBy: (devotions, { desc }) => desc(devotions.createdAt),
  });
  return { devotion: devotion ?? null };
});

const getLatestDevotionQueryOptions = {
  queryKey: ['latest-devotion'],
  queryFn: () => getLatestDevotion(),
};

function RouteComponent() {
  const devotionQuery = useQuery(getLatestDevotionQueryOptions);
  const devotionStore = useDevotionStore();

  if (devotionStore.devotion) {
    return <Navigate to='/devotion/$id' params={{ id: devotionStore.devotion.id }} />;
  }

  return (
    <QueryBoundary query={devotionQuery}>
      {({ devotion }) => {
        if (!devotion) {
          return (
            <div className='flex h-full w-full items-center justify-center p-10'>
              Latest devotion not found
            </div>
          );
        }

        return <Navigate to='/devotion/$id' params={{ id: devotion.id }} />;
      }}
    </QueryBoundary>
  );
}
