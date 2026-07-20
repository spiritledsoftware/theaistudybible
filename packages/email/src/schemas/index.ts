import { z } from 'zod';
import { ForgotPasswordEmailSchema } from './auth/forgot-password';
import { DailyDevotionEmailSchema } from './daily-devotion';
import { DeadLetterEmailSchema } from './dead-letter';

export const EmailBodySchema = z.union([
  z.string(),
  z.discriminatedUnion('type', [
    ForgotPasswordEmailSchema,
    DeadLetterEmailSchema,
    DailyDevotionEmailSchema,
  ]),
]);

export const EmailQueueRecordSchema = z.object({
  idempotencyKey: z.string().min(1).max(300).optional(),
  subject: z.string(),
  to: z.string().email().array(),
  cc: z.string().email().array().optional(),
  bcc: z.string().email().array().optional(),
  body: EmailBodySchema,
});
