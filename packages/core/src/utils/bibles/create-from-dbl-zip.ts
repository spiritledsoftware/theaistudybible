import { db } from '@/core/database';
import * as schema from '@/core/database/schema';
import { buildConflictUpdateColumns, maxInsertRows } from '@/core/database/utils';
import { env } from '@/core/env';
import { openDblBundle } from './dbl-bundle';
import { eq, sql } from 'drizzle-orm';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type JSZip from 'jszip';
import type { DBLMetadata, Publication } from './types';
import { parseUsx, type UsxBook } from './usx';

/**
 * A chapter's parsed content is up to ~340 KB, above the 128 KB Queues message
 * limit, so it is staged in PRIVATE_SOURCES and the message carries its key.
 */
export type IndexChapterEvent = {
  bibleAbbreviation: string;
  bookCode: string;
  previousCode: string | undefined;
  nextCode: string | undefined;
  chapterNumber: string;
  contentKey: string;
  generateEmbeddings: boolean;
  overwrite: boolean;
};

/** One per book, so no invocation parses or stages the whole Bible. */
export type IndexBookEvent = {
  archiveKey: string;
  bibleAbbreviation: string;
  bookCode: string;
  src: string;
  generateEmbeddings: boolean;
  overwrite: boolean;
};

type CreateBibleParams = {
  /** PRIVATE_SOURCES key of the uploaded archive; book messages reread it. */
  archiveKey: string;
  zipBuffer: Uint8Array;
  publicationId?: string;
  overwrite: boolean;
  generateEmbeddings: boolean;
};

export async function createBibleFromDblZip({
  archiveKey,
  zipBuffer,
  publicationId,
  overwrite,
  generateEmbeddings,
}: CreateBibleParams) {
  const zipFile = await openDblBundle(zipBuffer);
  const { metadata, publication } = await extractMetadataAndPublication(zipFile, publicationId);
  const abbreviation = publication.abbreviation ?? metadata.identification.abbreviation;

  console.log(`Checking if bible ${abbreviation} already exists...`);
  let bible = await findExistingBible(abbreviation, overwrite);

  bible = await createBible(metadata, abbreviation, overwrite);
  await createBibleRelations(bible, metadata);

  console.log(`Bible created with abbreviation ${bible.abbreviation}`);

  const bookInfos = getBookInfos(publication, metadata);
  const books = await createBooks(bible.abbreviation, bookInfos, overwrite);
  const events = bookInfos.map((bookInfo) => {
    const book = books.find((b) => b.code === bookInfo.code.toUpperCase());
    if (!book) throw new Error(`Book ${bookInfo.code} not found`);
    return {
      archiveKey,
      bibleAbbreviation: bible.abbreviation,
      bookCode: book.code,
      src: bookInfo.src,
      generateEmbeddings,
      overwrite,
    } satisfies IndexBookEvent;
  });
  // Queues accepts at most 100 messages per sendBatch.
  for (let i = 0; i < events.length; i += 100) {
    await env.BIBLE_IMPORT_QUEUE.sendBatch(
      events.slice(i, i + 100).map((event) => ({ body: { type: 'book' as const, ...event } })),
    );
  }
}

/** Parses one book of the archive and queues its chapters. */
export async function stageBookChapters({
  zipBuffer,
  bibleAbbreviation,
  bookCode,
  src,
  generateEmbeddings,
  overwrite,
}: Omit<IndexBookEvent, 'archiveKey'> & { zipBuffer: Uint8Array }) {
  const zipFile = await openDblBundle(zipBuffer);
  const bookFile = zipFile.file(src);
  if (!bookFile) throw new Error(`Book file ${src} not found`);
  const contents = parseUsx(await bookFile.async('text'));
  await stageChapters(contents, bibleAbbreviation, bookCode, generateEmbeddings, overwrite);
}

async function extractMetadataAndPublication(zipFile: JSZip, publicationId?: string) {
  const metadataFile = zipFile.file('metadata.xml');
  if (!metadataFile) throw new Error('metadata.xml not found');

  const metadataXml = await metadataFile.async('text');
  const { DBLMetadata: metadata } = new XMLParser({
    ignoreAttributes: false,
    allowBooleanAttributes: true,
  }).parse(metadataXml) as { DBLMetadata: DBLMetadata };

  const publication = findPublication(metadata, publicationId);
  if (!publication) throw new Error('Publication not found');

  return { metadata, publication };
}

