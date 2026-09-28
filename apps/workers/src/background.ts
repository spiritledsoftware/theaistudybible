import { generateDevotion } from '@/ai/devotion';
import { lucia } from '@/core/auth/lucia';
import { db } from '@/core/database';
import {
  pushSubscriptions,
  queueDeliveries,
  roles,
  users,
  usersToRoles,
} from '@/core/database/schema';
import { env, type RuntimeEnv } from '@/core/env';
import { createBibleFromDblZip } from '@/core/utils/bibles/create-from-dbl-zip';
import { insertChapter, insertVerses } from '@/core/utils/bibles/index-chapter';
import { generateChapterEmbeddings } from '@/core/utils/bibles/generate-chapter-embeddings';
import { queueEmailBatch } from '@/core/utils/email';
import { createId } from '@/core/utils/id';
import { toTitleCase } from '@/core/utils/string';
import { EmailQueueRecordSchema } from '@/email/schemas';
import { getEmailHtml } from '@/email/utils/render';
import { getEmailDeliveryId } from '@/email/idempotency';
import { ContentSchema } from '@/schemas/bibles/contents';
import * as Sentry from '@sentry/cloudflare';
import { formatDate } from 'date-fns';
import { eq, lt } from 'drizzle-orm';
import webPush, { WebPushError } from 'web-push';
import { z } from 'zod';
import { AppCache } from './app-cache';
import { syncGroundingSource } from './grounding-source';
import { buildDeadLetterEmailBody } from './dead-letter';
import { QuotaLimiter } from './quota-limiter';

const EMAIL_SENDER = { email: 'noreply@theaistudybible.com', name: 'The AI Study Bible' };
const EMAIL_REPLY_TO = 'info@theaistudybible.com';

export { AppCache, QuotaLimiter };

const archiveMessageSchema = z.object({
  type: z.literal('archive'),
  key: z.string().min(1),
  publicationId: z.string().min(1).optional(),
  generateEmbeddings: z.boolean(),
});

const notificationMessageSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(2_000),
  url: z.string().default('/'),
});

const chapterContentSchema = z.object({
  contents: ContentSchema.array(),
  verseContents: z.record(z.string(), z.object({ contents: ContentSchema.array() })),
});

const chapterMessageSchema = z.object({
  type: z.literal('chapter'),
  bibleAbbreviation: z.string().min(1),
  bookCode: z.string().min(1),
  previousCode: z.string().optional(),
  nextCode: z.string().optional(),
  chapterNumber: z.string().min(1),
  content: chapterContentSchema,
  generateEmbeddings: z.boolean(),
  overwrite: z.boolean(),
});

async function runIdempotentQueueEffect(
  queue: string,
  messageId: string,
  effect: () => Promise<void>,
  suffix?: string,
) {
  const key = [queue, messageId, suffix].filter(Boolean).join(':');
  const [claim] = await db
    .insert(queueDeliveries)
    .values({ key, queue, messageId })
    .onConflictDoNothing()
    .returning({ key: queueDeliveries.key });
  if (!claim) return;
  try {
    await effect();
  } catch (error) {
    await db.delete(queueDeliveries).where(eq(queueDeliveries.key, key));
    throw error;
  }
}

async function sendEmail(input: unknown) {
  const record = EmailQueueRecordSchema.parse(input);
  const html = await getEmailHtml(record.body);
  await env.EMAIL.send({
    from: EMAIL_SENDER,
    replyTo: EMAIL_REPLY_TO,
    to: record.to,
    cc: record.cc,
    bcc: record.bcc,
    subject: record.subject,
    html,
  });
}

async function getAdminEmails() {
  const admins = await db
    .select({ email: users.email })
    .from(users)
    .innerJoin(usersToRoles, eq(usersToRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, usersToRoles.roleId))
    .where(eq(roles.id, 'admin'));
  return [...new Set(admins.map((admin) => admin.email))];
}

/**
 * Reports dead-lettered messages to Sentry and emails one metadata-only summary
 * to admins directly (never via the email queue, which could loop back here).
 * Always acks: a failed summary must not cause endless redelivery.
 */
