import { normalizeMessage } from '@/ai/utils/normalize-message';
import { db } from '@/core/database';
import { env } from '@/core/env';
import { getQuotaLedgerName } from '@/core/quotas/keys';
import type { Prettify } from '@/core/types/util';
import { createId } from '@/core/utils/id';
import { chatSuggestionsSchema } from '@/www/schemas/chat-suggestions';
import { useChat as useAIChat } from '@ai-sdk/react';
import { captureException as captureSentryException } from '@sentry/react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { getRequestIP } from '@tanstack/react-start/server';
import { type ChatInit, DefaultChatTransport, type UIMessage } from 'ai';
import { isNull } from 'drizzle-orm';
import { z } from 'zod';
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authMiddleware } from '../server/middleware/auth';
import { getChatMessageQuota } from '../server/utils/chat';

const getChat = createServerFn({ method: 'GET' })
  .validator(z.object({ chatId: z.string() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const readerId = context.user?.id ?? getRequestIP({ xForwardedFor: true });
    if (!readerId) return { chat: null };

    const chat = await db.query.chats.findFirst({
      where: (chats, { and, eq }) => and(eq(chats.id, data.chatId), eq(chats.userId, readerId)),
    });
    return { chat: chat ?? null };
  });

export const getChatQueryProps = (chatId: string) => ({
  queryKey: ['chat', { chatId }],
  queryFn: () => getChat({ data: { chatId } }),
});

const getChatMessages = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ chatId: z.string(), limit: z.number(), offset: z.number() }))
  .handler(async ({ context, data }) => {
    const readerId = context.user?.id ?? getRequestIP({ xForwardedFor: true });
    if (!readerId) return { messages: [], nextCursor: null };

    const messages = await db.query.messages.findMany({
      where: (messages, { eq, and, or, ne, not }) =>
        and(
          eq(messages.userId, readerId),
          eq(messages.chatId, data.chatId),
          not(messages.regenerated),
          or(isNull(messages.finishReason), ne(messages.finishReason, 'error')),
        ),
      limit: data.limit,
      offset: data.offset,
      orderBy: (messages, { desc }) => desc(messages.createdAt),
    });
    return {
      messages: messages.map(({ content, id, parts, role }) => ({ content, id, parts, role })),
      nextCursor: messages.length === data.limit ? data.offset + messages.length : null,
    };
  });

export const getChatMessagesQueryProps = (chatId: string) => ({
  queryKey: ['chat-messages', { chatId }],
  queryFn: async ({ pageParam }: { pageParam: number }) => {
    const page = await getChatMessages({ data: { chatId, limit: 10, offset: pageParam } });
    return { ...page, messages: page.messages.map(normalizeMessage) };
  },
  getNextPageParam: (lastPage: { nextCursor: number | null }) => lastPage.nextCursor,
  initialPageParam: 0,
});

export const getRemainingMessages = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const readerId = context.user?.id ?? getRequestIP({ xForwardedFor: true });
    if (!readerId) {
      return { remaining: { remaining: 0, reset: new Date() } };
    }

    const quota = await getChatMessageQuota({ user: context.user, roles: context.roles });
    if (quota.limit === null) {
      return {
        remaining: {
          remaining: Number.MAX_SAFE_INTEGER,
          reset: new Date(Date.now() + quota.windowMs),
        },
      };
    }

    const status = await env.QUOTA_LIMITER.getByName(
      getQuotaLedgerName('message', readerId),
    ).status({
      limit: quota.limit,
      windowMs: quota.windowMs,
    });
    return { remaining: { remaining: status.remaining, reset: new Date(status.resetAt) } };
  });

export const getRemainingMessagesQueryProps = () => ({
  queryKey: ['remaining-messages'],
  queryFn: () => getRemainingMessages(),
});

type ChatRequestBody = {
  additionalContext?: string;
  bibleAbbreviation?: string;
};

export type UseChatProps = Prettify<
  Omit<ChatInit<UIMessage>, 'generateId' | 'id' | 'transport'> & {
    body?: ChatRequestBody;
    id?: string;
  }
>;

export const useChat = (props: UseChatProps = {}) => {
  const queryClient = useQueryClient();
  const { body, id: providedId, onError, onFinish, ...chatOptions } = props;
  const [chatId, setChatId] = useState(() => providedId ?? createId());
  const [input, setInput] = useState('');

  useEffect(() => {
    setChatId(providedId ?? createId());
  }, [providedId]);

  const chatQuery = useQuery(getChatQueryProps(chatId));
  const remainingMessagesQuery = useQuery(getRemainingMessagesQueryProps());
  const chatSuggestionsMutation = useMutation({
    mutationFn: async ({ chatId: suggestionsChatId }: { chatId: string }) => {
      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chatId: suggestionsChatId }),
      });
      if (!response.ok) throw new Error('Unable to generate chat suggestions');
      return chatSuggestionsSchema.parse(await response.json());
    },
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ ...body, chatId }),
      }),
    [body, chatId],
  );

  const useChatResult = useAIChat({
    ...chatOptions,
    id: chatId,
    generateId: createId,
    transport,
    onError: (error) => {
      captureSentryException(error);
      onError?.(error);
    },
    onFinish: (event) => {
      void chatQuery.refetch();
      chatSuggestionsMutation.mutate({ chatId });
      void remainingMessagesQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
      onFinish?.(event);
    },
  });

  const messagesQuery = useInfiniteQuery({
    ...getChatMessagesQueryProps(chatId),
    placeholderData: (previous) => ({
      pageParams: previous?.pageParams ?? [0],
      pages: previous?.pages ?? [{ messages: [], nextCursor: null }],
    }),
  });

  useEffect(() => {
    if (messagesQuery.status !== 'success') return;
    useChatResult.setMessages(
      messagesQuery.data.pages.flatMap((page) => page.messages).toReversed(),
    );
  }, [useChatResult.setMessages, messagesQuery.status, messagesQuery.data]);

  const append = useCallback(
    ({ content }: { role: 'user'; content: string }) =>
      useChatResult.sendMessage({ text: content }),
    [useChatResult.sendMessage],
  );
  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  }, []);
  const handleSubmit = useCallback(
    (event?: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLDivElement>) => {
      event?.preventDefault();
      const text = input.trim();
      if (!text) return;
      setInput('');
      return useChatResult.sendMessage({ text });
    },
    [input, useChatResult.sendMessage],
  );

  return {
    ...useChatResult,
    append,
    chatQuery,
    chatSuggestionsResult: {
      object: chatSuggestionsMutation.data,
      isLoading: chatSuggestionsMutation.isPending,
      submit: chatSuggestionsMutation.mutate,
    },
    handleInputChange,
    handleSubmit,
    id: chatId,
    input,
    messagesQuery,
    remainingMessagesQuery,
    setInput,
  };
};
