import type { EmailQueueRecord } from './types';

export function getEmailDeliveryId(email: EmailQueueRecord, messageId: string) {
  return email.idempotencyKey ?? messageId;
}
