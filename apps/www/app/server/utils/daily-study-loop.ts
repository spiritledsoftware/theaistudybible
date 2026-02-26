import { advancedChatModels } from '@/ai/models';
import { registry } from '@/ai/provider-registry';
import { createStudyLoopService } from '@/ai/study-loop';
import { Output, generateText } from 'ai';
import { z } from 'zod';

const responseSchema = z.object({
  passageContext: z.string().min(1),
  conciseExplanation: z.string().min(1),
  reflectionPrompt: z.string().min(1),
});

const recapSchema = z.object({
  recap: z.string().min(1).max(400),
});

const dailyStudySystemPrompt = `You are The AI Study Bible assistant helping users through a daily study loop.

Return exactly three fields:
1) passageContext: 2-4 concise sentences with historical/literary context grounded in Scripture.
2) conciseExplanation: 2-3 concise sentences explaining the main meaning.
3) reflectionPrompt: one actionable reflection prompt that starts with a verb and can be completed today.

Constraints:
- Be theologically careful and practical.
- Keep each field short and direct.
- Do not include markdown headers, code blocks, or extra keys.`;

const dailyRecapSystemPrompt = `You summarize a completed Bible study session.

Return a short recap that:
- is 2-4 sentences,
- references the user's goal,
- names one practical takeaway,
- closes with one specific next step for tomorrow.

Do not use bullet points or markdown.`;

const modelInfo = advancedChatModels[0];
// @ts-expect-error - registry model type is broader than AI SDK helper typing
const model = registry.languageModel(`${modelInfo.host}:${modelInfo.id}`);

export const dailyStudyLoopService = createStudyLoopService({
  timeoutMs: 20_000,
  generateStudyResponse: async ({ goal, passageOrTopic }) => {
    const { experimental_output } = await generateText({
      model,
      experimental_output: Output.object({ schema: responseSchema }),
      system: dailyStudySystemPrompt,
      prompt: `Daily study goal: ${goal}\nPassage or topic: ${passageOrTopic}\n\nCreate the study response now.`,
    });

    return experimental_output;
  },
  generateRecap: async ({ goal, passageOrTopic, notes, passageContext, conciseExplanation }) => {
    const {
      experimental_output: { recap },
    } = await generateText({
      model,
      experimental_output: Output.object({ schema: recapSchema }),
      system: dailyRecapSystemPrompt,
      prompt: `Goal: ${goal}\nPassage or topic: ${passageOrTopic}\nPassage context: ${passageContext}\nExplanation: ${conciseExplanation}\nNotes: ${notes || 'No notes saved.'}\n\nWrite the recap now.`,
    });

    return recap;
  },
});
