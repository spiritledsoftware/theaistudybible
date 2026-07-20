import { db } from '@/core/database';
import { chats as chatsTable, messages as messagesTable } from '@/core/database/schema';
import { ilike } from '@/core/database/utils';
import { useIsChatPage } from '@/www/hooks/use-is-chat-page';
import { cn } from '@/www/lib/utils';
import { requireAuthMiddleware } from '@/www/server/middleware/auth';
import { getHighlightedContent } from '@/www/utils/get-highlighted-content';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { formatDate } from 'date-fns';
import { type SQL, and, desc, eq, getTableColumns } from 'drizzle-orm';
import { Menu, PenBox, Search, X } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { useChatStore } from '../../../contexts/chat';
import { LogoSmall } from '../../branding/logo-small';
import { NavigationDropdown } from '../../navigation/dropdown';
import { QueryBoundary } from '../../query-boundary';
import { Button } from '../../ui/button';
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
} from '../../ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { H3, H6 } from '../../ui/typography';
import { DeleteChatButton } from './delete-chat-button';

const getChats = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({ offset: z.number(), limit: z.number(), searchQuery: z.string().optional() }),
  )
  .handler(async ({ context, data }) => {
    let chatCondition: SQL | undefined = eq(chatsTable.userId, context.user.id);
    if (data.searchQuery) {
      chatCondition = and(chatCondition, ilike(chatsTable.name, `%${data.searchQuery}%`));
    }
    const query = db
      .select({
        ...getTableColumns(chatsTable),
        ...(data.searchQuery ? { message: getTableColumns(messagesTable) } : {}),
      })
      .from(chatsTable)
      .where(chatCondition);
    if (data.searchQuery) {
      query.leftJoin(
        messagesTable,
        and(
          eq(chatsTable.id, messagesTable.chatId),
          ilike(messagesTable.content, `%${data.searchQuery}%`),
        ),
      );
    }
    query.orderBy(desc(chatsTable.updatedAt)).limit(data.limit).offset(data.offset);

    const chats = await query.execute();

    return {
      chats,
      nextCursor: chats.length === data.limit ? data.offset + chats.length : null,
    };
  });

export const getChatsQueryOptions = (searchQuery?: string) => ({
  queryKey: ['chats', { searchQuery }],
  queryFn: ({ pageParam }: { pageParam: number }) =>
    getChats({ data: { offset: pageParam, limit: 15, searchQuery } }),
  initialPageParam: 0,
  getNextPageParam: (lastPage: Awaited<ReturnType<typeof getChats>>) => lastPage.nextCursor,
});

export const ChatSidebar = () => {
  const navigate = useNavigate();

  const { chat: storeChat, setChat } = useChatStore((s) => ({
    chat: s.chat,
    setChat: s.setChat,
  }));
  const { isMobile, toggleSidebar } = useSidebar();

  const [searchQuery, setSearchQuery] = useState('');
  const chatsQuery = useInfiniteQuery({
    ...getChatsQueryOptions(searchQuery),
    placeholderData: (prev) => prev,
  });

  const isChatPage = useIsChatPage();

  return (
    <Sidebar
      className='h-full pt-safe-offset-2 pr-1 pb-safe-offset-2 pl-safe-offset-2'
      gapFixerClassName='h-full'
      variant={isChatPage ? 'sidebar' : 'sheet'}
    >
      <SidebarHeader className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <H3>Chat History</H3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                variant='ghost'
                onClick={() => {
                  setChat(null);
                  if (!isChatPage || isMobile) {
                    toggleSidebar();
                  }
                  if (isChatPage) {
                    navigate({ to: '/chat' });
                  }
                }}
                aria-label='Start new chat'
              >
                <PenBox />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        </div>
        <div className='relative'>
          <Search className='-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground' />
          <SidebarInput
            type='text'
            placeholder='Search chats'
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
          query={chatsQuery}
          render={(data) => {
            const chats = data.pages.flatMap((page) => page.chats);
            return (
              <SidebarMenu className='pr-2'>
                {chats.length === 0 ? (
                  <div className='flex h-full w-full flex-1 items-center justify-center px-5 py-10'>
                    <H6>No chats found</H6>
                  </div>
                ) : (
                  chats.map((chat, idx) => (
                    <SidebarMenuItem
                      key={chat.id}
                      data-index={idx}
                      className={cn(
                        'group/chat-item flex h-fit w-full items-center justify-between overflow-hidden rounded-lg px-1 hover:bg-accent',
                        storeChat?.id === chat.id && 'bg-muted',
                      )}
                    >
                      <SidebarMenuButton
                        onClick={() => {
                          setChat(chat);
                          if (isChatPage) {
                            navigate({ to: `/chat/${chat.id}` });
                          }
                          if (!isChatPage || isMobile) {
                            toggleSidebar();
                          }
                        }}
                        className='flex min-h-fit w-full flex-1 grow p-3 text-left'
                      >
                        <div className='flex w-full flex-col'>
                          <div className='truncate'>
                            {getHighlightedContent(chat.name, searchQuery)}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            {formatDate(chat.updatedAt, 'MMMM d, yyyy')}
                          </div>
                          {chat.message?.content && (
                            <div className='mt-1 text-xs'>
                              {getHighlightedContent(chat.message.content, searchQuery, 50)}
                            </div>
                          )}
                        </div>
                      </SidebarMenuButton>
                      <DeleteChatButton chat={chat} />
                    </SidebarMenuItem>
                  ))
                )}
                {chatsQuery.hasNextPage && (
                  <Button
                    className='w-full'
                    disabled={chatsQuery.isFetchingNextPage}
                    onClick={() => chatsQuery.fetchNextPage()}
                  >
                    Load More
                  </Button>
                )}
              </SidebarMenu>
            );
          }}
        />
      </SidebarContent>
      <SidebarFooter>
        {isChatPage && (
          <NavigationDropdown
            variant='ghost'
            className='flex h-fit w-full items-center justify-between px-4 py-1'
          >
            <LogoSmall
              width={128}
              height={64}
              className='h-auto w-24'
              lightClassName='dark:hidden'
            />
            <Menu />
          </NavigationDropdown>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
