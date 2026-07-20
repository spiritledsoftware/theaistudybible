import { describe, expect, it } from 'vitest';
import { getEmailDeliveryId } from '@/email/idempotency';

const email = {
  subject: 'Daily devotional',
  to: ['reader@example.com'],
  body: 'Body',
};

describe('getEmailDeliveryId', () => {
  it('uses a stable effect key when a producer retries with a new queue message', () => {
    const devotionalEmail = {
      ...email,
      idempotencyKey: 'devotion:devotion-1:email:reader-1',
    };

    expect(getEmailDeliveryId(devotionalEmail, 'queue-message-1')).toBe(
      'devotion:devotion-1:email:reader-1',
    );
    expect(getEmailDeliveryId(devotionalEmail, 'queue-message-2')).toBe(
      'devotion:devotion-1:email:reader-1',
    );
  });

  it('keeps independent emails isolated by queue message', () => {
    expect(getEmailDeliveryId(email, 'queue-message-1')).toBe('queue-message-1');
    expect(getEmailDeliveryId(email, 'queue-message-2')).toBe('queue-message-2');
  });
});
