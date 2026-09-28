import type { DeadLetterEmailSchema } from '@/email/schemas/dead-letter';
import type { z } from 'zod';

type DeadLetterMessageMetadata = Pick<Message, 'id' | 'timestamp' | 'attempts'>;

/**
 * Builds the admin summary for a dead-letter batch from delivery metadata only.
 * Message bodies are deliberately never read so user content and email
 * addresses cannot leak into the summary.
 */
export function buildDeadLetterEmailBody(
  queue: string,
  messages: readonly DeadLetterMessageMetadata[],
): z.infer<typeof DeadLetterEmailSchema> {
  return {
    type: 'dead-letter',
    queue,
    messages: messages.map(({ id, timestamp, attempts }) => ({
      id,
      timestamp: timestamp.toISOString(),
      attempts,
    })),
  };
}
