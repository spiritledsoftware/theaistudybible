import { db } from '@/core/database';
import * as schema from '@/core/database/schema';
import { buildConflictUpdateColumns } from '@/core/database/utils';
import { env } from '@/core/env';
import { eq, sql } from 'drizzle-orm';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import type { DBLMetadata, Publication } from './types';
import { parseUsx } from './usx';
export type IndexChapterEvent = {
  bibleAbbreviation: string;
  bookCode: string;
  previousCode: string | undefined;
  nextCode: string | undefined;
  chapterNumber: string;
  content: ReturnType<typeof parseUsx>[number];
  generateEmbeddings: boolean;
  overwrite: boolean;
};

type CreateBibleParams = {
  zipBuffer: Uint8Array;
  publicationId?: string;
  overwrite: boolean;
  generateEmbeddings: boolean;
};

export async function createBibleFromDblZip({
  zipBuffer,
  publicationId,
  overwrite,
  generateEmbeddings,
}: CreateBibleParams) {
  const zipFile = await JSZip.loadAsync(zipBuffer);
  const { metadata, publication } = await extractMetadataAndPublication(zipFile, publicationId);
  const abbreviation = publication.abbreviation ?? metadata.identification.abbreviation;

  console.log(`Checking if bible ${abbreviation} already exists...`);
  let bible = await findExistingBible(abbreviation, overwrite);

  bible = await createBible(metadata, abbreviation, overwrite);
  await createBibleRelations(bible, metadata);

  console.log(`Bible created with abbreviation ${bible.abbreviation}`);

  const bookInfos = getBookInfos(publication, metadata);
  const newBooks = await createBooks(bible.abbreviation, bookInfos, overwrite);
  await processBooks(zipFile, bible, newBooks, bookInfos, generateEmbeddings, overwrite);
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
  const batchSize = 50;
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

async function processBooks(
  zipFile: JSZip,
  bible: typeof schema.bibles.$inferSelect,
  books: (typeof schema.books.$inferSelect)[],
  bookInfos: ReturnType<typeof getBookInfos>,
  generateEmbeddings: boolean,
  overwrite: boolean,
) {
  for (const bookInfo of bookInfos) {
    console.log(`Processing book: ${bookInfo.code}...`);
    const book = books.find((b) => b.code === bookInfo.code);
    if (!book) throw new Error(`Book ${bookInfo.code} not found`);

    const bookFile = zipFile.file(bookInfo.src);
    if (!bookFile) throw new Error(`Book file ${bookInfo.src} not found`);

    const bookXml = await bookFile.async('text');
    const contents = parseUsx(bookXml);

    console.log('Book content parsed, sending chapters to queue...');
    await sendChaptersToIndexBucket(contents, bible, book, generateEmbeddings, overwrite);
  }
}

async function sendChaptersToIndexBucket(
  contents: ReturnType<typeof parseUsx>,
  bible: typeof schema.bibles.$inferSelect,
  book: typeof schema.books.$inferSelect,
  generateEmbeddings: boolean,
  overwrite: boolean,
) {
  const entries = Object.entries(contents).sort(([a], [b]) => Number(a) - Number(b));
  const batchSize = 50;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const messages = batch.map(([chapterNumber, content], idx) => {
      const previousNumber = entries[i + idx - 1]?.[0];
      const nextNumber = entries[i + idx + 1]?.[0];
      return {
        bibleAbbreviation: bible.abbreviation,
        bookCode: book.code,
        previousCode: previousNumber ? `${book.code}.${previousNumber}` : undefined,
        nextCode: nextNumber ? `${book.code}.${nextNumber}` : undefined,
        chapterNumber,
        content,
        generateEmbeddings,
        overwrite,
      } satisfies IndexChapterEvent;
    });

    await env.BIBLE_IMPORT_QUEUE.sendBatch(
      messages.map((message) => ({
        body: { type: 'chapter' as const, ...message },
      })),
    );
  }
}
