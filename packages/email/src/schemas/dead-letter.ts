import { z } from 'zod';

/**
 * Dead-letter summary sent to administrators. Carries only delivery metadata;
 * message bodies (which can contain email addresses and user content) never
 * reach this schema, and unknown keys are stripped on parse.
 */
export const DeadLetterEmailSchema = z.object({
  type: z.literal('dead-letter'),
  queue: z.string().min(1),
  messages: z
    .object({
      id: z.string().min(1),
      timestamp: z.string().datetime(),
      attempts: z.number().int().nonnegative(),
    })
    .array()
    .min(1),
});
