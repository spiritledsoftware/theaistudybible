import { db } from '@/core/database';
import {
  chats,
  messages as messagesTable,
  messagesToSourceDocuments,
  userGeneratedImagesToSourceDocuments,
} from '@/core/database/schema';
import { createId } from '@/core/utils/id';
import type { Bible } from '@/schemas/bibles/types';
import type { Message } from '@/schemas/chats/messages/types';
import type { Chat } from '@/schemas/chats/types';
import type { Role } from '@/schemas/roles/types';
import type { User, UserSettings } from '@/schemas/users/types';
import { JSONSchema } from '@/schemas/utils/metadata';
import {
  Output,
  convertToModelMessages,
  generateText,
  getToolName,
  isStepCount,
  isToolUIPart,
  streamText,
  toUIMessageStream,
  type FinishReason,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getChatContextSize, getChatModel } from '../models';
import { messagesToString, numTokensFromString } from '../utils';
import { getValidMessages } from '../utils/get-valid-messages';
import { systemPrompt } from './system-prompt';
import { tools } from './tools';

const maxResponseTokens = 4096;

const documentReferenceSchema = z.object({
  id: z.string(),
  score: z.number(),
});
const vectorStoreOutputSchema = z.object({
  documents: z.array(documentReferenceSchema),
  status: z.literal('success'),
});
const generatedImageOutputSchema = z.object({
  image: z.object({ id: z.string() }),
  status: z.literal('success'),
});

interface StoredMessage {
  content: string;
  id: string;
  parts?: unknown[] | null;
  role: UIMessage['role'] | 'data';
}

export interface ChatGenerationEvent {
  finishReason?: FinishReason;
  isAborted: boolean;
}

export interface ChatStepEvent {
  finishReason: FinishReason;
}

export interface CreateChatChainOptions {
  abortSignal?: AbortSignal;
  additionalContext?: string | null;
  bible?: Bible;
  chat: Chat;
  onEnd?: (event: ChatGenerationEvent) => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
  onStepEnd?: (event: ChatStepEvent) => Promise<void> | void;
  roles?: Role[] | null;
  settings?: UserSettings | null;
  user?: User | null;
  userId: string;
}

export async function renameChat({
  chatId,
  messages,
  additionalContext,
}: {
  chatId: string;
  messages: Pick<Message, 'role' | 'content'>[];
  additionalContext?: string | null;
}) {
  const { output } = await generateText({
    model: getChatModel(),
    output: Output.object({
      schema: z.object({
        title: z.string().describe('The new title of the chat'),
      }),
    }),
    instructions: `Given the following conversation, you must generate a new title for the conversation. The new title must be short and descriptive.
Here are some additional rules for you to follow:
- Do not put your title in quotes.
- Your title should be no more than 10 words.
${
  additionalContext
    ? `- You must take into account the following additional context (delimited by triple dashes):
---
${additionalContext}
---`
    : ''
}`,
    prompt: `Here's the conversation (delimited by triple dashes):
---
${messagesToString(messages)}
---

What's the new title?`,
  });

  const [chat] = await db
    .update(chats)
    .set({ name: output.title })
    .where(eq(chats.id, chatId))
    .returning();

  return chat;
}

function toUIMessage(message: StoredMessage): UIMessage {
  const role = message.role === 'data' ? 'assistant' : message.role;
  const storedParts = message.parts;
  const parts =
    storedParts && storedParts.length > 0
      ? (storedParts as UIMessage['parts'])
      : [{ type: 'text' as const, text: message.content }];

  return { id: message.id, parts, role };
}

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

