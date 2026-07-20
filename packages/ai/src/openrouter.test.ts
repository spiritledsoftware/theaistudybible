import { generateText } from 'ai';
import { describe, expect, it } from 'vitest';
import { createPrivateOpenRouter } from './openrouter';

describe('private OpenRouter routing', () => {
  it('requires zero-data-retention providers for every chat request', async () => {
    let requestBody: unknown;
    const fetch = (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requestBody = JSON.parse(String(init?.body));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'generation-1',
            choices: [
              {
                finish_reason: 'stop',
                index: 0,
                message: { content: 'Grounded answer', role: 'assistant' },
              },
            ],
            created: 1,
            model: 'approved/chat-model',
            object: 'chat.completion',
            usage: { completion_tokens: 2, prompt_tokens: 1, total_tokens: 3 },
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      );
    };
    const openrouter = createPrivateOpenRouter({ apiKey: 'test-key', fetch });

    await generateText({ model: openrouter.chat('approved/chat-model'), prompt: 'Who is Jesus?' });

    expect(requestBody).toMatchObject({
      provider: { data_collection: 'deny', zdr: true },
    });
  });
});
