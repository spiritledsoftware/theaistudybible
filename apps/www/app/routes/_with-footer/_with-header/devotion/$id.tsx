import { db } from '@/core/database';
import { toTitleCase } from '@/core/utils/string';
import { DevotionMenu } from '@/www/components/devotions/menu';
import { DevotionSidebar, getDevotionsQueryOptions } from '@/www/components/devotions/sidebar';
import { QueryBoundary } from '@/www/components/query-boundary';
import { Button } from '@/www/components/ui/button';
import { Markdown } from '@/www/components/ui/markdown';
import { SidebarProvider } from '@/www/components/ui/sidebar';
import { H2, H3 } from '@/www/components/ui/typography';
import { useDevotionStore } from '@/www/contexts/devotion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useState } from 'react';
import { useWindowSize } from 'usehooks-ts';
import { z } from 'zod';

export const Route = createFileRoute('/_with-footer/_with-header/devotion/$id')({
  params: z.object({ id: z.string() }),
  head: ({ params }) => {
    const id = params.id;
    return {
      title: `Devotion ${id} | The AI Study Bible`,
      meta: [{ name: 'description', content: 'Daily Bible Devotional | The AI Study Bible' }],
    };
  },
  component: RouteComponent,
});

const getDevotion = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    const devotion = await db.query.devotions.findFirst({
      where: (devotions, { and, eq }) =>
        and(eq(devotions.id, id), eq(devotions.publicationStatus, 'PUBLISHED')),
      with: { images: true },
    });
    return { devotion: devotion ?? null };
  });

const getDevotionQueryOptions = (id: string) => ({
  queryKey: ['devotion', { id }] as const,
  queryFn: () => getDevotion({ data: { id } }),
  staleTime: 1000 * 60 * 60, // 1 hour
});

function RouteComponent() {
  const { id } = Route.useParams();
  const devotionStore = useDevotionStore((s) => ({
    setDevotion: s.setDevotion,
  }));
  const queryClient = useQueryClient();

  // Prefetch devotions list
  useEffect(() => {
    queryClient.prefetchInfiniteQuery(getDevotionsQueryOptions());
  }, [queryClient]);

  const devotionQuery = useQuery(getDevotionQueryOptions(id));

  useEffect(() => {
    if (devotionQuery.status === 'success' && devotionQuery.data?.devotion) {
      devotionStore.setDevotion(devotionQuery.data.devotion);
    }
  }, [devotionQuery.status, devotionQuery.data, devotionStore]);

  const { width } = useWindowSize();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(width < 768);
  }, [width]);

  return (
    <SidebarProvider
      className='min-h-full flex-1 overflow-hidden'
      style={
        {
          '--sidebar-width': '20rem',
        } as React.CSSProperties
      }
      defaultOpen={!isMobile}
    >
      <DevotionSidebar />
      <div className='flex w-full flex-1 flex-col overflow-hidden'>
        <div className='flex w-full flex-1 flex-col overflow-y-auto'>
          <DevotionMenu />
          <QueryBoundary
            query={devotionQuery}
            render={({ devotion }) => {
              if (!devotion) {
                return (
                  <div className='flex w-full flex-1 flex-col items-center justify-center gap-4'>
                    <H3>Devotion not found</H3>
                    <Button asChild>
                      <Link to='/devotion'>Go back to Devotions</Link>
                    </Button>
                  </div>
                );
              }

              return (
                <>
                  <MetaTags devotion={devotion} />
                  <div className='flex w-full flex-1 flex-col'>
                    <div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 whitespace-pre-wrap px-5 pt-10 pb-20'>
                      {devotion.images && (
                        <img
                          src={devotion.images.url!}
                          className='h-auto w-full rounded-lg shadow-sm'
                          alt='Illustration for the devotion'
                        />
                      )}
                      <div className='flex flex-col gap-2 text-center'>
                        <H2 className='inline-block bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-transparent dark:from-accent-foreground dark:to-secondary-foreground'>
                          Reading
                        </H2>
                        <Markdown>{devotion.bibleReading}</Markdown>
                      </div>
                      <div className='flex flex-col gap-2'>
                        <H2 className='inline-block bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-center text-transparent dark:from-accent-foreground dark:to-secondary-foreground'>
                          Summary
                        </H2>
                        <Markdown>{devotion.summary}</Markdown>
                      </div>
                      {devotion.reflection && (
                        <div className='flex flex-col gap-2'>
                          <H2 className='inline-block bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-center text-transparent dark:from-accent-foreground dark:to-secondary-foreground'>
                            Reflection
                          </H2>
                          <Markdown>{devotion.reflection}</Markdown>
                        </div>
                      )}
                      {devotion.prayer && (
                        <div className='flex flex-col gap-2'>
                          <H2 className='inline-block bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-center text-transparent dark:from-accent-foreground dark:to-secondary-foreground'>
                            Prayer
                          </H2>
                          <Markdown>{devotion.prayer}</Markdown>
                        </div>
                      )}
                      {devotion.diveDeeperQueries && (
                        <div className='flex flex-col gap-2'>
                          <H2 className='inline-block bg-linear-to-r from-primary to-accent-foreground bg-clip-text text-center text-transparent dark:from-accent-foreground dark:to-secondary-foreground'>
                            Dive Deeper
                          </H2>
                          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                            {devotion.diveDeeperQueries.map((query) => (
                              <Button
                                key={query}
                                asChild
                                variant='outline'
                                className='h-auto w-full whitespace-normal py-3 text-left'
                              >
                                <Link to='/chat' search={{ query }}>
                                  {query}
                                </Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            }}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}

const MetaTags = ({
  devotion,
}: {
  devotion: NonNullable<Awaited<ReturnType<typeof getDevotion>>['devotion']>;
}) => {
  const topic = useMemo(() => toTitleCase(devotion.topic), [devotion.topic]);
  const title = useMemo(() => `${topic} - Daily Bible Devotional | The AI Study Bible`, [topic]);
  const description = useMemo(
    () =>
      `Explore our daily devotional on ${topic}. Find spiritual insights, biblical wisdom, and guided prayer for deeper faith and understanding with The AI Study Bible.`,
    [topic],
  );
  const keywords = useMemo(
    () =>
      `bible devotional, ${topic.toLowerCase()}, daily devotion, bible study, spiritual growth, christian meditation, prayer, biblical wisdom, AI bible study`,
    [topic],
  );

  return (
    <>
      <title>{title}</title>
      <meta name='description' content={description} />
      <meta name='keywords' content={keywords} />
      <meta property='og:title' content={title} />
      <meta property='og:description' content={description} />
      <meta property='og:type' content='article' />
      <meta name='twitter:card' content='summary' />
      <meta name='twitter:title' content={title} />
      <meta name='twitter:description' content={description} />
    </>
  );
};
