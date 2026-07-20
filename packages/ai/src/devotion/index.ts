import { db } from '@/core/database';
import {
  bibles,
  chaptersToSourceDocuments,
  dataSources,
  dataSourcesToSourceDocuments,
  devotionImages,
  devotions,
  devotionsToSourceDocuments,
} from '@/core/database/schema';
import { env } from '@/core/env';
import { getPublicMediaBucket, getPublicMediaUrl } from '@/core/storage';
import { createId } from '@/core/utils/id';
import type { Devotion } from '@/schemas/devotions/types';
import { Output, generateImage as generateAiImage, generateText, isStepCount } from 'ai';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getChatModel, getImageModel } from '../models';
import {
  bibleReadingSystemPrompt,
  diveDeeperSystemPrompt,
  imageSystemPrompt,
  prayerSystemPrompt,
  reflectionSystemPrompt,
  summarySystemPrompt,
} from './system-prompts';
import { bibleVectorStoreTool, vectorStoreTool } from './tools';
import { getTodaysTopic } from './topics';
import {
  getCitedEvidenceSourceIds,
  validateDevotionDraft,
  type DevotionDraft,
  type DevotionEvidenceSource,
} from './validation';

const MAX_GENERATION_ATTEMPTS = 3;

function collectEvidenceSources(value: unknown, destination: Map<string, DevotionEvidenceSource>) {
  const seen = new WeakSet<object>();
  const visit = (current: unknown) => {
    if (typeof current !== 'object' || current === null || seen.has(current)) return;
    seen.add(current);
    if ('documents' in current && Array.isArray(current.documents)) {
      for (const document of current.documents) {
        if (
          typeof document === 'object' &&
          document !== null &&
          'id' in document &&
          typeof document.id === 'string' &&
          'metadata' in document &&
          typeof document.metadata === 'object' &&
          document.metadata !== null &&
          'url' in document.metadata &&
          typeof document.metadata.url === 'string'
        ) {
          destination.set(document.id, { id: document.id, url: document.metadata.url });
        }
      }
    }
    for (const child of Object.values(current)) visit(child);
  };
  visit(value);
}

export const getBibleReading = async (
  topic: string,
  evidenceSources?: Map<string, DevotionEvidenceSource>,
) => {
  const pastDevotions = await db.query.devotions.findMany({
    columns: { id: true, bibleReading: true },
    where: (devotions, { eq }) => eq(devotions.topic, topic),
    orderBy: (devotions, { desc }) => [desc(devotions.createdAt)],
    limit: 10,
  });
  const result = await generateText({
    model: getChatModel(),
    instructions: bibleReadingSystemPrompt({ pastDevotions }),
    prompt: `Find a bible reading for the topic: "${topic}"`,
    tools: { bibleVectorStore: bibleVectorStoreTool },
    stopWhen: isStepCount(10),
  });
  if (evidenceSources) collectEvidenceSources(result.steps, evidenceSources);
  return result.text;
};

export const generateSummary = async ({
  topic,
  bibleReading,
  evidenceSources,
}: {
  topic: string;
  bibleReading: string;
  evidenceSources?: Map<string, DevotionEvidenceSource>;
}) => {
  const result = await generateText({
    model: getChatModel(),
    instructions: summarySystemPrompt,
    prompt: `The topic is "${topic}".
Summarize the following bible passage:
${bibleReading}`,
    tools: { vectorStore: vectorStoreTool },
    stopWhen: isStepCount(5),
  });
  if (evidenceSources) collectEvidenceSources(result.steps, evidenceSources);
  return result.text;
};

export const generateReflection = async ({
  topic,
  bibleReading,
  summary,
  evidenceSources,
}: {
  topic: string;
  bibleReading: string;
  summary: string;
  evidenceSources?: Map<string, DevotionEvidenceSource>;
}) => {
  const result = await generateText({
    model: getChatModel(),
    instructions: reflectionSystemPrompt,
    prompt: `The topic is "${topic}".

Here is the Bible passage (delimited by triple dashes):
---
${bibleReading}
---

Here is a summary of the passage (delimited by triple dashes):
---
${summary}
---

Write a reflection of the passage.`,
    tools: { vectorStore: vectorStoreTool },
    stopWhen: isStepCount(5),
  });
  if (evidenceSources) collectEvidenceSources(result.steps, evidenceSources);
  return result.text;
};