function findPublication(metadata: DBLMetadata, publicationId?: string): Publication | undefined {
  if (publicationId) {
    if (Array.isArray(metadata.publications.publication)) {
      return metadata.publications.publication.find((pub) => pub['@_id'] === publicationId);
    }
    return metadata.publications.publication['@_id'] === publicationId
      ? metadata.publications.publication
      : undefined;
  }
  if (Array.isArray(metadata.publications.publication)) {
    return (
      metadata.publications.publication.find((pub) => pub['@_default'] === 'true') ||
      metadata.publications.publication[0]
    );
  }
  return metadata.publications.publication['@_default'] === 'true'
    ? metadata.publications.publication
    : undefined;
}

async function findExistingBible(abbreviation: string, overwrite: boolean) {
  const bible = await db.query.bibles.findFirst({
    where: eq(schema.bibles.abbreviation, abbreviation),
  });

  if (bible) {
    if (!overwrite) {
      throw new Error(
        `Bible ${abbreviation} already exists. Abbreviation: ${bible.abbreviation}. Use --overwrite to replace it.`,
      );
    }
  }

  return bible;
}

async function createBible(metadata: DBLMetadata, abbreviation: string, overwrite: boolean) {
  const copyRightHtml = new XMLBuilder({
    ignoreAttributes: false,
  }).build(metadata.copyright.fullStatement.statementContent);

  const [bible] = await db
    .insert(schema.bibles)
    .values({
      abbreviation,
      abbreviationLocal: metadata.identification.abbreviationLocal,
      name: metadata.identification.name,
      nameLocal: metadata.identification.nameLocal,
      description: metadata.identification.description,
      copyrightStatement: copyRightHtml,
    })
    .onConflictDoUpdate({
      target: [schema.bibles.abbreviation],
      set: overwrite
        ? buildConflictUpdateColumns(schema.bibles, [
            'abbreviation',
            'abbreviationLocal',
            'name',
            'nameLocal',
            'description',
            'copyrightStatement',
          ])
        : { abbreviation: sql`abbreviation` },
    })
    .returning();

  return bible;
}

async function createBibleRelations(
  bible: typeof schema.bibles.$inferSelect,
  metadata: DBLMetadata,
) {
  await createBibleLanguage(bible.abbreviation, metadata.language);
  await createBibleCountries(bible.abbreviation, metadata.countries.country);
  await createBibleRightsHolder(bible.abbreviation, metadata.agencies.rightsHolder);
  await createBibleRightsAdmin(bible.abbreviation, metadata.agencies.rightsAdmin);
  await createBibleContributor(bible.abbreviation, metadata.agencies.contributor);
}

async function createBibleLanguage(
  bibleAbbreviation: string,
  dblLanguage: DBLMetadata['language'],
) {
  const { iso, ...rest } = dblLanguage;

  const [language] = await db
    .insert(schema.bibleLanguages)
    .values(dblLanguage)
    .onConflictDoUpdate({
      target: [schema.bibleLanguages.iso],
      set: rest,
    })
    .returning();
  await db
    .insert(schema.biblesToLanguages)
    .values({
      bibleAbbreviation,
      languageIso: language.iso,
    })
    .onConflictDoNothing();
}

async function createBibleCountries(
  bibleAbbreviation: string,
  dblCountries: DBLMetadata['countries']['country'],
) {
  const countriesArray = Array.isArray(dblCountries) ? dblCountries : [dblCountries];
  const countries = await db
    .insert(schema.bibleCountries)
    .values(countriesArray)
    .onConflictDoUpdate({
      target: [schema.bibleCountries.iso],
      set: buildConflictUpdateColumns(
        schema.bibleCountries,
        Object.keys(countriesArray[0]).filter((key) =>
          ['id', 'iso', 'createdAt', 'updatedAt'].includes(key),
        ) as (keyof typeof schema.bibleCountries.$inferSelect)[],
      ),
    })
    .returning();
  await db
    .insert(schema.biblesToCountries)
    .values(
      countries.map((country) => ({
        bibleAbbreviation,
        countryIso: country.iso,
      })),
    )
    .onConflictDoNothing();
}

async function createBibleRightsHolder(
  bibleAbbreviation: string,
  dblRightsHolder: DBLMetadata['agencies']['rightsHolder'],
) {
  const { uid, ...rest } = dblRightsHolder;
  const [rightsHolder] = await db
    .insert(schema.bibleRightsHolders)
    .values(dblRightsHolder)
    .onConflictDoUpdate({
      target: [schema.bibleRightsHolders.uid],
      set: rest,
    })
    .returning();
  await db
    .insert(schema.biblesToRightsHolders)
    .values({
      bibleAbbreviation,
      rightsHolderUid: rightsHolder.uid,
    })
    .onConflictDoNothing();
}

