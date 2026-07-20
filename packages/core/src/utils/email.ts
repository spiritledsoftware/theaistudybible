import { EmailQueueRecordSchema } from '@/email/schemas';
import type { EmailQueueRecord } from '@/email/types';
import { env } from '../env';

export async function queueEmail(email: EmailQueueRecord) {
  const validated = EmailQueueRecordSchema.parse(email);
  await env.EMAIL_QUEUE.send(validated);
  return { success: true };
}

export async function queueEmailBatch(emails: EmailQueueRecord[]) {
  if (emails.length > 100) {
    throw new Error('Email queue batches cannot exceed 100 messages');
  }
  const validated = emails.map((email) => EmailQueueRecordSchema.parse(email));
  await env.EMAIL_QUEUE.sendBatch(validated.map((body) => ({ body })));
  return { success: true };
}
