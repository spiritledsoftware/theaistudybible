import { db } from '@/core/database';
import { chapterBookmarks, userGeneratedImages, verseHighlights } from '@/core/database/schema';
import { env } from '@/core/env';
import { getQuotaLedgerName } from '@/core/quotas/keys';
import { getPublicMediaBucket, getPublicMediaUrl } from '@/core/storage';
import { getStripeData, isPro } from '@/core/stripe/utils';
import { createId } from '@/core/utils/id';
import { getConfiguredDailyQuota } from '@/core/utils/quota';
import type { Role } from '@/schemas/roles/types';
import type { User } from '@/schemas/users/types';
import { generateImage, tool } from 'ai';
import { formatDate } from 'date-fns';
import { z } from 'zod';
import { getImageModel } from '../models';
import { protectRetrievedEvidence } from '../retrieved-evidence';
import { vectorStore, type SearchDocumentsOptions } from '../vector-store';

export const askForHighlightColorTool = () =>
  tool({
    description: 'Ask for Highlight Color: Ask which color to use when highlighting a verse.',
    inputSchema: z.object({
      message: z.string().describe('A polite message to ask the user for a highlight color.'),
    }),
  });

export const highlightVerseTool = (input: { userId: string }) =>
  tool({
    description:
      'Highlight Verse: Highlight a verse in the Bible. You must always ask the user for the highlight color using the "Ask for Highlight Color" tool before using this tool.',
    inputSchema: z.object({
      bibleAbbreviation: z.string().describe('The abbreviation of the Bible the verse is from.'),
      bookCode: z
        .string()
        .describe(
          'The 3 character USX code of the book the verse is from. This is always the first 3 characters of the book name without any spaces or punctuation.',
        ),
      chapterNumber: z.number().describe('The number of the chapter the verse is from.'),
      verseNumbers: z.array(z.number().describe('The number of the verse to highlight.')),
      color: z
        .string()
        .optional()
        .describe('The color of the highlight. Must be in valid hex format.'),
    }),
    execute: async ({ bibleAbbreviation, bookCode, chapterNumber, verseNumbers, color }) => {
      try {
        const queryResult = await db.query.bibles.findFirst({
          columns: { abbreviation: true },
          where: (bibles, { eq }) => eq(bibles.abbreviation, bibleAbbreviation),
          with: {
            books: {
              columns: { code: true, abbreviation: true, shortName: true },
              where: (books, { or, eq }) =>
                or(
                  eq(books.code, bookCode),
                  eq(books.shortName, bookCode),
                  eq(books.abbreviation, bookCode),
                ),
              with: {
                chapters: {
                  columns: { code: true, number: true },
                  where: (chapters, { eq }) => eq(chapters.number, chapterNumber),
                  with: {
                    verses: {
                      columns: { code: true, number: true },
                      where: (verses, { inArray }) => inArray(verses.number, verseNumbers),
                    },
                  },
                },
              },
            },
          },
        });

        const bible = queryResult;
        const book = bible?.books[0];
        const chapter = book?.chapters[0];
        const verses = chapter?.verses;
        if (!verses?.length) {
          throw new Error('Verse(s) not found');
        }

        await db
          .insert(verseHighlights)
          .values(
            verses.map((verse) => ({
              userId: input.userId,
              bibleAbbreviation: bibleAbbreviation,
              verseCode: verse.code,
              color: color ?? '#FFD700',
            })),
          )
          .onConflictDoUpdate({
            target: [verseHighlights.userId, verseHighlights.verseCode],
            set: { color: color ?? '#FFD700' },
          });

        return {
          status: 'success',
          message: 'Verse highlighted',
          bible: bible!,
          book: book!,
          chapter: chapter!,
          verses: verses,
        } as const;
      } catch (err) {
        console.error('Error highlighting verse', err);
        return {
          status: 'error',
          message: err instanceof Error ? err.message : 'An unknown error occurred',
        } as const;
      }
    },
  });

