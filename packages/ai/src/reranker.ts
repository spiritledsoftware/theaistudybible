import { env } from '@/core/env';
import { PRIVATE_OPENROUTER_ROUTING } from './openrouter';
import type { Document, DocumentWithScore } from './types/document';

const OPENROUTER_RERANK_URL = 'https://openrouter.ai/api/v1/rerank';

type OpenRouterRerankResponse = {
  results: {
    index: number;
    relevance_score: number;
  }[];
};

export type RerankerOptions = {
  model?: string;
  topK?: number;
};

export class Reranker {
  async rerankDocuments(
    query: string,
    documents: Document[],
    options?: RerankerOptions,
  ): Promise<DocumentWithScore[]> {
    const response = await fetch(OPENROUTER_RERANK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model ?? env.OPENROUTER_RERANK_MODEL,
        query,
        documents: documents.map((document) => document.content),
        top_n: options?.topK,
        return_documents: false,
        provider: PRIVATE_OPENROUTER_ROUTING,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to rerank documents: ${response.status} ${response.statusText}`);
    }
    const { results } = (await response.json()) as OpenRouterRerankResponse;
    return results.map(({ index, relevance_score }) => {
      const document = documents[index];
      if (!document) throw new Error(`OpenRouter returned invalid rerank index ${index}`);
      return { ...document, score: relevance_score };
    });
  }
}
