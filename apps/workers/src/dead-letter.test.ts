import { describe, expect, it } from 'vitest';
import { DeadLetterEmailSchema } from '@/email/schemas/dead-letter';
import { buildDeadLetterEmailBody } from './dead-letter';

describe('buildDeadLetterEmailBody', () => {
  it('summarizes delivery metadata without exposing message bodies', () => {
    const message = {
      id: 'message-1',
      timestamp: new Date('2026-01-02T03:04:05.000Z'),
      attempts: 4,
      body: { to: ['reader@example.com'], subject: 'Reset your password' },
    };

    const summary = DeadLetterEmailSchema.parse(
      buildDeadLetterEmailBody('theaistudybible-dead-letter', [message]),
    );

    expect(summary).toEqual({
      type: 'dead-letter',
      queue: 'theaistudybible-dead-letter',
      messages: [{ id: 'message-1', timestamp: '2026-01-02T03:04:05.000Z', attempts: 4 }],
    });
    expect(JSON.stringify(summary)).not.toContain('reader@example.com');
  });
});