export const bookmarkChapterTool = (input: { userId: string }) =>
  tool({
    description: 'Bookmark Chapter: Bookmark a chapter in the Bible.',
    inputSchema: z.object({
      bibleAbbreviation: z.string().describe('The abbreviation of the Bible the verse is from.'),
      bookCode: z
        .string()
        .describe(
          'The 3 character USX code of the book the verse is from. This is always the first 3 characters of the book name without any spaces or punctuation.',
        ),
      chapterNumbers: z.array(z.number().describe('The number of the chapter the verse is from.')),
    }),
    execute: async ({ bibleAbbreviation, bookCode, chapterNumbers }) => {
      try {
        const queryResult = await db.query.bibles.findFirst({
          columns: { abbreviation: true },
          where: (bibles, { eq }) => eq(bibles.abbreviation, bibleAbbreviation),
          with: {
            books: {
              columns: { code: true, abbreviation: true, shortName: true },
              where: (books, { or, eq }) =>
                or(
                  eq(books.shortName, bookCode),
                  eq(books.code, bookCode),
                  eq(books.abbreviation, bookCode),
                ),
              with: {
                chapters: {
                  columns: { code: true, number: true },
                  where: (chapters, { inArray }) => inArray(chapters.number, chapterNumbers),
                },
              },
            },
          },
        });

        const bible = queryResult;
        const book = bible?.books[0];
        const chapters = book?.chapters;
        if (!chapters?.length) {
          throw new Error('Chapter(s) not found');
        }

        await db
          .insert(chapterBookmarks)
          .values(
            chapters.map((chapter) => ({
              userId: input.userId,
              bibleAbbreviation: bibleAbbreviation,
              chapterCode: chapter.code,
            })),
          )
          .onConflictDoNothing();

        return {
          status: 'success',
          message: 'Chapter bookmarked',
          bible: bible!,
          book: book!,
          chapters: chapters,
        } as const;
      } catch (err) {
        console.error('Error bookmarking chapter', err);
        return {
          status: 'error',
          message: err instanceof Error ? err.message : 'An unknown error occurred',
        } as const;
      }
    },
  });

function matchesChristianTradition(
  metadata: Record<string, unknown> | undefined,
  christianTradition: string,
) {
  const type = metadata?.type;
  if (type === 'bible' || type === 'BIBLE') return true;
  const value = metadata?.traditionClassification;
  if (typeof value !== 'string') return false;
  const traditions = value.split(',').map((tradition) => tradition.trim());
  return (
    traditions.includes('BROAD_CHRISTIAN') ||
    (christianTradition !== 'BROAD_CHRISTIAN' && traditions.includes(christianTradition))
  );
}

export const vectorStoreTool = (input: {
  bibleAbbreviation?: string | null;
  christianTradition?: string | null;
}) =>
  tool({
    description: 'Scripture and Source Search: Fetch approved evidence for your answer.',
    inputSchema: z.object({
      terms: z
        .array(
          z.object({
            term: z.string().describe('The search term or phrase to search for.'),
            weight: z
              .number()
              .min(0)
              .max(1)
              .optional()
              .default(1)
              .describe(
                'The weight of the search term between 0 and 1. The default is 1. A weight of 0 will not be used to rerank the results.',
              ),
            category: z
              .enum(['bible', 'theology', 'general'])
              .optional()
              .default('general')
              .describe(
                'The category of resources to search for. "bible" will only search for resources from the Bible. "theology" will only search for popular theology resources such as commentaries, sermons, and theological books. "general" will search for resources from all types. The default is "general".',
              ),
          }),
        )
        .min(1)
        .max(4)
        .describe(
          'A list of 1 to 4 search terms, their weights, and their category. The search terms are searched separately and should not rely on each other.',
        ),
    }),
    execute: async ({ terms }) => {
      try {
        // Get initial results from vector search
        const docs = await Promise.all(
          terms.map(async ({ term, weight, category }) => {
            const bibleFilter: VectorizeVectorMetadataFilter = {
              type: { $in: ['bible', 'BIBLE'] },
            };
            if (input.bibleAbbreviation) {
              bibleFilter.bibleAbbreviation = input.bibleAbbreviation;
            }
            let filter: SearchDocumentsOptions['filter'] = [
              bibleFilter,
              { type: { $nin: ['bible', 'BIBLE'] }, approvalStatus: 'APPROVED' },
            ];
            if (category === 'bible') {
              filter = bibleFilter;
            } else if (category === 'theology') {
              filter = { category: 'theology', approvalStatus: 'APPROVED' };
            }
            return await vectorStore
              .searchDocuments(term, {
                limit: 12,
                withMetadata: true,
                withEmbedding: false,
                filter,
              })
              .then((docs) =>
                docs
                  .filter((doc) =>
                    matchesChristianTradition(
                      doc.metadata,
                      input.christianTradition ?? 'BROAD_CHRISTIAN',
                    ),
                  )
                  .map((doc) => ({
                    ...doc,
                    score: doc.score * weight,
                  })),
              );
          }),
        ).then((docs) =>
          docs
            .flat()
            .filter((doc, index, self) => index === self.findIndex((d) => d.id === doc.id))
            .toSorted((a, b) => b.score - a.score),
        );

        return {
          status: 'success',
          documents: docs.slice(0, 12).map(protectRetrievedEvidence),
        } as const;
      } catch (err) {
        console.error('Error fetching scripture and source evidence', err);
        return {
          status: 'error',
          message: err instanceof Error ? err.message : 'An unknown error occurred',
        } as const;
      }
    },
  });

