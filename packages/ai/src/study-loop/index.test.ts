import { describe, expect, test, vi } from 'vitest';
import { StudyLoopModelError, StudyLoopTimeoutError, createStudyLoopService } from './index';

describe('study loop service', () => {
  test('returns structured study response and recap for happy path', async () => {
    const service = createStudyLoopService({
      timeoutMs: 100,
      generateStudyResponse: vi.fn(async () => ({
        passageContext: 'Paul writes from prison to encourage perseverance.',
        conciseExplanation: 'The passage calls believers to steadfast joy and prayer.',
        reflectionPrompt: 'What one challenge today can you surrender to God in prayer?',
      })),
      generateRecap: vi.fn(async () => 'Today I learned to pray with gratitude in hardship.'),
    });

    const response = await service.generateStudyResponse({
      goal: 'Grow in prayer this morning',
      passageOrTopic: 'Philippians 4:4-7',
    });

    expect(response).toEqual({
      passageContext: 'Paul writes from prison to encourage perseverance.',
      conciseExplanation: 'The passage calls believers to steadfast joy and prayer.',
      reflectionPrompt: 'What one challenge today can you surrender to God in prayer?',
    });

    const recap = await service.generateRecap({
      goal: 'Grow in prayer this morning',
      passageOrTopic: 'Philippians 4:4-7',
      notes: 'I felt anxious before work and chose to pray first.',
      passageContext: response.passageContext,
      conciseExplanation: response.conciseExplanation,
      reflectionPrompt: response.reflectionPrompt,
    });

    expect(recap).toBe('Today I learned to pray with gratitude in hardship.');
  });

  test('throws model error when provider fails', async () => {
    const service = createStudyLoopService({
      timeoutMs: 100,
      generateStudyResponse: vi.fn(() => {
        throw new Error('provider unavailable');
      }),
      generateRecap: vi.fn(async () => 'unused'),
    });

    const error = await service
      .generateStudyResponse({
        goal: 'Stay focused',
        passageOrTopic: 'Romans 8',
      })
      .catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(StudyLoopModelError);
    expect(error).toMatchObject({
      name: 'StudyLoopModelError',
      message: 'Failed to generate daily study response',
    });
  });

  test('throws timeout error when model exceeds timeout', async () => {
    const service = createStudyLoopService({
      timeoutMs: 15,
      generateStudyResponse: vi.fn(
        () =>
          new Promise(() => {}) as Promise<{
            passageContext: string;
            conciseExplanation: string;
            reflectionPrompt: string;
          }>,
      ),
      generateRecap: vi.fn(async () => 'unused'),
    });

    const error = await service
      .generateStudyResponse({
        goal: 'Be patient',
        passageOrTopic: 'James 1:2-4',
      })
      .catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(StudyLoopTimeoutError);
    expect(error).toMatchObject({
      name: 'StudyLoopTimeoutError',
      message: 'Daily study response timed out',
    });
  });

  test('throws timeout error when recap exceeds timeout', async () => {
    const service = createStudyLoopService({
      timeoutMs: 15,
      generateStudyResponse: vi.fn(async () => ({
        passageContext: 'context',
        conciseExplanation: 'explanation',
        reflectionPrompt: 'reflect now',
      })),
      generateRecap: vi.fn(() => new Promise(() => {}) as Promise<string>),
    });

    const error = await service
      .generateRecap({
        goal: 'Practice trust',
        passageOrTopic: 'Proverbs 3:5-6',
        notes: 'I should stop relying only on my own understanding.',
        passageContext: 'context',
        conciseExplanation: 'explanation',
        reflectionPrompt: 'reflect now',
      })
      .catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(StudyLoopTimeoutError);
    expect(error).toMatchObject({
      name: 'StudyLoopTimeoutError',
      message: 'Daily study recap timed out',
    });
  });
});