export const generatePrayer = async ({
  topic,
  bibleReading,
  summary,
  reflection,
}: {
  topic: string;
  bibleReading: string;
  summary: string;
  reflection: string;
}) => {
  const { text: prayer } = await generateText({
    model: getChatModel(),
    instructions: prayerSystemPrompt,
    prompt: `Here is the devotional (delimited by triple dashes):
---
Topic:
${topic}
Reading:
${bibleReading}
Summary:
${summary}
Reflection:
${reflection}
---

Write a closing prayer.`,
  });

  return prayer;
};

export const generateDiveDeeperQueries = async ({
  topic,
  bibleReading,
  summary,
  reflection,
  prayer,
}: {
  topic: string;
  bibleReading: string;
  summary: string;
  reflection: string;
  prayer: string;
}) => {
  const { output } = await generateText({
    model: getChatModel(),
    output: Output.object({ schema: z.object({ queries: z.array(z.string()) }) }),
    instructions: diveDeeperSystemPrompt,
    prompt: `Here is the devotional (delimited by triple dashes):
---
Topic:
${topic}

Reading:
${bibleReading}

Summary:
${summary}

Reflection:
${reflection}

Prayer:
${prayer}
---

Generate 1 to 4 follow-up queries to help the user dive deeper into the topic explored in the devotional.`,
  });

  return output.queries;
};

export const generateImagePrompt = async (devotion: Devotion) => {
  const { text: imagePrompt } = await generateText({
    model: getChatModel(),
    instructions: imageSystemPrompt,
    prompt: `Here is the devotional (delimited by triple dashes):
---
Topic:
${devotion.topic}

Reading:
${devotion.bibleReading}

Summary:
${devotion.summary}

Reflection:
${devotion.reflection}

Prayer:
${devotion.prayer}
---

Generate the prompt.`,
  });

  return imagePrompt;
};

