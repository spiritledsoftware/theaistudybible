import { env } from '@/core/env';
import { createPrivateOpenRouter, type PrivateOpenRouter } from './openrouter';

let openrouter: PrivateOpenRouter | undefined;

function requireConfiguration(
  key:
    | 'AI_CONTEXT_SIZE'
    | 'OPENROUTER_CHAT_MODEL'
    | 'OPENROUTER_EMBEDDING_MODEL'
    | 'OPENROUTER_IMAGE_MODEL',
) {
  const value = env[key];
  if (!value) throw new Error(`Missing required AI configuration: ${key}`);
  return value;
}

function getOpenRouter() {
  openrouter ??= createPrivateOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
  return openrouter;
}

export function getChatModel() {
  return getOpenRouter().chat(requireConfiguration('OPENROUTER_CHAT_MODEL'));
}

export function getEmbeddingModel() {
  return getOpenRouter().embedding(requireConfiguration('OPENROUTER_EMBEDDING_MODEL'));
}

export function getImageModel() {
  return getOpenRouter().image(requireConfiguration('OPENROUTER_IMAGE_MODEL'));
}

export function getChatContextSize() {
  const value = Number(requireConfiguration('AI_CONTEXT_SIZE'));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('AI_CONTEXT_SIZE must be a positive integer');
  }
  return value;
}

export const embeddingModel = {
  chunkOverlap: 128,
  chunkSize: 512,
} as const;