async function handleDeadLetterBatch(batch: MessageBatch) {
  for (const message of batch.messages) {
    Sentry.captureMessage('Queue message dead-lettered', {
      level: 'error',
      tags: { queue: batch.queue },
      extra: {
        messageId: message.id,
        attempts: message.attempts,
        enqueuedAt: message.timestamp.toISOString(),
      },
    });
  }

  try {
    const recipients = await getAdminEmails();
    if (recipients.length > 0) {
      const html = await getEmailHtml(buildDeadLetterEmailBody(batch.queue, batch.messages));
      await env.EMAIL.send({
        from: EMAIL_SENDER,
        to: recipients,
        subject: `Dead-letter queue: ${batch.messages.length} message(s) on ${env.STAGE}`,
        html,
      });
    }
  } catch (error) {
    // Report only the error code: provider messages may echo recipient addresses.
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
    Sentry.captureException(new Error(`Dead-letter summary email failed (${code})`), {
      tags: { queue: batch.queue },
      extra: { messageIds: batch.messages.map((message) => message.id) },
    });
  }

  batch.ackAll();
}

async function processBibleMessage(input: unknown) {
  const archive = archiveMessageSchema.safeParse(input);
  if (archive.success) {
    const object = await env.PRIVATE_SOURCES.get(archive.data.key);
    if (!object) throw new Error('Bible archive not found');
    await createBibleFromDblZip({
      zipBuffer: new Uint8Array(await object.arrayBuffer()),
      overwrite: true,
      publicationId: archive.data.publicationId,
      generateEmbeddings: archive.data.generateEmbeddings,
    });
    return;
  }

  const message = chapterMessageSchema.parse(input);
  const bibleData = await db.query.bibles.findFirst({
    where: (bibles, { eq: equals }) => equals(bibles.abbreviation, message.bibleAbbreviation),
    with: { books: { where: (books, { eq: equals }) => equals(books.code, message.bookCode) } },
  });
  if (!bibleData) throw new Error('Bible not found');
  const { books, ...bible } = bibleData;
  const book = books[0];
  if (!book) throw new Error('Bible book not found');

  const chapter = await insertChapter({
    bible,
    book,
    previousCode: message.previousCode,
    nextCode: message.nextCode,
    chapterNumber: message.chapterNumber,
    contents: message.content,
    overwrite: message.overwrite,
  });
  const verses = await insertVerses({
    bible,
    book,
    chapter,
    content: message.content,
    overwrite: message.overwrite,
  });
  if (message.generateEmbeddings) {
    await generateChapterEmbeddings({
      bible,
      book,
      chapter,
      verses: verses.map((verse) => ({
        ...verse,
        content: message.content.verseContents[verse.number]?.contents ?? [],
      })),
      overwrite: message.overwrite,
    });
  }
}

async function sendPushNotification(input: unknown, idempotencyKey?: string) {
  const notification = notificationMessageSchema.parse(input);
  webPush.setVapidDetails(
    'mailto:support@theaistudybible.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  const subscriptions = await db.query.pushSubscriptions.findMany();
  await Promise.all(
    subscriptions.map(async (subscription) => {
      const send = async () => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(notification),
          );
        } catch (error) {
          if (error instanceof WebPushError && error.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
            return;
          }
          throw error;
        }
      };
      if (idempotencyKey) {
        await runIdempotentQueueEffect('push-subscription', idempotencyKey, send, subscription.id);
      } else {
        await send();
      }
    }),
  );
}

async function sendDevotionNotifications() {
  const existing = await db.query.devotions.findFirst({
    where: (devotions, { and, eq: equals, sql }) =>
      and(
        equals(devotions.publicationStatus, 'PUBLISHED'),
        sql`DATE(${devotions.createdAt}) = ${formatDate(new Date(), 'yyyy-MM-dd')}`,
      ),
    with: { images: true },
  });

  const notificationContent = existing
    ? (() => {
        const { images, ...devotion } = existing;
        if (!images) throw new Error('Published devotional image is missing');
        return { devotion, image: images };
      })()
    : await generateDevotion().then(({ image, ...devotion }) => ({ devotion, image }));
  const { devotion, image } = notificationContent;
  const settings = await db.query.userSettings.findMany({
    where: (userSettings, { eq: equals }) => equals(userSettings.emailNotifications, true),
    columns: {},
    with: { user: { columns: { id: true, email: true } } },
  });
  for (let offset = 0; offset < settings.length; offset += 100) {
    await queueEmailBatch(
      settings.slice(offset, offset + 100).map((setting) => ({
        idempotencyKey: `devotion:${devotion.id}:email:${setting.user.id}`,
        to: [setting.user.email],
        subject: `Today's Devotion: ${toTitleCase(devotion.topic)}`,
        body: { type: 'daily-devotion', devotion, devotionImage: image },
      })),
    );
  }

  await sendPushNotification(
    {
      title: `Today's Devotion: ${toTitleCase(devotion.topic)}`,
      body: devotion.bibleReading,
      url: `${env.WEB_APP_URL}/devotion/${devotion.id}`,
    },
    `devotion:${devotion.id}`,
  );
}

