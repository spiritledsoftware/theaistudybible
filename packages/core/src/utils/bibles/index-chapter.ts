import { db } from '@/core/database';
import { type bibles, type books, chapters, verses } from '@/core/database/schema';
import { buildConflictUpdateColumns } from '@/core/database/utils';
import type { Bible, Book } from '@/schemas/bibles/types';
import { getTableColumns, sql } from 'drizzle-orm';
import type { parseUsx } from './usx';

export async function insertChapter({
  bible,
  book,
  previousCode,
  nextCode,
  chapterNumber,
  contents,
  overwrite,
}: {
  bible: Bible;
  book: Book;
  previousCode: string | undefined;
  nextCode: string | undefined;
  chapterNumber: string;
  contents: ReturnType<typeof parseUsx>[number];
  overwrite: boolean;
}) {
  const { content, ...columnsWithoutContent } = getTableColumns(chapters);
  const [insertedChapter] = await db
    .insert(chapters)
    .values({
      bibleAbbreviation: bible.abbreviation,
      bookCode: book.code,
      previousCode,
      nextCode,
      code: `${book.code}.${chapterNumber}`,
      name: `${book.shortName} ${chapterNumber}`,
      number: Number.parseInt(chapterNumber),
      content: contents.contents,
    })
    .onConflictDoUpdate({
      target: [chapters.bibleAbbreviation, chapters.code],
      set: overwrite
        ? buildConflictUpdateColumns(chapters, [
            'previousCode',
            'nextCode',
            'name',
            'number',
            'content',
          ])
        : { code: sql`code` },
    })
    .returning(columnsWithoutContent);
  return insertedChapter;
}

export async function insertVerses({
  bible,
  book,
  chapter,
  content,
  overwrite,
}: {
  bible: typeof bibles.$inferSelect;
  book: typeof books.$inferSelect;
  chapter: Omit<typeof chapters.$inferSelect, 'content'>;
  content: ReturnType<typeof parseUsx>[number];
  overwrite: boolean;
}) {
  const { content: verseContent, ...columnsWithoutContent } = getTableColumns(verses);
  const verseEntries = Object.entries(content.verseContents).sort(
    ([left], [right]) => Number(left) - Number(right),
  );
  const allVerses: Omit<typeof verses.$inferSelect, 'content'>[] = [];
  for (let offset = 0; offset < verseEntries.length; offset += 50) {
    const batch = verseEntries.slice(offset, offset + 50);
    const insertedVerses = await db
      .insert(verses)
      .values(
        batch.map(([verseNumber, item], index) => {
          const previousNumber = verseEntries[offset + index - 1]?.[0];
          const nextNumber = verseEntries[offset + index + 1]?.[0];
          return {
            bibleAbbreviation: bible.abbreviation,
            bookCode: book.code,
            chapterCode: chapter.code,
            previousCode: previousNumber ? `${chapter.code}.${previousNumber}` : undefined,
            nextCode: nextNumber ? `${chapter.code}.${nextNumber}` : undefined,
            code: `${chapter.code}.${verseNumber}`,
            name: `${chapter.name}:${verseNumber}`,
            number: Number.parseInt(verseNumber),
            content: item.contents,
          } satisfies typeof verses.$inferInsert;
        }),
      )
      .onConflictDoUpdate({
        target: [verses.bibleAbbreviation, verses.code],
        set: overwrite
          ? buildConflictUpdateColumns(verses, [
              'previousCode',
              'nextCode',
              'name',
              'number',
              'content',
            ])
          : { code: sql`code` },
      })
      .returning(columnsWithoutContent);
    allVerses.push(...insertedVerses);
  }
  return allVerses;
}
