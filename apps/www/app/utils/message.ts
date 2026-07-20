import type { Message } from '@/schemas/chats/messages/types';

export function getMessageId(message: Pick<Message, 'id' | 'annotations'>) {
  return getMessageIdFromAnnotations(message) ?? message.id;
}

export function getMessageIdFromAnnotations(message: Pick<Message, 'annotations'>) {
  return (
    message.annotations?.find(
      (a) =>
        typeof a === 'object' &&
        a !== null &&
        !Array.isArray(a) &&
        'dbId' in a &&
        typeof a.dbId === 'string',
    ) as { dbId: string } | undefined
  )?.dbId;
}
