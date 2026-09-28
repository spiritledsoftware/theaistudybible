import { vectorStore } from '@/ai/vector-store';
import { db } from '@/core/database';
import { chaptersToSourceDocuments } from '@/core/database/schema';
import { maxInsertRows } from '@/core/database/utils';
import type { Bible, Book, Chapter, Verse } from '@/schemas/bibles/types';
import { versesToDocs } from './verses-to-docs';

export const generateChapterEmbeddings = async ({
  verses,
  chapter,
  book,
  bible,
  overwrite,
}: {
  verses: Verse[];
  chapter: Omit<Chapter, 'content'>;
  book: Book;
  bible: Bible;
  overwrite?: boolean;
}) => {
  const existingDocs = await db.query.chaptersToSourceDocuments.findMany({
    where: (chaptersToSourceDocuments, { and, eq }) =>
      and(
        eq(chaptersToSourceDocuments.bibleAbbreviation, bible.abbreviation),
        eq(chaptersToSourceDocuments.chapterCode, chapter.code),
      ),
  });
  await vectorStore.deleteDocuments(existingDocs.map((doc) => doc.sourceDocumentId));

  const docs = await versesToDocs({
    bible,
    book,
    chapter,
    verses,
  });

  // Each batch's links go into one insert, so it is sized to D1's parameter limit.
  const batchSize = maxInsertRows(chaptersToSourceDocuments);
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch, { overwrite });
    await db
      .insert(chaptersToSourceDocuments)
      .values(
        batch.map((doc) => ({
          bibleAbbreviation: bible.abbreviation,
          chapterCode: chapter.code,
          sourceDocumentId: doc.id,
        })),
      )
      .onConflictDoNothing();
  }

  console.log(`Successfully added ${docs.length} documents to vector store for ${chapter.name}`);
};
