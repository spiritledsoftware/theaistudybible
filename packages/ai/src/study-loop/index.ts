export type StudyLoopResponse = {
  passageContext: string;
  conciseExplanation: string;
  reflectionPrompt: string;
};

export type StudyLoopInput = {
  goal: string;
  passageOrTopic: string;
};

export type StudyLoopRecapInput = StudyLoopInput &
  StudyLoopResponse & {
    notes: string;
  };

export class StudyLoopTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudyLoopTimeoutError';
  }
}

export class StudyLoopModelError extends Error {
  declare cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'StudyLoopModelError';
    this.cause = cause;
  }
}

export type StudyLoopServiceOptions = {
  timeoutMs?: number;
  generateStudyResponse: (input: StudyLoopInput) => Promise<StudyLoopResponse>;
  generateRecap: (input: StudyLoopRecapInput) => Promise<string>;
};

export type StudyLoopService = {
  generateStudyResponse: (input: StudyLoopInput) => Promise<StudyLoopResponse>;
  generateRecap: (input: StudyLoopRecapInput) => Promise<string>;
};

const DEFAULT_TIMEOUT_MS = 15_000;

const runWithTimeout = async <T>({
  timeoutMs,
  timeoutMessage,
  task,
}: {
  timeoutMs: number;
  timeoutMessage: string;
  task: () => Promise<T>;
}) => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new StudyLoopTimeoutError(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([task(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const createStudyLoopService = (options: StudyLoopServiceOptions): StudyLoopService => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    generateStudyResponse: async (input) => {
      try {
        return await runWithTimeout({
          timeoutMs,
          timeoutMessage: 'Daily study response timed out',
          task: () => options.generateStudyResponse(input),
        });
      } catch (error) {
        if (error instanceof StudyLoopTimeoutError) {
          throw error;
        }

        throw new StudyLoopModelError('Failed to generate daily study response', error);
      }
    },
    generateRecap: async (input) => {
      try {
        return await runWithTimeout({
          timeoutMs,
          timeoutMessage: 'Daily study recap timed out',
          task: () => options.generateRecap(input),
        });
      } catch (error) {
        if (error instanceof StudyLoopTimeoutError) {
          throw error;
        }

        throw new StudyLoopModelError('Failed to generate daily study recap', error);
      }
    },
  };
};
