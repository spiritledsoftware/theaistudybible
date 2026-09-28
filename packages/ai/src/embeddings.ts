import { embed, embedMany, type EmbeddingModel } from 'ai';
import { getEmbeddingDimensions, getEmbeddingModel } from './models';
import type { Document, DocumentWithEmbedding } from './types/document';

export class Embeddings {
  private embeddings: EmbeddingModel | undefined;

  constructor(embeddings?: EmbeddingModel) {
    this.embeddings = embeddings;
  }

  private get model() {
    this.embeddings ??= getEmbeddingModel();
    return this.embeddings;
  }

  async embedQuery(query: string) {
    const response = await embed({
      model: this.model,
      value: query,
    });

    assertEmbeddingDimensions([response.embedding]);
    return response.embedding;
  }

  async embedDocuments(docs: Document[]) {
    let result: DocumentWithEmbedding[] = [];

    const chunkSize = 20;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const { embeddings } = await embedMany({
        model: this.model,
        values: chunk.map((document) => document.content),
      });

      assertEmbeddingDimensions(embeddings);
      result = result.concat(
        embeddings.map((d, index) => ({
          ...chunk[index],
          embedding: d,
        })),
      );
    }
    return result;
  }
}

function assertEmbeddingDimensions(vectors: number[][]) {
  const expected = getEmbeddingDimensions();
  const mismatch = vectors.find((vector) => vector.length !== expected);
  if (mismatch) {
    throw new Error(
      `Embedding model returned ${mismatch.length} dimensions; the scripture index expects ${expected}`,
    );
  }
}

export const embeddings = new Embeddings();