async function persistSourceReferences(messageId: string, message: UIMessage) {
  const vectorPart = message.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === 'vectorStore',
  );
  if (
    !vectorPart ||
    !isToolUIPart(vectorPart) ||
    getToolName(vectorPart) !== 'vectorStore' ||
    vectorPart.state !== 'output-available'
  ) {
    return;
  }

  const vectorResult = vectorStoreOutputSchema.safeParse(vectorPart.output);
  if (!vectorResult.success) return;

  await db
    .insert(messagesToSourceDocuments)
    .values(
      vectorResult.data.documents.map((document) => ({
        messageId,
        sourceDocumentId: document.id,
        distance: 1 - document.score,
        distanceMetric: 'cosine' as const,
      })),
    )
    .onConflictDoNothing();

  const imagePart = message.parts.find(
    (part) => isToolUIPart(part) && getToolName(part) === 'generateImage',
  );
  if (
    !imagePart ||
    !isToolUIPart(imagePart) ||
    getToolName(imagePart) !== 'generateImage' ||
    imagePart.state !== 'output-available'
  ) {
    return;
  }

  const imageResult = generatedImageOutputSchema.safeParse(imagePart.output);
  if (!imageResult.success) return;

  await db
    .insert(userGeneratedImagesToSourceDocuments)
    .values(
      vectorResult.data.documents.map((document) => ({
        userGeneratedImageId: imageResult.data.image.id,
        sourceDocumentId: document.id,
        distance: 1 - document.score,
        distanceMetric: 'cosine' as const,
      })),
    )
    .onConflictDoNothing();
}

async function persistResponseMessage({
  chat,
  finishReason,
  lastUserMessageId,
  message,
  userId,
}: {
  chat: Chat;
  finishReason?: FinishReason;
  lastUserMessageId: string;
  message: UIMessage;
  userId: string;
}) {
  const [response] = await db
    .insert(messagesTable)
    .values({
      id: message.id,
      chatId: chat.id,
      content: messageText(message),
      finishReason,
      originMessageId: lastUserMessageId,
      parts: JSONSchema.array().parse(JSON.parse(JSON.stringify(message.parts))),
      role: message.role,
      userId,
    })
    .returning();

  await persistSourceReferences(response.id, message);
}

export async function createChatChain(
  options: CreateChatChainOptions,
): Promise<ReadableStream<UIMessageChunk>> {
  const pendingPromises: Promise<unknown>[] = [];
  const instructions = systemPrompt({
    additionalContext: options.additionalContext,
    user: options.user,
    settings: options.settings,
    bible: options.bible,
  });
  const systemTokens = await numTokensFromString({ text: instructions });

  const dbMessages = await getValidMessages({
    userId: options.userId,
    chatId: options.chat.id,
    maxTokens: getChatContextSize() - systemTokens - maxResponseTokens,
  });
  const lastUserMessage = dbMessages.findLast((message) => message.role === 'user');
  if (!lastUserMessage) throw new Error('No user message found');

  if (!options.chat.customName) {
    pendingPromises.push(
      renameChat({
        chatId: options.chat.id,
        messages: dbMessages,
        additionalContext: options.additionalContext,
      }),
    );
  } else {
    pendingPromises.push(
      db
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, options.chat.id))
        .execute(),
    );
  }

  const resolvedTools = tools({
    userId: options.userId,
    user: options.user,
    roles: options.roles,
    bibleAbbreviation: options.bible?.abbreviation,
    christianTradition: options.settings?.christianTradition,
  });
  const originalMessages = dbMessages.map(toUIMessage);
  const result = streamText({
    abortSignal: options.abortSignal,
    instructions,
    maxOutputTokens: maxResponseTokens,
    messages: await convertToModelMessages(originalMessages, { tools: resolvedTools }),
    model: getChatModel(),
    onStepEnd: ({ finishReason }) => options.onStepEnd?.({ finishReason }),
    stopWhen: isStepCount(5),
    tools: resolvedTools,
  });

  return toUIMessageStream({
    generateMessageId: createId,
    onEnd: async ({ finishReason, isAborted, responseMessage }) => {
      await Promise.all([
        ...pendingPromises,
        persistResponseMessage({
          chat: options.chat,
          finishReason,
          lastUserMessageId: lastUserMessage.id,
          message: responseMessage,
          userId: options.userId,
        }),
      ]);
      await options.onEnd?.({ finishReason, isAborted });
    },
    onError: (error) => {
      void options.onError?.(error);
      return 'An error occurred.';
    },
    originalMessages,
    stream: result.stream,
    tools: resolvedTools,
  });
}
