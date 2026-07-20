import { createOpenRouter, type OpenRouterProviderSettings } from '@openrouter/ai-sdk-provider';
import type { EmbeddingModel, ImageModel, LanguageModel } from 'ai';

export const PRIVATE_OPENROUTER_ROUTING = {
  data_collection: 'deny',
  zdr: true,
} as const;

export interface PrivateOpenRouter {
  chat(modelId: string): LanguageModel;
  embedding(modelId: string): EmbeddingModel;
  image(modelId: string): ImageModel;
}

export function createPrivateOpenRouter(config: OpenRouterProviderSettings): PrivateOpenRouter {
  const client = createOpenRouter(config);

  return {
    chat(modelId: string) {
      return client.chat(modelId, { provider: PRIVATE_OPENROUTER_ROUTING });
    },
    embedding(modelId: string) {
      return client.textEmbeddingModel(modelId, { provider: PRIVATE_OPENROUTER_ROUTING });
    },
    image(modelId: string) {
      return client.imageModel(modelId, { provider: PRIVATE_OPENROUTER_ROUTING });
    },
  };
}