async function queueScheduledGroundingSources() {
  const sources = await db.query.dataSources.findMany();
  const now = Date.now();
  const intervals = { DAILY: 86_400_000, WEEKLY: 604_800_000, MONTHLY: 2_592_000_000 } as const;
  await Promise.all(
    sources.map(async (source) => {
      if (source.syncSchedule === 'NEVER' || source.approvalStatus !== 'APPROVED') return;
      const lastRun = source.lastAutomaticSync?.getTime() ?? 0;
      if (now - lastRun >= intervals[source.syncSchedule]) {
        await env.GROUNDING_SOURCE_QUEUE.send({ id: source.id, manual: false });
      }
    }),
  );
}

async function withLease(name: string, durationMs: number, task: () => Promise<void>) {
  const cache = env.CACHE.getByName('scheduled-jobs');
  const token = createId();
  const now = Date.now();
  const acquired = await cache.acquireLease(name, { token, now, expiresAt: now + durationMs });
  if (!acquired) return;
  try {
    await task();
  } finally {
    await cache.releaseLease(name, token);
  }
}

const worker: ExportedHandler<RuntimeEnv> = {
  async queue(batch) {
    // Matched first so no other queue-name substring check can capture it.
    if (batch.queue.includes('dead-letter')) {
      await handleDeadLetterBatch(batch);
      return;
    }
    for (const message of batch.messages) {
      try {
        const emailRecord = batch.queue.includes('email')
          ? EmailQueueRecordSchema.parse(message.body)
          : undefined;
        const deliveryId = emailRecord ? getEmailDeliveryId(emailRecord, message.id) : message.id;
        await runIdempotentQueueEffect(batch.queue, deliveryId, async () => {
          if (emailRecord) {
            await sendEmail(emailRecord);
          } else if (batch.queue.includes('bible-import')) {
            await processBibleMessage(message.body);
          } else if (batch.queue.includes('grounding-source')) {
            await syncGroundingSource(message.body);
          } else if (batch.queue.includes('devotional')) {
            await withLease('daily-devotion', 55 * 60 * 1000, sendDevotionNotifications);
          } else if (batch.queue.includes('notification')) {
            await sendPushNotification(message.body, message.id);
          } else {
            throw new Error(`Unsupported queue: ${batch.queue}`);
          }
        });
        message.ack();
      } catch (error) {
        Sentry.captureException(error, {
          tags: { queue: batch.queue },
          extra: { messageId: message.id },
        });
        message.retry({ delaySeconds: 30 });
      }
    }
  },

  async scheduled(controller) {
    if (controller.cron === '0 0 * * *') {
      await withLease('daily-devotion', 55 * 60 * 1000, sendDevotionNotifications);
      return;
    }
    await withLease('hourly-maintenance', 55 * 60 * 1000, async () => {
      await Promise.all([
        env.CACHE.getByName('shared').set('maintenance:last-run', Date.now()),
        queueScheduledGroundingSources(),
        db
          .delete(queueDeliveries)
          .where(lt(queueDeliveries.processedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000))),
      ]);
      await lucia.sessions.deleteExpiredSessions();
    });
  },
};

export default Sentry.withSentry(
  (runtimeEnv: RuntimeEnv) => ({
    dsn: runtimeEnv.SENTRY_DSN,
    environment: runtimeEnv.STAGE,
    sendDefaultPii: false,
    tracesSampleRate: runtimeEnv.STAGE === 'production' ? 0.1 : 1,
  }),
  worker,
);
