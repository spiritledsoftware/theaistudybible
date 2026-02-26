import { StudyLoopTimeoutError } from '@/ai/study-loop';
import { db } from '@/core/database';
import { dailyStudySessions } from '@/core/database/schema';
import { getPosthog } from '@/core/utils/posthog';
import { createServerFn, json } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { z } from 'zod';
import { requireAuthMiddleware } from '../middleware/auth';
import { dailyStudyLoopService } from '../utils/daily-study-loop';

const startDailyStudySessionSchema = z.object({
  goal: z.string().trim().min(1, 'Daily study goal is required'),
  passageOrTopic: z.string().trim().min(1, 'Passage or topic is required'),
});

const saveDailyStudyNotesSchema = z.object({
  sessionId: z.string().min(1),
  notes: z.string().max(8_000),
});

const completeDailyStudySessionSchema = z.object({
  sessionId: z.string().min(1),
});

const getReturnedWithin7Days = async ({
  userId,
  startTime,
}: {
  userId: string;
  startTime: Date;
}) => {
  const sevenDaysAgo = subDays(startTime, 7);

  const previousSession = await db.query.dailyStudySessions.findFirst({
    columns: { id: true },
    where: (sessions, { and, eq, gte, lt }) =>
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, 'completed'),
        gte(sessions.startTime, sevenDaysAgo),
        lt(sessions.startTime, startTime),
      ),
  });

  return Boolean(previousSession);
};

export const startDailyStudySession = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(startDailyStudySessionSchema)
  .handler(async ({ data, context }) => {
    const startTime = new Date();
    const returnedWithin7Days = await getReturnedWithin7Days({
      userId: context.user.id,
      startTime,
    });

    try {
      const generated = await dailyStudyLoopService.generateStudyResponse({
        goal: data.goal,
        passageOrTopic: data.passageOrTopic,
      });

      const [session] = await db
        .insert(dailyStudySessions)
        .values({
          userId: context.user.id,
          goal: data.goal,
          passageOrTopic: data.passageOrTopic,
          passageContext: generated.passageContext,
          conciseExplanation: generated.conciseExplanation,
          reflectionPrompt: generated.reflectionPrompt,
          startTime,
          returnedWithin7Days,
          dailyActiveStudyBaseline: true,
          status: 'active',
        })
        .returning();

      getPosthog()?.capture({
        distinctId: context.user.id,
        event: 'daily study session started',
        properties: {
          sessionId: session.id,
          dailyActiveStudySessionBaseline: session.dailyActiveStudyBaseline,
          returnedWithin7Days: session.returnedWithin7Days,
          startTime: session.startTime.toISOString(),
        },
      });

      return { session };
    } catch (error) {
      const isTimeout = error instanceof StudyLoopTimeoutError;
      const failureReason =
        error instanceof Error ? error.message : 'Failed to generate daily study response';

      const [failedSession] = await db
        .insert(dailyStudySessions)
        .values({
          userId: context.user.id,
          goal: data.goal,
          passageOrTopic: data.passageOrTopic,
          passageContext: '',
          conciseExplanation: '',
          reflectionPrompt: '',
          startTime,
          returnedWithin7Days,
          dailyActiveStudyBaseline: true,
          status: 'failed',
          failureReason,
        })
        .returning();

      getPosthog()?.capture({
        distinctId: context.user.id,
        event: 'daily study session failed',
        properties: {
          sessionId: failedSession.id,
          dailyActiveStudySessionBaseline: failedSession.dailyActiveStudyBaseline,
          returnedWithin7Days: failedSession.returnedWithin7Days,
          failureReason,
          timeout: isTimeout,
        },
      });

      throw json(
        {
          message: isTimeout
            ? 'The study generation took too long. Please try again.'
            : 'We could not generate your study response right now. Please try again.',
        },
        { status: isTimeout ? 504 : 502 },
      );
    }
  });

export const saveDailyStudyNotes = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(saveDailyStudyNotesSchema)
  .handler(async ({ data, context }) => {
    const [session] = await db
      .update(dailyStudySessions)
      .set({ notes: data.notes })
      .where(
        and(
          eq(dailyStudySessions.id, data.sessionId),
          eq(dailyStudySessions.userId, context.user.id),
        ),
      )
      .returning();

    if (!session) {
      throw json({ message: 'Daily study session not found.' }, { status: 404 });
    }

    return { session };
  });

export const completeDailyStudySession = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(completeDailyStudySessionSchema)
  .handler(async ({ data, context }) => {
    const session = await db.query.dailyStudySessions.findFirst({
      where: (sessions, { and, eq }) =>
        and(eq(sessions.id, data.sessionId), eq(sessions.userId, context.user.id)),
    });

    if (!session) {
      throw json({ message: 'Daily study session not found.' }, { status: 404 });
    }

    if (session.status === 'completed' && session.recap) {
      return { session };
    }

    try {
      const recap = await dailyStudyLoopService.generateRecap({
        goal: session.goal,
        passageOrTopic: session.passageOrTopic,
        notes: session.notes,
        passageContext: session.passageContext,
        conciseExplanation: session.conciseExplanation,
        reflectionPrompt: session.reflectionPrompt,
      });

      const [updatedSession] = await db
        .update(dailyStudySessions)
        .set({
          recap,
          endTime: new Date(),
          status: 'completed',
          failureReason: null,
        })
        .where(
          and(
            eq(dailyStudySessions.id, session.id),
            eq(dailyStudySessions.userId, context.user.id),
          ),
        )
        .returning();

      getPosthog()?.capture({
        distinctId: context.user.id,
        event: 'daily study session completed',
        properties: {
          sessionId: updatedSession.id,
          returnedWithin7Days: updatedSession.returnedWithin7Days,
          notesLength: updatedSession.notes.length,
          hadNotes: Boolean(updatedSession.notes.trim()),
          completedAt: updatedSession.endTime?.toISOString(),
        },
      });

      return { session: updatedSession };
    } catch (error) {
      const isTimeout = error instanceof StudyLoopTimeoutError;
      const failureReason =
        error instanceof Error ? error.message : 'Failed to generate daily study recap';

      await db
        .update(dailyStudySessions)
        .set({
          endTime: new Date(),
          status: 'failed',
          failureReason,
        })
        .where(
          and(
            eq(dailyStudySessions.id, session.id),
            eq(dailyStudySessions.userId, context.user.id),
          ),
        );

      throw json(
        {
          message: isTimeout
            ? 'Recap generation timed out. Please try ending the session again.'
            : 'We could not generate your recap right now. Please try again.',
        },
        { status: isTimeout ? 504 : 502 },
      );
    }
  });
