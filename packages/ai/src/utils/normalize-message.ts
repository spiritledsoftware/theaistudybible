import type { UIMessage } from 'ai';

interface StoredMessage {
  content: string;
  id: string;
  parts?: unknown[] | null;
  role: UIMessage['role'] | 'data';
}

export function normalizeMessage(message: StoredMessage): UIMessage {
  const storedParts = message.parts;
  return {
    id: message.id,
    parts:
      storedParts && storedParts.length > 0
        ? (storedParts as UIMessage['parts'])
        : [{ text: message.content, type: 'text' }],
    role: message.role === 'data' ? 'assistant' : message.role,
  };
}