export const generateImage = async ({
  devotionId,
  prompt,
}: {
  prompt: string;
  devotionId: string;
}) => {
  const { image } = await generateAiImage({
    prompt,
    model: getImageModel(),
    size: '1792x1024',
  });

  const id = createId();
  const key = `devotion-images/${id}.png`;
  await getPublicMediaBucket().put(key, image.uint8Array, {
    httpMetadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const [devotionImage] = await db
    .insert(devotionImages)
    .values({
      id,
      url: getPublicMediaUrl(key),
      prompt,
      devotionId,
    })
    .returning();

  return devotionImage;
};

async function createDevotionDraft(topic: string): Promise<DevotionDraft> {
  const evidenceSources = new Map<string, DevotionEvidenceSource>();
  const bibleReading = await getBibleReading(topic, evidenceSources);
  const summary = await generateSummary({ topic, bibleReading, evidenceSources });
  const reflection = await generateReflection({
    topic,
    bibleReading,
    summary,
    evidenceSources,
  });
  const prayer = await generatePrayer({ topic, bibleReading, summary, reflection });
  const diveDeeperQueries = await generateDiveDeeperQueries({
    topic,
    bibleReading,
    summary,
    reflection,
    prayer,
  });
  return {
    topic,
    bibleReading,
    summary,
    reflection,
    prayer,
    diveDeeperQueries,
    evidenceSources: [...evidenceSources.values()],
  };
}

async function quarantineDevotion(draft: DevotionDraft, validationErrors: string[]) {
  await db.insert(devotions).values({
    topic: draft.topic,
    bibleReading: draft.bibleReading,
    summary: draft.summary,
    reflection: draft.reflection,
    prayer: draft.prayer,
    diveDeeperQueries: draft.diveDeeperQueries,
    publicationStatus: 'QUARANTINED',
    validationErrors,
    failed: true,
  });
}

async function validateApprovedEvidence(draft: DevotionDraft) {
  const evidenceSourceIds = draft.evidenceSources.map((source) => source.id);
  if (evidenceSourceIds.length === 0) return ['Devotional has no retrieved evidence'];

  const [approvedGroundingSources, approvedScriptureSources] = await Promise.all([
    db
      .select({ id: dataSourcesToSourceDocuments.sourceDocumentId })
      .from(dataSourcesToSourceDocuments)
      .innerJoin(dataSources, eq(dataSourcesToSourceDocuments.dataSourceId, dataSources.id))
      .where(
        and(
          inArray(dataSourcesToSourceDocuments.sourceDocumentId, evidenceSourceIds),
          eq(dataSources.approvalStatus, 'APPROVED'),
        ),
      ),
    db
      .select({ id: chaptersToSourceDocuments.sourceDocumentId })
      .from(chaptersToSourceDocuments)
      .innerJoin(bibles, eq(chaptersToSourceDocuments.bibleAbbreviation, bibles.abbreviation))
      .where(
        and(
          inArray(chaptersToSourceDocuments.sourceDocumentId, evidenceSourceIds),
          eq(bibles.readyForPublication, true),
        ),
      ),
  ]);
  const approvedEvidenceIds = new Set([
    ...approvedGroundingSources.map((source) => source.id),
    ...approvedScriptureSources.map((source) => source.id),
  ]);
  const errors: string[] = [];
  if (evidenceSourceIds.some((id) => !approvedEvidenceIds.has(id))) {
    errors.push('Devotional cites missing or unapproved evidence');
  }

  const scriptureEvidenceIds = new Set(approvedScriptureSources.map((source) => source.id));
  const citedBibleEvidenceIds = getCitedEvidenceSourceIds(
    draft.bibleReading,
    draft.evidenceSources,
    env.WEB_APP_URL,
  );
  if (!citedBibleEvidenceIds.some((id) => scriptureEvidenceIds.has(id))) {
    errors.push('Bible reading citation does not match approved indexed Scripture');
  }
  return errors;
}
export const generateDevotion = async () => {
  const topic = getTodaysTopic();
  const previousBibleReadings = await db.query.devotions
    .findMany({
      columns: { bibleReading: true },
      where: (devotions, { eq }) => eq(devotions.publicationStatus, 'PUBLISHED'),
      orderBy: (devotions, { desc }) => [desc(devotions.createdAt)],
      limit: 30,
    })
    .then((records) => records.map((record) => record.bibleReading));

  let draft: DevotionDraft | undefined;
  let validationErrors: string[] = [];
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    draft = await createDevotionDraft(topic);
    validationErrors = [
      ...validateDevotionDraft(draft, {
        allowedOrigin: env.WEB_APP_URL,
        previousBibleReadings,
      }),
      ...(await validateApprovedEvidence(draft)),
    ];
    if (validationErrors.length === 0) break;
  }
  if (!draft || validationErrors.length > 0) {
    if (draft) await quarantineDevotion(draft, validationErrors);
    throw new Error(`Devotional failed validation: ${validationErrors.join('; ')}`);
  }

  const [pendingDevotion] = await db
    .insert(devotions)
    .values({
      topic: draft.topic,
      bibleReading: draft.bibleReading,
      summary: draft.summary,
      reflection: draft.reflection,
      prayer: draft.prayer,
      diveDeeperQueries: draft.diveDeeperQueries,
      publicationStatus: 'PENDING',
    })
    .returning();

  const evidenceSourceIds = draft.evidenceSources.map((source) => source.id);
  await db
    .insert(devotionsToSourceDocuments)
    .values(
      evidenceSourceIds.map((sourceDocumentId) => ({
        devotionId: pendingDevotion.id,
        sourceDocumentId,
      })),
    )
    .onConflictDoNothing();

  try {
    const imagePrompt = z
      .string()
      .trim()
      .min(20)
      .max(2_000)
      .parse(await generateImagePrompt(pendingDevotion));
    const image = await generateImage({
      prompt: imagePrompt,
      devotionId: pendingDevotion.id,
    });
    const [publishedDevotion] = await db
      .update(devotions)
      .set({
        publicationStatus: 'PUBLISHED',
        validationErrors: [],
        failed: false,
      })
      .where(inArray(devotions.id, [pendingDevotion.id]))
      .returning();
    return { ...publishedDevotion, image };
  } catch (error) {
    await db
      .update(devotions)
      .set({
        publicationStatus: 'QUARANTINED',
        validationErrors: ['Image generation, validation, or storage failed'],
        failed: true,
      })
      .where(inArray(devotions.id, [pendingDevotion.id]));
    throw error;
  }
};
