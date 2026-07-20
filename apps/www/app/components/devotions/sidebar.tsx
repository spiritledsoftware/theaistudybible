import { db } from '@/core/database';
import { ilike } from '@/core/database/utils';
import { toTitleCase } from '@/core/utils/string';
import type { Devotion } from '@/schemas/devotions/types';
import { cn } from '@/www/lib/utils';
import { getHighlightedContent } from '@/www/utils/get-highlighted-content';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { formatDate } from 'date-fns';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { useDevotionStore } from '../../contexts/devotion';
import { QueryBoundary } from '../query-boundary';
import { Button } from '../ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';
import { H3, H6 } from '../ui/typography';

const getDevotions = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      offset: z.number(),
      limit: z.number(),
      searchQuery: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const devotions = await db.query.devotions.findMany({
      where: (devotions, { and, eq, or }) =>
        and(
          eq(devotions.publicationStatus, 'PUBLISHED'),
          data.searchQuery
            ? or(
                ilike(devotions.topic, `%${data.searchQuery}%`),
                ilike(devotions.summary, `%${data.searchQuery}%`),
                ilike(devotions.reflection, `%${data.searchQuery}%`),
                ilike(devotions.prayer, `%${data.searchQuery}%`),
              )
            : undefined,
        ),
      orderBy: (devotions, { desc }) => desc(devotions.createdAt),
      offset: data.offset,
      limit: data.limit,
    });

    return {
      devotions,
      nextCursor: devotions.length === data.limit ? data.offset + devotions.length : null,
    };
  });

export const getDevotionsQueryOptions = (searchQuery?: string) => ({
  queryKey: ['devotions', { searchQuery }],
  queryFn: ({ pageParam }: { pageParam: number }) =>
    getDevotions({ data: { offset: pageParam, limit: 150, searchQuery } }),
  initialPageParam: 0,
  getNextPageParam: (lastPage: Awaited<ReturnType<typeof getDevotions>>) => lastPage.nextCursor,
});

export const DevotionSidebar = () => {
  const navigate = useNavigate();
  const devotionStore = useDevotionStore();
  const { isMobile, toggleSidebar } = useSidebar();

  const [searchQuery, setSearchQuery] = useState('');
  const devotionsQuery = useInfiniteQuery({
    ...getDevotionsQueryOptions(searchQuery),
    placeholderData: (prev) => prev,
  });

  return (
    <Sidebar
      variant='sheet'
      className='h-full pt-safe-offset-2 pr-1 pb-safe-offset-2 pl-safe-offset-2'
      gapFixerClassName='h-full'
    >
      <SidebarHeader className='flex flex-col gap-2'>
        <H3>Devotion History</H3>
        <div className='relative'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground' />
          <SidebarInput
            type='text'
            placeholder='Search devotions'
            value={searchQuery}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            className='pr-8 pl-9'
          />
          {searchQuery && (
            <Button
              variant='ghost'
              size='icon'
              className='-translate-y-1/2 absolute top-1/2 right-1 size-6 p-0.5'
              onClick={() => setSearchQuery('')}
            >
              <X className='size-4' />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <QueryBoundary
          query={devotionsQuery}
          render={(data) => {
            const devotions = data.pages.flatMap((page) => page.devotions);
            return (
              <SidebarMenu className='pr-2'>
                {devotions.length > 0 ? (
                  devotions.map((devotion, idx) => (
                    <SidebarMenuItem
                      key={devotion.id}
                      data-index={idx}
                      className={cn(
                        'group flex h-fit w-full items-center justify-between overflow-hidden rounded-lg px-1 hover:bg-accent',
                        devotionStore.devotion?.id === devotion.id && 'bg-muted',
                      )}
                    >
                      <SidebarMenuButton
                        onClick={() => {
                          devotionStore.setDevotion(devotion);
                          navigate({ to: `/devotion/${devotion.id}` });
                          if (isMobile) {
                            toggleSidebar();
                          }
                        }}
                        className='flex min-h-fit w-full flex-1 grow overflow-hidden px-2 py-1 text-left'
                      >
                        <div className='flex w-full flex-col overflow-hidden'>
                          <span className='line-clamp-2'>
                            {getHighlightedContent(toTitleCase(devotion.topic), searchQuery)}
                          </span>
                          <span className='text-muted-foreground text-xs'>
                            {formatDate(devotion.createdAt, 'MMMM d, yyyy')}
                          </span>
                          {searchQuery.trim() !== '' &&
                            renderHighlightedContent(devotion, searchQuery)}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <div className='flex h-full w-full flex-1 items-center justify-center px-5 py-10'>
                    <H6>No devotions found</H6>
                  </div>
                )}
                {devotionsQuery.hasNextPage && (
                  <Button
                    className='w-full'
                    disabled={devotionsQuery.isFetchingNextPage}
                    onClick={() => devotionsQuery.fetchNextPage()}
                  >
                    Load More
                  </Button>
                )}
              </SidebarMenu>
            );
          }}
        />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};

const renderHighlightedContent = (devotion: Devotion, query: string) => {
  // Early return if query is empty
  if (!query || query.trim() === '') {
    return null;
  }

  const normalizedQuery = query.toLowerCase();

  // Check if bibleReading exists and contains the query
  if (devotion.bibleReading?.toLowerCase().includes(normalizedQuery)) {
    return (
      <span className='mt-1 text-xs'>
        {getHighlightedContent(devotion.bibleReading, query, 50)}
      </span>
    );
  }

  // Check if summary exists and contains the query
  if (devotion.summary?.toLowerCase().includes(normalizedQuery)) {
    return (
      <span className='mt-1 text-xs'>{getHighlightedContent(devotion.summary, query, 50)}</span>
    );
  }

  // Check if reflection exists and contains the query
  if (devotion.reflection?.toLowerCase().includes(normalizedQuery)) {
    return (
      <span className='mt-1 text-xs'>{getHighlightedContent(devotion.reflection, query, 50)}</span>
    );
  }

  // Check if prayer exists and contains the query
  if (devotion.prayer?.toLowerCase().includes(normalizedQuery)) {
    return (
      <span className='mt-1 text-xs'>{getHighlightedContent(devotion.prayer, query, 50)}</span>
    );
  }

  return null;
};
