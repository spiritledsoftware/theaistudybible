import { db } from '@/core/database';
import { sourceDocuments } from '@/core/database/schema';
import { D1_MAX_BOUND_PARAMETERS, maxInsertRows } from '@/core/database/utils';
import { inArray } from 'drizzle-orm';
import { env } from '@/core/env';
import type { Embeddings } from './embeddings';
import { embeddings } from './embeddings';
import { Reranker } from './reranker';
import type { Document, DocumentWithScore } from './types/document';

export type AddDocumentsOptions = {
  namespace?: string;
  overwrite?: boolean;
};
const addDocumentsDefaults = {
  namespace: undefined,
  overwrite: false,
} as const satisfies AddDocumentsOptions;

export type SearchDocumentsOptions = {
  filter?: VectorizeVectorMetadataFilter | VectorizeVectorMetadataFilter[];
  scoreThreshold?: number;
  withEmbedding?: boolean;
  withMetadata?: boolean;
  limit?: number;
  namespace?: string;
  rerank?: boolean;
};
const searchDocumentsDefaults = {
  withEmbedding: false,
  withMetadata: true,
  filter: undefined,
  limit: 10,
  rerank: true,
} as const satisfies SearchDocumentsOptions;

export type GetDocumentsOptions = {
  withEmbedding?: boolean;
  withMetadata?: boolean;
};
const getDocumentsDefaults = {
  withEmbedding: false,
  withMetadata: true,
} as const satisfies GetDocumentsOptions;

function isVectorizeMetadataValue(value: unknown): value is VectorizeVectorMetadata {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

function toVectorizeMetadata(document: Document): Record<string, VectorizeVectorMetadata> {
  const metadata: Record<string, VectorizeVectorMetadata> = { content: document.content };
  for (const [key, value] of Object.entries(document.metadata ?? {})) {
    if (!isVectorizeMetadataValue(value)) {
      throw new TypeError(`Unsupported Vectorize metadata at "${key}"`);
    }
    metadata[key] = value;
  }
  return metadata;
}

function vectorizeMatchToDocument(match: VectorizeMatch): DocumentWithScore {
  const { content, ...metadata } = match.metadata ?? {};
  return {
    id: match.id,
    content: typeof content === 'string' ? content : '',
    embedding: match.values ? Array.from(match.values) : undefined,
    metadata,
    score: match.score,
  };
}

export class VectorStore {
  private readonly reranker = new Reranker();

  public static MAX_UPSERT_BATCH_SIZE = 1_000;
  public static MAX_DELETE_BATCH_SIZE = 1_000;

  constructor(private readonly embeddings: Embeddings) {}

  async addDocuments(
    docs: Document[],
    options: AddDocumentsOptions = addDocumentsDefaults,
  ): Promise<string[]> {
    const docsWithEmbeddings = await this.embeddings.embedDocuments(docs);
    const batches = Math.ceil(docsWithEmbeddings.length / VectorStore.MAX_UPSERT_BATCH_SIZE);
    for (let i = 0; i < batches; i++) {
      const batch = docsWithEmbeddings.slice(
        i * VectorStore.MAX_UPSERT_BATCH_SIZE,
        (i + 1) * VectorStore.MAX_UPSERT_BATCH_SIZE,
      );
      const vectors = batch.map((document) => ({
        id: document.id,
        values: document.embedding,
        namespace: options.namespace,
        metadata: toVectorizeMetadata(document),
      }));
      await Promise.all([
        options.overwrite
          ? env.SCRIPTURE_INDEX.upsert(vectors)
          : env.SCRIPTURE_INDEX.insert(vectors),
        insertSourceDocumentIds(batch.map(({ id }) => id)),
      ]);
    }
    return docsWithEmbeddings.map(({ id }) => id);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    const batches = Math.ceil(ids.length / VectorStore.MAX_DELETE_BATCH_SIZE);
    for (let i = 0; i < batches; i++) {
      const batch = ids.slice(
        i * VectorStore.MAX_DELETE_BATCH_SIZE,
        (i + 1) * VectorStore.MAX_DELETE_BATCH_SIZE,
      );
      await Promise.all([env.SCRIPTURE_INDEX.deleteByIds(batch), deleteSourceDocumentIds(batch)]);
    }
  }

  async searchDocuments(
    query: string,
    options: SearchDocumentsOptions = searchDocumentsDefaults,
  ): Promise<DocumentWithScore[]> {
    const vector = await this.embeddings.embedQuery(query);
    const configuredFilter = options.filter ?? searchDocumentsDefaults.filter;
    const filters = Array.isArray(configuredFilter) ? configuredFilter : [configuredFilter];
    const results = await Promise.all(
      filters.map((filter) =>
        env.SCRIPTURE_INDEX.query(vector, {
          topK: options.limit ?? searchDocumentsDefaults.limit,
          filter,
          namespace: options.namespace,
          returnMetadata: options.rerank || options.withMetadata,
          returnValues: options.withEmbedding,
        }),
      ),
    );
    const docs = results
      .flatMap(({ matches }) => matches)
      .filter(
        (match, index, matches) =>
          (options.scoreThreshold === undefined || match.score >= options.scoreThreshold) &&
          index === matches.findIndex(({ id }) => id === match.id),
      )
      .map(vectorizeMatchToDocument);

    if (options.rerank) {
      return await this.reranker.rerankDocuments(query, docs, {
        topK: options.limit ?? searchDocumentsDefaults.limit,
      });
    }
    return docs
      .toSorted((left, right) => right.score - left.score)
      .slice(0, options.limit ?? searchDocumentsDefaults.limit);
  }

  async getDocuments(
    ids: string[],
    options: GetDocumentsOptions = getDocumentsDefaults,
  ): Promise<Document[]> {
    const result = await env.SCRIPTURE_INDEX.getByIds(ids);
    return result.map((vector) => {
      const { content, ...metadata } = vector.metadata ?? {};
      return {
        id: vector.id,
        content: typeof content === 'string' ? content : '',
        embedding: options.withEmbedding ? Array.from(vector.values) : undefined,
        metadata: options.withMetadata ? metadata : undefined,
      };
    });
  }
}

export const vectorStore = new VectorStore(embeddings);

async function insertSourceDocumentIds(ids: string[]) {
  const size = maxInsertRows(sourceDocuments);
  for (let i = 0; i < ids.length; i += size) {
    await db
      .insert(sourceDocuments)
      .values(ids.slice(i, i + size).map((id) => ({ id })))
      .onConflictDoNothing();
  }
}

async function deleteSourceDocumentIds(ids: string[]) {
  for (let i = 0; i < ids.length; i += D1_MAX_BOUND_PARAMETERS) {
    await db
      .delete(sourceDocuments)
      .where(inArray(sourceDocuments.id, ids.slice(i, i + D1_MAX_BOUND_PARAMETERS)));
  }
}
