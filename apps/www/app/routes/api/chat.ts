import { createChatChain } from '@/ai/chat';
import { db } from '@/core/database';
import { chats, messages as messagesTable } from '@/core/database/schema';
import { env } from '@/core/env';
import { getQuotaLedgerName } from '@/core/quotas/keys';
import { getPosthog } from '@/core/utils/posthog';
import type { Bible } from '@/schemas/bibles/types';
import type { Role } from '@/schemas/roles/types';
import type { UserSettings } from '@/schemas/users/types';
import { JSONSchema } from '@/schemas/utils/metadata';
import { authenticate, getUserRolesAndSettings } from '@/www/server/utils/authenticate';
import { getChatMessageQuota } from '@/www/server/utils/chat';
import { createId } from '@paralleldrive/cuid2';
import { createFileRoute } from '@tanstack/react-router';
import { getRequestIP } from '@tanstack/react-start/server';
import { createUIMessageStreamResponse } from 'ai';
import { formatDate } from 'date-fns';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const uiMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['system', 'user', 'assistant']),
  parts: z.array(JSONSchema),
});

const chatApiSchema = z.object({
  messages: z.array(uiMessageSchema),
  chatId: z.string().nullish(),
  bibleAbbreviation: z.string().nullish(),
  additionalContext: z.string().nullish(),
});

function messageText(message: z.infer<typeof uiMessageSchema>) {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('');
}

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const validationResult = chatApiSchema.safeParse(await request.json());
        if (!validationResult.success) {
          return Response.json({ error: validationResult.error.message }, { status: 400 });
        }

        const { user } = await authenticate();
        let settings: UserSettings | null = null;
        let roles: Role[] | null = null;
        if (user) {
          ({ settings, roles } = await getUserRolesAndSettings(user.id));
        }

        const input = validationResult.data;
        const analyticsId = createId();
        const rateLimitKey = user?.id ?? getRequestIP({ xForwardedFor: true });
        if (!rateLimitKey) {
          return Response.json({ message: 'We were unable to identify you.' }, { status: 401 });
        }

        const chatId = input.chatId ?? createId();
        let chat = await db.query.chats.findFirst({
          where: (chats, { eq }) => eq(chats.id, chatId),
        });
        if (chat) {
          if (chat.userId !== rateLimitKey) {
            return Response.json(
              { message: 'You are not authorized to access this chat' },
              { status: 403 },
            );
          }
        } else {
          [chat] = await db.insert(chats).values({ id: chatId, userId: rateLimitKey }).returning();
        }

        let bible: Bible | undefined;
        if (input.bibleAbbreviation) {
          bible = await db.query.bibles.findFirst({
            where: (bibles, { eq }) => eq(bibles.abbreviation, input.bibleAbbreviation!),
          });
          if (!bible) {
            return Response.json({ message: 'Invalid Bible ID' }, { status: 400 });
          }
        } else if (settings?.preferredBibleAbbreviation) {
          bible = await db.query.bibles.findFirst({
            where: (bibles, { eq }) =>
              eq(bibles.abbreviation, settings!.preferredBibleAbbreviation!),
          });
        }

        const lastMessage = input.messages.at(-1);
        if (!lastMessage || lastMessage.role !== 'user') {
          return Response.json({ message: 'You must provide a user message' }, { status: 400 });
        }

        const existingMessage = await db.query.messages.findFirst({
          where: (messages, { eq }) => eq(messages.id, lastMessage.id),
        });
        if (
          existingMessage &&
          (existingMessage.userId !== rateLimitKey || existingMessage.chatId !== chat.id)
        ) {
          return Response.json(
            { message: 'You are not authorized to access this message' },
            { status: 403 },
          );
        }

        const quota = await getChatMessageQuota({ user, roles });
        const limiter = env.QUOTA_LIMITER.getByName(getQuotaLedgerName('message', rateLimitKey));
        const reservationId = createId();
        let quotaFinalization: Promise<void> | undefined =
          quota.limit === null ? Promise.resolve() : undefined;
        const finalizeQuota = (outcome: 'commit' | 'rollback') => {
          quotaFinalization ??= limiter[outcome](reservationId);
          return quotaFinalization;
        };

        if (quota.limit !== null) {
          const reservation = await limiter.reserve({
            id: reservationId,
            limit: quota.limit,
            windowMs: quota.windowMs,
          });
          if (!reservation.allowed) {
            return Response.json(
              {
                message: `You have exceeded your daily chat limit. Upgrade to pro or try again at ${formatDate(reservation.resetAt, 'M/d/yy h:mm a')}.`,
              },
              { status: 429 },
            );
          }
        }

        try {
          const storedMessage = {
            content: messageText(lastMessage),
            parts: lastMessage.parts,
            role: lastMessage.role,
            updatedAt: new Date(),
          };
          if (existingMessage) {
            await db
              .update(messagesTable)
              .set(storedMessage)
              .where(eq(messagesTable.id, existingMessage.id));
          } else {
            await db.insert(messagesTable).values({
              ...storedMessage,
              id: lastMessage.id,
              chatId: chat.id,
              userId: rateLimitKey,
            });
          }

          getPosthog()?.capture({
            distinctId: analyticsId,
            event: 'message sent',
            properties: { role: lastMessage.role },
          });

          const stream = await createChatChain({
            abortSignal: request.signal,
            additionalContext: input.additionalContext,
            bible,
            chat,
            onEnd: async (event) => {
              if (event.isAborted || !event.finishReason || event.finishReason === 'error') {
                await finalizeQuota('rollback');
              } else {
                await finalizeQuota('commit');
              }
              getPosthog()?.capture({
                distinctId: analyticsId,
                event: 'message event finished',
                properties: {
                  finishReason: event.finishReason,
                  isAborted: event.isAborted,
                },
              });
            },
            onError: async () => {
              await finalizeQuota('rollback');
            },
            onStepEnd: () => {
              getPosthog()?.capture({
                distinctId: analyticsId,
                event: 'message step finished',
              });
            },
            roles,
            settings,
            user,
            userId: rateLimitKey,
          });

          return createUIMessageStreamResponse({ stream });
        } catch (error) {
          await finalizeQuota('rollback');
          throw error;
        }
      },
    },
  },
});
