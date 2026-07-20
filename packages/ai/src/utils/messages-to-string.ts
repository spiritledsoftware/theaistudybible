import { toCapitalizedCase } from '@/core/utils/string';

export const messagesToString = (
  messages: { content: string; role: string; toolInvocations?: unknown[] | null }[],
) => {
  return messages
    .map(
      (m) =>
        `${toCapitalizedCase(m.role)}: ${m.content ?? ''}${
          m.toolInvocations?.length
            ? `\nTool Invocations: ${JSON.stringify(m.toolInvocations)}`
            : ''
        }`,
    )
    .join('\n\n');
};