export const generateImageTool = (input: {
  userId: string;
  user?: User | null;
  roles?: Role[] | null;
}) =>
  tool({
    description:
      'Generate Image: Generate an image from a text prompt. You must use the "Scripture and Source Search" tool to ground the prompt in approved evidence.',
    inputSchema: z.object({
      prompt: z
        .string()
        .min(1)
        .max(1000)
        .describe(
          'The image prompt must accurately reflect the approved scripture and source evidence returned by search.',
        ),
      size: z
        .enum(['1024x1024', '1792x1024', '1024x1792'])
        .optional()
        .default('1024x1024')
        .describe('The size of the generated image. More detailed images need a larger size.'),
    }),
    execute: async ({ prompt, size }, { abortSignal }) => {
      const subscription = input.user
        ? await getStripeData(input.user.stripeCustomerId)
        : { status: 'none' as const };
      const isAdmin = input.roles?.some((role) => role.id === 'admin') ?? false;
      const limit = isAdmin
        ? null
        : getConfiguredDailyQuota(
            isPro(subscription) ? 'PRO_IMAGE_DAILY_LIMIT' : 'FREE_IMAGE_DAILY_LIMIT',
          );
      const limiter = env.QUOTA_LIMITER.getByName(getQuotaLedgerName('image', input.userId));
      const reservationId = createId();
      if (limit !== null) {
        const reservation = await limiter.reserve({
          id: reservationId,
          limit,
          windowMs: 86_400_000,
        });
        if (!reservation.allowed) {
          return {
            status: 'error',
            message: `You have exceeded your daily image generation limit. Please upgrade or try again at ${formatDate(reservation.resetAt, 'M/d/yy h:mm a')}.`,
          } as const;
        }
      }

      try {
        const { image } = await generateImage({
          prompt,
          model: getImageModel(),
          size,
          abortSignal,
        });

        const id = createId();
        const key = `generated-images/${id}.png`;
        await getPublicMediaBucket().put(key, image.uint8Array, {
          httpMetadata: {
            contentType: 'image/png',
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        const [generatedImage] = await db
          .insert(userGeneratedImages)
          .values({
            id,
            url: getPublicMediaUrl(key),
            userPrompt: prompt,
            userId: input.userId,
          })
          .returning();

        if (limit !== null) await limiter.commit(reservationId);
        return {
          status: 'success',
          message: 'Image generated',
          image: generatedImage,
        } as const;
      } catch (error) {
        if (limit !== null) await limiter.rollback(reservationId);
        return {
          status: 'error',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        } as const;
      }
    },
  });

export const tools = (input: {
  userId: string;
  user?: User | null;
  roles?: Role[] | null;
  bibleAbbreviation?: string | null;
  christianTradition?: string | null;
}) => ({
  askForHighlightColor: askForHighlightColorTool(),
  highlightVerse: highlightVerseTool({ userId: input.userId }),
  bookmarkChapter: bookmarkChapterTool({ userId: input.userId }),
  generateImage: generateImageTool({
    userId: input.userId,
    user: input.user,
    roles: input.roles,
  }),
  vectorStore: vectorStoreTool({
    bibleAbbreviation: input.bibleAbbreviation,
    christianTradition: input.christianTradition,
  }),
});