async function createBibleRightsAdmin(
  bibleAbbreviation: string,
  dblRightsAdmin: DBLMetadata['agencies']['rightsAdmin'],
) {
  const { uid, ...rest } = dblRightsAdmin;
  const [rightsAdmin] = await db
    .insert(schema.bibleRightsAdmins)
    .values(dblRightsAdmin)
    .onConflictDoUpdate({
      target: [schema.bibleRightsAdmins.uid],
      set: rest,
    })
    .returning();
  await db
    .insert(schema.biblesToRightsAdmins)
    .values({
      bibleAbbreviation,
      rightsAdminUid: rightsAdmin.uid,
    })
    .onConflictDoNothing();
}

async function createBibleContributor(
  bibleAbbreviation: string,
  dblContributor: DBLMetadata['agencies']['contributor'],
) {
  const contributorsArray = Array.isArray(dblContributor) ? dblContributor : [dblContributor];
  const contributors = await db
    .insert(schema.bibleContributors)
    .values(contributorsArray)
    .onConflictDoUpdate({
      target: [schema.bibleContributors.uid],
      set: buildConflictUpdateColumns(
        schema.bibleContributors,
        Object.keys(contributorsArray[0]).filter((key) =>
          ['id', 'uid', 'createdAt', 'updatedAt'].includes(key),
        ) as (keyof typeof schema.bibleContributors.$inferSelect)[],
      ),
    })
    .returning();

  await db
    .insert(schema.biblesToContributors)
    .values(
      contributors.map((contributor) => ({
        bibleAbbreviation,
        contributorUid: contributor.uid,
      })),
    )
    .onConflictDoNothing();
}

function getBookInfos(publication: Publication, metadata: DBLMetadata) {
  return publication.structure.content.map((content) => {
    const name = metadata.names.name.find((name) => content['@_name'] === name['@_id']);
    if (!name) throw new Error(`Content ${content['@_name']} not found`);
    return {
      src: content['@_src'],
      code: content['@_role'],
      abbreviation: name.abbr,
      shortName: name.short,
      longName: name.long,
    };
  });
}

async function createBooks(
  bibleAbbreviation: string,
  bookInfos: ReturnType<typeof getBookInfos>,
  overwrite: boolean,
) {
  const batchSize = maxInsertRows(schema.books);
  const allBooks = [];

  for (let i = 0; i < bookInfos.length; i += batchSize) {
    const batch = bookInfos.slice(i, i + batchSize);
    const insertedBooks = await db
      .insert(schema.books)
      .values(
        batch.map((book, idx) => {
          const { src, code, ...rest } = book;
          return {
            ...rest,
            previousCode: bookInfos[i + idx - 1]?.code,
            nextCode: bookInfos[i + idx + 1]?.code,
            code: code.toUpperCase(),
            number: i + idx + 1,
            bibleAbbreviation,
          } satisfies typeof schema.books.$inferInsert;
        }),
      )
      .onConflictDoUpdate({
        target: [schema.books.bibleAbbreviation, schema.books.code],
        set: overwrite
          ? buildConflictUpdateColumns(schema.books, [
              'previousCode',
              'nextCode',
              'abbreviation',
              'shortName',
              'longName',
              'number',
            ])
          : { code: sql`code` },
      })
      .returning();
    allBooks.push(...insertedBooks);
  }

  return allBooks;
}

async function stageChapters(
  contents: UsxBook,
  bibleAbbreviation: string,
  bookCode: string,
  generateEmbeddings: boolean,
  overwrite: boolean,
) {
  const entries = Object.entries(contents).sort(([a], [b]) => Number(a) - Number(b));
  const batchSize = 50;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const messages = await Promise.all(
      batch.map(async ([chapterNumber, content], idx) => {
        const previousNumber = entries[i + idx - 1]?.[0];
        const nextNumber = entries[i + idx + 1]?.[0];
        const contentKey = `bible-imports/${bibleAbbreviation}/${bookCode}/${chapterNumber}.json`;
        await env.PRIVATE_SOURCES.put(contentKey, JSON.stringify(content), {
          httpMetadata: { contentType: 'application/json' },
        });
        return {
          bibleAbbreviation,
          bookCode,
          previousCode: previousNumber ? `${bookCode}.${previousNumber}` : undefined,
          nextCode: nextNumber ? `${bookCode}.${nextNumber}` : undefined,
          chapterNumber,
          contentKey,
          generateEmbeddings,
          overwrite,
        } satisfies IndexChapterEvent;
      }),
    );

    await env.BIBLE_IMPORT_QUEUE.sendBatch(
      messages.map((message) => ({
        body: { type: 'chapter' as const, ...message },
      })),
    );
  }
}
