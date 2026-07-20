import { vectorStore } from '@/ai/vector-store';
import { db } from '@/core/database';
import { dataSources, dataSourcesToSourceDocuments, indexOperations } from '@/core/database/schema';
import { env } from '@/core/env';
import { eq } from 'drizzle-orm';
import { extractText } from 'unpdf';
import { z } from 'zod';
import { fetchAllowedSource } from './source-url';
import { decodeUtf8Source } from './source-content';

const syncRequestSchema = z.object({
  id: z.string().min(1),
  manual: z.boolean().default(false),
});

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const CHUNK_CHARACTERS = 2_800;
const CHUNK_OVERLAP = 280;

function stripHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkText(text: string) {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + CHUNK_CHARACTERS);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf(' ', end));
      if (boundary > offset + CHUNK_CHARACTERS / 2) end = boundary;
    }
    const content = text.slice(offset, end).trim();
    if (content) chunks.push(content);
    if (end >= text.length) break;
    offset = Math.max(offset + 1, end - CHUNK_OVERLAP);
  }
  return chunks;
}

async function loadSource(dataSource: typeof dataSources.$inferSelect) {
  if (dataSource.type === 'FILE') {
    const url = new URL(dataSource.url);
    if (url.protocol !== 'r2:' || url.hostname !== 'private-sources') {
      throw new Error('Invalid private Grounding Source URL');
    }
    const object = await env.PRIVATE_SOURCES.get(url.pathname.slice(1));
    if (!object) throw new Error('Grounding Source file not found');
    if (object.size > MAX_SOURCE_BYTES) throw new Error('Grounding Source exceeds 25MB');
    return {
      bytes: new Uint8Array(await object.arrayBuffer()),
      contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
    };
  }

  if (dataSource.type !== 'REMOTE_FILE' && dataSource.type !== 'WEBPAGE') {
    throw new Error(`Unsupported Grounding Source type: ${dataSource.type}`);
  }
  const response = await fetchAllowedSource(dataSource.url);
  if (!response.ok) throw new Error(`Grounding Source request failed with ${response.status}`);
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_SOURCE_BYTES) throw new Error('Grounding Source exceeds 25MB');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('Grounding Source exceeds 25MB');
  return {
    bytes,
    contentType: response.headers.get('content-type')?.split(';')[0] ?? 'text/plain',
  };
}

async function extractSourceText(bytes: Uint8Array, contentType: string) {
  if (contentType === 'application/pdf') {
    const result = await extractText(bytes, { mergePages: true });
    return result.text;
  }
  if (contentType === 'text/html') return stripHtml(decodeUtf8Source(bytes));
  if (contentType === 'text/plain' || contentType === 'text/markdown') {
    return decodeUtf8Source(bytes).trim();
  }
  throw new Error(`Unsupported Grounding Source content type: ${contentType}`);
}

export async function syncGroundingSource(input: unknown) {
  const request = syncRequestSchema.parse(input);
  const dataSource = await db.query.dataSources.findFirst({
    where: (table, { eq: equals }) => equals(table.id, request.id),
    with: { dataSourcesToSourceDocuments: true },
  });
  if (!dataSource) throw new Error('Grounding Source not found');
  if (dataSource.approvalStatus !== 'APPROVED') {
    throw new Error('Grounding Source must be approved before indexing');
  }

  const [operation] = await db
    .insert(indexOperations)
    .values({ dataSourceId: dataSource.id, status: 'RUNNING', metadata: dataSource.metadata })
    .returning();

  try {
    const { bytes, contentType } = await loadSource(dataSource);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const checksum = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (!dataSource.checksum || checksum !== dataSource.checksum) {
      throw new Error('Grounding Source checksum does not match the approved artifact');
    }

    const text = await extractSourceText(bytes, contentType);
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error('Grounding Source contains no indexable text');

    const sourceDocumentIds = await vectorStore.addDocuments(
      chunks.map((content, index) => ({
        id: `${dataSource.id}:${checksum.slice(0, 16)}:${index}`,
        content: `From ${dataSource.name}:\n---\n${content}`,
        metadata: {
          ...dataSource.metadata,
          approvalStatus: dataSource.approvalStatus,
          attribution: dataSource.attribution ?? '',
          checksum,
          chunk: index + 1,
          chunkCount: chunks.length,
          dataSourceId: dataSource.id,
          name: dataSource.name,
          rightsBasis: dataSource.rightsBasis ?? '',
          traditionClassification: dataSource.traditionClassification.join(','),
          type: dataSource.type,
          url: dataSource.url,
          version: dataSource.version,
        },
      })),
      { overwrite: true },
    );

    const sourceDocumentIdSet = new Set(sourceDocumentIds);
    const obsoleteDocumentIds = dataSource.dataSourcesToSourceDocuments
      .map((item) => item.sourceDocumentId)
      .filter((id) => !sourceDocumentIdSet.has(id));
    if (obsoleteDocumentIds.length > 0) {
      await vectorStore.deleteDocuments(obsoleteDocumentIds);
    }

    await Promise.all([
      db
        .delete(dataSourcesToSourceDocuments)
        .where(eq(dataSourcesToSourceDocuments.dataSourceId, dataSource.id)),
      db
        .update(indexOperations)
        .set({ status: 'COMPLETED' })
        .where(eq(indexOperations.id, operation.id)),
      db
        .update(dataSources)
        .set({
          numberOfDocuments: sourceDocumentIds.length,
          ...(request.manual ? { lastManualSync: new Date() } : { lastAutomaticSync: new Date() }),
        })
        .where(eq(dataSources.id, dataSource.id)),
    ]);
    await db.insert(dataSourcesToSourceDocuments).values(
      sourceDocumentIds.map((sourceDocumentId) => ({
        dataSourceId: dataSource.id,
        sourceDocumentId,
      })),
    );
  } catch (error) {
    await db
      .update(indexOperations)
      .set({
        status: 'FAILED',
        errorMessages: [error instanceof Error ? error.message : 'Unknown indexing failure'],
      })
      .where(eq(indexOperations.id, operation.id));
    throw error;
  }
}
