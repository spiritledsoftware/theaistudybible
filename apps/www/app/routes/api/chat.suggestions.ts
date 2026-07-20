import { getChatContextSize, getChatModel } from '@/ai/models';
import { getValidMessages } from '@/ai/utils/get-valid-messages';
import { messagesToString } from '@/ai/utils/messages-to-string';
import { db } from '@/core/database';
import { env } from '@/core/env';
import { getQuotaLedgerName } from '@/core/quotas/keys';
import { createId } from '@/core/utils/id';
import { getPosthog } from '@/core/utils/posthog';
import type { Role } from '@/schemas/roles/types';
import { chatSuggestionsSchema } from '@/www/schemas/chat-suggestions';
import { authenticate, getUserRolesAndSettings } from '@/www/server/utils/authenticate';
import { getChatSuggestionQuota } from '@/www/server/utils/chat';
import { createFileRoute } from '@tanstack/react-router';
import { getRequestIP } from '@tanstack/react-start/server';
import { generateText, Output } from 'ai';
import { formatDate } from 'date-fns';
import { z } from 'zod';

const chatSuggestionsApiSchema = z.object({
  chatId: z.string().min(1),
});

export const Route = createFileRoute('/api/chat/suggestions')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const validationResult = chatSuggestionsApiSchema.safeParse(await request.json());
        if (!validationResult.success) {
          return Response.json({ error: validationResult.error.message }, { status: 400 });
        }

        const { user } = await authenticate();
        let roles: Role[] | null = null;
        if (user) {
          ({ roles } = await getUserRolesAndSettings(user.id));
        }

        const rateLimitKey = user?.id ?? getRequestIP({ xForwardedFor: true });
        if (!rateLimitKey) {
          return Response.json({ message: 'We were unable to identify you.' }, { status: 401 });
        }

        const { chatId } = validationResult.data;
        const analyticsId = createId();
        const chat = await db.query.chats.findFirst({
          where: (chats, { eq }) => eq(chats.id, chatId),
        });
        if (!chat) {
          return Response.json({ message: 'Chat not found' }, { status: 404 });
        }
        if (chat.userId !== rateLimitKey) {
          return Response.json(
            { message: 'You are not authorized to access this chat' },
            { status: 403 },
          );
        }

        const quota = await getChatSuggestionQuota({ user, roles });
        const limiter = env.QUOTA_LIMITER.getByName(getQuotaLedgerName('suggestion', rateLimitKey));
        const reservationId = createId();
        if (quota.limit !== null) {
          const reservation = await limiter.reserve({
            id: reservationId,
            limit: quota.limit,
            windowMs: quota.windowMs,
          });
          if (!reservation.allowed) {
            return Response.json(
              {
                message: `You have exceeded your daily chat suggestions limit. Upgrade to pro or try again at ${formatDate(reservation.resetAt, 'M/d/yy h:mm a')}.`,
              },
              { status: 429 },
            );
          }
        }

        try {
          const messages = await getValidMessages({
            chatId,
            userId: rateLimitKey,
            maxTokens: getChatContextSize(),
          });
          const { output } = await generateText({
            abortSignal: request.signal,
            instructions:
              'Generate thought-provoking follow-up questions that move this Christian faith and theology conversation forward.',
            model: getChatModel(),
            output: Output.object({ schema: chatSuggestionsSchema }),
            prompt: `Here is the conversation (delimited by triple dashes):\n---\n${messagesToString(messages)}\n---\nWhat follow-up questions might the Reader ask?`,
          });

          if (quota.limit !== null) await limiter.commit(reservationId);
          getPosthog()?.capture({
            distinctId: analyticsId,
            event: 'chat suggestions requested',
          });
          return Response.json(output);
        } catch (error) {
          if (quota.limit !== null) await limiter.rollback(reservationId);
          throw error;
        }
      },
    },
  },
});
