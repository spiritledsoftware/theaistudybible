import type { Content } from '@/schemas/bibles/contents';
import type { Metadata } from '@/schemas/utils/types';
import type { Attachment, FinishReason, JSONValue, Message, ToolInvocation } from 'ai';
import { add } from 'date-fns';
import { relations } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import {
  blob,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { createId } from '../utils/id';
import { baseModel, baseModelNoId, timestamp } from './utils';

export const users = sqliteTable(
  'users',
  {
    ...baseModel,
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    image: text('image'),
    stripeCustomerId: text('stripe_customer_id'),
    googleId: text('google_id'),
    appleId: text('apple_id'),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
    index('users_google_id_idx').on(table.googleId),
    index('users_apple_id_idx').on(table.appleId),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  passwords: many(passwords),
  forgottenPasswordCodes: many(forgottenPasswordCodes),
  sessions: many(sessions),
  passkeyCredentials: many(passkeyCredentials),
  userSettings: one(userSettings),
  pushSubscriptions: many(pushSubscriptions),
  usersToRoles: many(usersToRoles),
  chats: many(chats),
  messages: many(messages),
  messageReactions: many(messageReactions),
  userGeneratedImages: many(userGeneratedImages),
  userGeneratedImagesReactions: many(userGeneratedImagesReactions),
  devotionReactions: many(devotionReactions),
  chapterBookmarks: many(chapterBookmarks),
  chapterNotes: many(chapterNotes),
  dailyStudySessions: many(dailyStudySessions),
  verseHighlights: many(verseHighlights),
  verseNotes: many(verseNotes),
}));

export const passwords = sqliteTable(
  'passwords',
  {
    ...baseModel,
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [index('passwords_user_id_idx').on(table.userId)],
);

export const passwordsRelations = relations(passwords, ({ one }) => ({
  user: one(users, {
    fields: [passwords.userId],
    references: [users.id],
  }),
}));

export const forgottenPasswordCodes = sqliteTable(
  'forgotten_password_codes',
  {
    ...baseModel,
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: text('code')
      .notNull()
      .$defaultFn(() => createId()),
    expiresAt: timestamp('expires_at')
      .notNull()
      .$defaultFn(() => add(new Date(), { hours: 1 })),
  },
  (table) => [
    index('forgotten_password_codes_code_idx').on(table.code),
    index('forgotten_password_codes_user_id_idx').on(table.userId),
  ],
);

export const forgottenPasswordCodesRelations = relations(forgottenPasswordCodes, ({ one }) => ({
  user: one(users, {
    fields: [forgottenPasswordCodes.userId],
    references: [users.id],
  }),
}));

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const passkeyCredentials = sqliteTable(
  'passkey_credential',
  {
    ...baseModel,
    id: blob('id', { mode: 'buffer' }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    algorithmId: integer('algorithm_id').notNull(),
    publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
  },
  (table) => [
    index('passkey_credential_user_id_idx').on(table.userId),
    index('passkey_credential_algorithm_id_idx').on(table.algorithmId),
  ],
);

export const passkeyCredentialsRelations = relations(passkeyCredentials, ({ one }) => ({
  user: one(users, {
    fields: [passkeyCredentials.userId],
    references: [users.id],
  }),
}));

export const userSettings = sqliteTable(
  'user_settings',
  {
    ...baseModel,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    preferredBibleAbbreviation: text('preferred_bible_abbreviation').references(
      () => bibles.abbreviation,
      { onDelete: 'cascade' },
    ),
    emailNotifications: integer('email_notifications', { mode: 'boolean' }).notNull().default(true),
    aiInstructions: text('ai_instructions'),
  },
  (table) => [
    uniqueIndex('user_settings_user_id_idx').on(table.userId),
    index('user_settings_preferred_bible_abbreviation_idx').on(table.preferredBibleAbbreviation),
  ],
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
  preferredBible: one(bibles, {
    fields: [userSettings.preferredBibleAbbreviation],
    references: [bibles.abbreviation],
  }),
}));

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    ...baseModel,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_idx').on(table.endpoint),
    index('push_subscriptions_user_id_idx').on(table.userId),
  ],
);

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const roles = sqliteTable(
  'roles',
  {
    ...baseModel,
    name: text('name').notNull(),
  },
  (table) => [index('roles_name_idx').on(table.name)],
);

export const rolesRelations = relations(roles, ({ many }) => ({
  usersToRoles: many(usersToRoles),
}));

export const usersToRoles = sqliteTable(
  'users_to_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('users_to_roles_user_id_idx').on(table.userId),
    index('users_to_roles_role_id_idx').on(table.roleId),
  ],
);

export const usersToRolesRelations = relations(usersToRoles, ({ one }) => ({
  user: one(users, {
    fields: [usersToRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [usersToRoles.roleId],
    references: [roles.id],
  }),
}));

export const chats = sqliteTable(
  'chats',
  {
    ...baseModel,
    userId: text('user_id').notNull(),
    name: text('name').notNull().default('New Chat'),
    customName: integer('custom_name', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('chats_user_id_idx').on(table.userId), index('chats_name_idx').on(table.name)],
);

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
  shareOptions: one(shareChatOptions),
}));

export const shareChatOptions = sqliteTable(
  'share_chat_options',
  {
    ...baseModel,
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('chat_share_options_chat_id_idx').on(table.chatId)],
);

export const shareChatOptionsRelations = relations(shareChatOptions, ({ one }) => ({
  chat: one(chats, {
    fields: [shareChatOptions.chatId],
    references: [chats.id],
  }),
}));

export const messages = sqliteTable(
  'messages',
  {
    ...baseModel,
    // Relations fields
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    originMessageId: text('origin_message_id').references((): AnySQLiteColumn => messages.id, {
      onDelete: 'cascade',
    }),
    userId: text('user_id').notNull(),

    // Fields required by the ai sdk
    content: text('content').notNull().default(''),
    reasoning: text('reasoning'),
    tool_call_id: text('tool_call_id'),
    role: text('role', {
      enum: ['system', 'user', 'assistant', 'data'],
    }).notNull(),
    data: text('data', { mode: 'json' }).$type<JSONValue>(),
    annotations: text('annotations', { mode: 'json' }).$type<JSONValue[]>(),
    toolInvocations: text('tool_invocations', { mode: 'json' }).$type<ToolInvocation[]>(),
    finishReason: text('finish_reason').$type<FinishReason>(),
    experimental_attachments: text('attachments', { mode: 'json' }).$type<Attachment[]>(),
    parts: text('parts', { mode: 'json' }).$type<NonNullable<Message['parts']>>(),

    // Custom fields
    anonymous: integer('anonymous', { mode: 'boolean' }).notNull().default(false),
    regenerated: integer('regenerated', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('messages_chat_id_idx').on(table.chatId),
    index('messages_user_id_idx').on(table.userId),
    index('messages_origin_message_id_idx').on(table.originMessageId),
    foreignKey({
      columns: [table.originMessageId],
      foreignColumns: [table.id],
      name: 'origin_message_reference',
    }).onDelete('cascade'),
    index('messages_role_idx').on(table.role),
    index('messages_content_idx').on(table.content),
    index('messages_finish_reason_idx').on(table.finishReason),
  ],
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  originMessage: one(messages, {
    fields: [messages.originMessageId],
    references: [messages.id],
    relationName: 'responses',
  }),
  responses: many(messages, {
    relationName: 'responses',
  }),
  reactions: many(messageReactions),
  images: many(userGeneratedImages),
  messagesToSourceDocuments: many(messagesToSourceDocuments),
}));

export const messageReactions = sqliteTable(
  'message_reactions',
  {
    ...baseModel,
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reaction: text('reaction', { enum: ['LIKE', 'DISLIKE'] }).notNull(),
    comment: text('comment'),
  },
  (table) => [
    uniqueIndex('message_reactions_unique_user_idx').on(table.messageId, table.userId),
    index('message_reactions_message_id_idx').on(table.messageId),
    index('message_reactions_user_id_idx').on(table.userId),
  ],
);

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
}));

export const messagesToSourceDocuments = sqliteTable(
  'messages_to_source_documents',
  {
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    sourceDocumentId: text('source_document_id')
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: 'cascade' }),
    distance: real('distance').notNull().default(0),
    distanceMetric: text('distance_metric', {
      enum: ['cosine', 'l2', 'innerProduct'],
    })
      .notNull()
      .default('cosine'),
  },
  (table) => [
    primaryKey({
      columns: [table.messageId, table.sourceDocumentId],
    }),
    index('messages_to_source_documents_message_id_idx').on(table.messageId),
    index('messages_to_source_documents_source_document_id_idx').on(table.sourceDocumentId),
  ],
);

export const messagesToSourceDocumentsRelations = relations(
  messagesToSourceDocuments,
  ({ one }) => ({
    message: one(messages, {
      fields: [messagesToSourceDocuments.messageId],
      references: [messages.id],
    }),
  }),
);

export const userGeneratedImages = sqliteTable(
  'user_generated_images',
  {
    ...baseModel,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messageId: text('message_id').references(() => messages.id, {
      onDelete: 'cascade',
    }),
    url: text('url'),
    userPrompt: text('user_prompt').notNull(),
    prompt: text('prompt'),
    negativePrompt: text('negative_prompt'),
    searchQueries: text('search_queries', { mode: 'json' }).notNull().default([]).$type<string[]>(),
    failed: integer('failed', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('user_generated_images_user_id_idx').on(table.userId),
    index('user_generated_images_message_id_idx').on(table.messageId),
    index('user_generated_images_user_prompt_idx').on(table.userPrompt),
    index('user_generated_images_failed_idx').on(table.failed),
  ],
);

export const userGeneratedImagesRelations = relations(userGeneratedImages, ({ one, many }) => ({
  user: one(users, {
    fields: [userGeneratedImages.userId],
    references: [users.id],
  }),
  message: one(messages, {
    fields: [userGeneratedImages.messageId],
    references: [messages.id],
  }),
  reactions: many(userGeneratedImagesReactions),
  imagesToSourceDocuments: many(userGeneratedImagesToSourceDocuments),
}));

export const userGeneratedImagesReactions = sqliteTable(
  'user_generated_images_reactions',
  {
    ...baseModel,
    userGeneratedImageId: text('user_generated_image_id')
      .notNull()
      .references(() => userGeneratedImages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reaction: text('reaction', { enum: ['LIKE', 'DISLIKE'] }).notNull(),
    comment: text('comment'),
  },
  (table) => [
    uniqueIndex('user_generated_image_reaction_idx').on(table.userGeneratedImageId, table.userId),
    index('user_generated_images_reactions_user_generated_image_id_idx').on(
      table.userGeneratedImageId,
    ),
    index('user_generated_images_reactions_user_id_idx').on(table.userId),
    index('user_generated_images_reactions_reaction_idx').on(table.reaction),
  ],
);

export const userGeneratedImagesReactionsRelations = relations(
  userGeneratedImagesReactions,
  ({ one }) => ({
    user: one(users, {
      fields: [userGeneratedImagesReactions.userId],
      references: [users.id],
    }),
    userGeneratedImage: one(userGeneratedImages, {
      fields: [userGeneratedImagesReactions.userGeneratedImageId],
      references: [userGeneratedImages.id],
    }),
  }),
);

export const userGeneratedImagesToSourceDocuments = sqliteTable(
  'user_generated_images_to_source_documents',
  {
    userGeneratedImageId: text('user_generated_image_id')
      .notNull()
      .references(() => userGeneratedImages.id, { onDelete: 'cascade' }),
    sourceDocumentId: text('source_document_id')
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: 'cascade' }),
    distance: real('distance').notNull().default(0),
    distanceMetric: text('distance_metric', {
      enum: ['cosine', 'l2', 'innerProduct'],
    })
      .notNull()
      .default('cosine'),
  },
  (table) => [
    primaryKey({
      columns: [table.userGeneratedImageId, table.sourceDocumentId],
    }),
    index('user_generated_images_to_source_documents_user_generated_image_id_idx').on(
      table.userGeneratedImageId,
    ),
    index('user_generated_images_to_source_documents_source_document_id_idx').on(
      table.sourceDocumentId,
    ),
  ],
);

export const userGeneratedImagesToSourceDocumentsRelations = relations(
  userGeneratedImagesToSourceDocuments,
  ({ one }) => ({
    userGeneratedImage: one(userGeneratedImages, {
      fields: [userGeneratedImagesToSourceDocuments.userGeneratedImageId],
      references: [userGeneratedImages.id],
    }),
  }),
);

export const devotions = sqliteTable(
  'devotions',
  {
    ...baseModel,
    topic: text('topic').notNull().default('general'),
    bibleReading: text('bible_reading').notNull(),
    summary: text('summary').notNull(),
    reflection: text('reflection').notNull(),
    prayer: text('prayer').notNull(),
    diveDeeperQueries: text('dive_deeper_queries', { mode: 'json' })
      .notNull()
      .default([])
      .$type<string[]>(),
    failed: integer('failed', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('devotions_topic_idx').on(table.topic),
    index('devotions_created_at_idx').on(table.createdAt),
    index('devotions_failed_idx').on(table.failed),
  ],
);

export const devotionsRelations = relations(devotions, ({ one, many }) => ({
  images: one(devotionImages),
  reactions: many(devotionReactions),
  devotionsToSourceDocuments: many(devotionsToSourceDocuments),
}));

export const devotionReactions = sqliteTable(
  'devotion_reactions',
  {
    ...baseModel,
    devotionId: text('devotion_id')
      .notNull()
      .references(() => devotions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reaction: text('reaction', { enum: ['LIKE', 'DISLIKE'] }).notNull(),
    comment: text('comment'),
  },
  (table) => [
    uniqueIndex('devotion_reactions_unique_user_idx').on(table.devotionId, table.userId),
    index('devotion_reactions_devotion_id_idx').on(table.devotionId),
    index('devotion_reactions_user_id_idx').on(table.userId),
    index('devotion_reactions_reaction_idx').on(table.reaction),
  ],
);

export const devotionReactionsRelations = relations(devotionReactions, ({ one }) => ({
  user: one(users, {
    fields: [devotionReactions.userId],
    references: [users.id],
  }),
  devotion: one(devotions, {
    fields: [devotionReactions.devotionId],
    references: [devotions.id],
  }),
}));

export const devotionImages = sqliteTable(
  'devotion_images',
  {
    ...baseModel,
    devotionId: text('devotion_id')
      .notNull()
      .references(() => devotions.id, { onDelete: 'cascade' }),
    url: text('url'),
    prompt: text('prompt'),
    negativePrompt: text('negative_prompt'),
    caption: text('caption'),
  },
  (table) => [
    index('devotion_images_devotion_id_idx').on(table.devotionId),
    index('devotion_images_caption_idx').on(table.caption),
  ],
);

export const devotionImagesRelations = relations(devotionImages, ({ one }) => ({
  devotion: one(devotions, {
    fields: [devotionImages.devotionId],
    references: [devotions.id],
  }),
}));

export const devotionsToSourceDocuments = sqliteTable(
  'devotions_to_source_documents',
  {
    devotionId: text('devotion_id')
      .notNull()
      .references(() => devotions.id, { onDelete: 'cascade' }),
    sourceDocumentId: text('source_document_id')
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: 'cascade' }),
    distance: real('distance').notNull().default(0),
    distanceMetric: text('distance_metric', {
      enum: ['cosine', 'l2', 'innerProduct'],
    })
      .notNull()
      .default('cosine'),
  },
  (table) => [
    primaryKey({
      columns: [table.devotionId, table.sourceDocumentId],
    }),
    index('devotions_to_source_documents_devotion_id_idx').on(table.devotionId),
    index('devotions_to_source_documents_source_document_id_idx').on(table.sourceDocumentId),
  ],
);

export const devotionsToSourceDocumentsRelations = relations(
  devotionsToSourceDocuments,
  ({ one }) => ({
    devotion: one(devotions, {
      fields: [devotionsToSourceDocuments.devotionId],
      references: [devotions.id],
    }),
  }),
);

export const dataSources = sqliteTable(
  'data_sources',
  {
    ...baseModel,
    name: text('name').notNull(),
    url: text('url').notNull(),
    type: text('type', {
      enum: ['WEB_CRAWL', 'FILE', 'WEBPAGE', 'REMOTE_FILE', 'YOUTUBE'],
    }).notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<Metadata>().default({}).notNull(),
    numberOfDocuments: integer('number_of_documents').notNull().default(0),
    syncSchedule: text('sync_schedule', {
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'NEVER'],
    })
      .notNull()
      .default('NEVER'),
    lastManualSync: timestamp('last_manual_sync', { withTimezone: true }),
    lastAutomaticSync: timestamp('last_automatic_sync', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('data_sources_name_key').on(table.name),
    index('data_sources_type_idx').on(table.type),
    index('data_sources_metadata_idx').on(table.metadata),
    index('data_sources_last_manual_sync_idx').on(table.lastManualSync),
    index('data_sources_last_automatic_sync_idx').on(table.lastAutomaticSync),
  ],
);

export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  indexOperations: many(indexOperations),
  dataSourcesToSourceDocuments: many(dataSourcesToSourceDocuments),
}));

export const dataSourcesToSourceDocuments = sqliteTable(
  'data_sources_to_source_documents',
  {
    dataSourceId: text('data_source_id')
      .notNull()
      .references(() => dataSources.id, { onDelete: 'cascade' }),
    sourceDocumentId: text('source_document_id')
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.dataSourceId, table.sourceDocumentId],
    }),
    index('data_sources_to_source_documents_data_source_id_idx').on(table.dataSourceId),
    index('data_sources_to_source_documents_source_document_id_idx').on(table.sourceDocumentId),
  ],
);

export const dataSourcesToSourceDocumentsRelations = relations(
  dataSourcesToSourceDocuments,
  ({ one }) => ({
    dataSource: one(dataSources, {
      fields: [dataSourcesToSourceDocuments.dataSourceId],
      references: [dataSources.id],
    }),
  }),
);

export const indexOperations = sqliteTable(
  'index_operations',
  {
    ...baseModel,
    dataSourceId: text('data_source_id')
      .notNull()
      .references(() => dataSources.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['FAILED', 'SUCCEEDED', 'RUNNING', 'COMPLETED'],
    }).notNull(),
    metadata: text('metadata', { mode: 'json' }).notNull().default({}).$type<Metadata>(),
    errorMessages: text('error_messages', { mode: 'json' }).notNull().default([]).$type<string[]>(),
  },
  (table) => [
    index('index_operation_data_source_id_idx').on(table.dataSourceId),
    index('index_operation_status_idx').on(table.status),
    index('index_operation_metadata_idx').on(table.metadata),
  ],
);

export const indexOperationsRelations = relations(indexOperations, ({ one }) => ({
  dataSource: one(dataSources, {
    fields: [indexOperations.dataSourceId],
    references: [dataSources.id],
  }),
}));

export const bibles = sqliteTable(
  'bibles',
  {
    ...baseModelNoId,
    abbreviation: text('abbreviation').primaryKey(),
    abbreviationLocal: text('abbreviation_local').notNull(),
    name: text('name').notNull(),
    nameLocal: text('name_local').notNull(),
    description: text('description').notNull(),
    copyrightStatement: text('copyright_statement').notNull(),
    readyForPublication: integer('ready_for_publication', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (table) => [
    index('bibles_abbreviation_local_idx').on(table.abbreviationLocal),
    index('bibles_name_idx').on(table.name),
    index('bibles_name_local_idx').on(table.nameLocal),
    index('bibles_ready_for_publication_idx').on(table.readyForPublication),
  ],
);

export const biblesRelations = relations(bibles, ({ many }) => ({
  usersWhoPreferred: many(userSettings),
  biblesToLanguages: many(biblesToLanguages),
  biblesToCountries: many(biblesToCountries),
  biblesToRightsHolders: many(biblesToRightsHolders),
  biblesToRightsAdmins: many(biblesToRightsAdmins),
  biblesToContributors: many(biblesToContributors),
  books: many(books),
  chapters: many(chapters),
  verses: many(verses),
}));

export const bibleLanguages = sqliteTable(
  'bible_languages',
  {
    ...baseModelNoId,
    iso: text('iso').primaryKey(),
    name: text('name').notNull(),
    nameLocal: text('name_local').notNull(),
    script: text('script').notNull(),
    scriptCode: text('script_code').notNull(),
    scriptDirection: text('script_direction', { enum: ['LTR', 'RTL'] }).notNull(),
    ldml: text('ldml').notNull(),
    rod: integer('rod'),
    numerals: text('numerals').notNull(),
  },
  (table) => [
    index('bible_languages_name_idx').on(table.name),
    index('bible_languages_name_local_idx').on(table.nameLocal),
    index('bible_languages_script_code_idx').on(table.scriptCode),
    index('bible_languages_script_direction_idx').on(table.scriptDirection),
  ],
);

export const bibleLanguagesRelations = relations(bibleLanguages, ({ many }) => ({
  biblesToLanguages: many(biblesToLanguages),
}));

export const biblesToLanguages = sqliteTable(
  'bibles_to_languages',
  {
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    languageIso: text('language_iso')
      .references(() => bibleLanguages.iso, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bibleAbbreviation, table.languageIso] }),
    index('bibles_to_languages_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('bibles_to_languages_language_iso_idx').on(table.languageIso),
  ],
);

export const biblesToLanguagesRelations = relations(biblesToLanguages, ({ one }) => ({
  bible: one(bibles, {
    fields: [biblesToLanguages.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  language: one(bibleLanguages, {
    fields: [biblesToLanguages.languageIso],
    references: [bibleLanguages.iso],
  }),
}));

export const bibleCountries = sqliteTable(
  'bible_countries',
  {
    ...baseModelNoId,
    iso: text('iso').primaryKey(),
    name: text('name').notNull(),
  },
  (table) => [index('bible_countries_name_idx').on(table.name)],
);

export const bibleCountriesRelations = relations(bibleCountries, ({ many }) => ({
  biblesToCountries: many(biblesToCountries),
}));

export const biblesToCountries = sqliteTable(
  'bibles_to_countries',
  {
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    countryIso: text('country_iso')
      .references(() => bibleCountries.iso, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bibleAbbreviation, table.countryIso] }),
    index('bibles_to_countries_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('bibles_to_countries_country_iso_idx').on(table.countryIso),
  ],
);

export const biblesToCountriesRelations = relations(biblesToCountries, ({ one }) => ({
  bible: one(bibles, {
    fields: [biblesToCountries.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  country: one(bibleCountries, {
    fields: [biblesToCountries.countryIso],
    references: [bibleCountries.iso],
  }),
}));

export const bibleRightsHolders = sqliteTable(
  'bible_rights_holders',
  {
    ...baseModelNoId,
    uid: text('uid').primaryKey(),
    name: text('name').notNull(),
    nameLocal: text('name_local').notNull(),
    abbr: text('abbr').notNull(),
    url: text('url').notNull(),
  },
  (table) => [
    index('bible_rights_holders_name_idx').on(table.name),
    index('bible_rights_holders_abbr_idx').on(table.abbr),
  ],
);

export const bibleRightsHoldersRelations = relations(bibleRightsHolders, ({ many }) => ({
  biblesToRightsHolders: many(biblesToRightsHolders),
}));

export const biblesToRightsHolders = sqliteTable(
  'bibles_to_rights_holders',
  {
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    rightsHolderUid: text('rights_holder_uid')
      .references(() => bibleRightsHolders.uid, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.bibleAbbreviation, table.rightsHolderUid],
    }),
    index('bibles_to_rights_holders_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('bibles_to_rights_holders_rights_holder_uid_idx').on(table.rightsHolderUid),
  ],
);

export const biblesToRightsHoldersRelations = relations(biblesToRightsHolders, ({ one }) => ({
  bible: one(bibles, {
    fields: [biblesToRightsHolders.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  rightsHolder: one(bibleRightsHolders, {
    fields: [biblesToRightsHolders.rightsHolderUid],
    references: [bibleRightsHolders.uid],
  }),
}));

export const bibleRightsAdmins = sqliteTable(
  'bible_rights_admins',
  {
    ...baseModelNoId,
    uid: text('uid').primaryKey(),
    name: text('name').notNull(),
    url: text('url'),
  },
  (table) => [index('bible_rights_admins_name_idx').on(table.name)],
);

export const bibleRightsAdminsRelations = relations(bibleRightsAdmins, ({ many }) => ({
  biblesToRightsAdmins: many(biblesToRightsAdmins),
}));

export const biblesToRightsAdmins = sqliteTable(
  'bibles_to_rights_admins',
  {
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    rightsAdminUid: text('rights_admin_uid')
      .references(() => bibleRightsAdmins.uid, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.bibleAbbreviation, table.rightsAdminUid],
    }),
    index('bibles_to_rights_admins_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('bibles_to_rights_admins_rights_admin_uid_idx').on(table.rightsAdminUid),
  ],
);

export const biblesToRightsAdminsRelations = relations(biblesToRightsAdmins, ({ one }) => ({
  bible: one(bibles, {
    fields: [biblesToRightsAdmins.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  rightsAdmin: one(bibleRightsAdmins, {
    fields: [biblesToRightsAdmins.rightsAdminUid],
    references: [bibleRightsAdmins.uid],
  }),
}));

export const bibleContributors = sqliteTable(
  'bible_contributors',
  {
    ...baseModelNoId,
    uid: text('uid').primaryKey(),
    name: text('name').notNull(),
    content: integer('content', { mode: 'boolean' }).notNull().default(false),
    publication: integer('publication', { mode: 'boolean' }).notNull().default(false),
    management: integer('management', { mode: 'boolean' }).notNull().default(false),
    finance: integer('finance', { mode: 'boolean' }).notNull().default(false),
    qa: integer('qa', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('bible_contributors_name_idx').on(table.name)],
);

export const bibleContributorsRelations = relations(bibleContributors, ({ many }) => ({
  biblesToContributors: many(biblesToContributors),
}));

export const biblesToContributors = sqliteTable(
  'bibles_to_contributors',
  {
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    contributorUid: text('contributor_uid')
      .references(() => bibleContributors.uid, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.bibleAbbreviation, table.contributorUid],
    }),
    index('bibles_to_contributors_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('bibles_to_contributors_contributor_uid_idx').on(table.contributorUid),
  ],
);

export const biblesToContributorsRelations = relations(biblesToContributors, ({ one }) => ({
  bible: one(bibles, {
    fields: [biblesToContributors.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  contributor: one(bibleContributors, {
    fields: [biblesToContributors.contributorUid],
    references: [bibleContributors.uid],
  }),
}));

export const books = sqliteTable(
  'books',
  {
    ...baseModelNoId,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    previousCode: text('previous_code'),
    nextCode: text('next_code'),
    number: integer('number').notNull(),
    code: text('code').notNull(),
    abbreviation: text('abbreviation'),
    shortName: text('short_name').notNull(),
    longName: text('long_name').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'books_unique_bible_code_pk',
      columns: [table.bibleAbbreviation, table.code],
    }),
    index('books_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('books_previous_code_idx').on(table.previousCode),
    index('books_next_code_idx').on(table.nextCode),
    index('books_number_idx').on(table.number),
    index('books_code_idx').on(table.code),
    index('books_abbreviation_idx').on(table.abbreviation),
  ],
);

export const booksRelations = relations(books, ({ one, many }) => ({
  bible: one(bibles, {
    fields: [books.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  previous: one(books, {
    fields: [books.bibleAbbreviation, books.previousCode],
    references: [books.bibleAbbreviation, books.code],
    relationName: 'previous',
  }),
  next: one(books, {
    fields: [books.bibleAbbreviation, books.nextCode],
    references: [books.bibleAbbreviation, books.code],
    relationName: 'next',
  }),
  chapters: many(chapters),
  verses: many(verses),
}));

export const chapters = sqliteTable(
  'chapters',
  {
    ...baseModelNoId,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    bookCode: text('book_code').notNull(),
    previousCode: text('previous_code'),
    nextCode: text('next_code'),
    code: text('code').notNull(),
    name: text('name').notNull(),
    number: integer('number').notNull(),
    content: text('content', { mode: 'json' }).notNull().$type<Content[]>(),
  },
  (table) => [
    primaryKey({
      name: 'chapters_unique_bible_code_pk',
      columns: [table.bibleAbbreviation, table.code],
    }),
    foreignKey({
      columns: [table.bibleAbbreviation, table.bookCode],
      foreignColumns: [books.bibleAbbreviation, books.code],
    }).onDelete('cascade'),
    index('chapters_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('chapters_book_code_idx').on(table.bookCode),
    index('chapters_previous_code_idx').on(table.previousCode),
    index('chapters_next_code_idx').on(table.nextCode),
    index('chapters_code_idx').on(table.code),
    index('chapters_name_idx').on(table.name),
    index('chapters_number_idx').on(table.number),
  ],
);

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  bible: one(bibles, {
    fields: [chapters.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  book: one(books, {
    fields: [chapters.bibleAbbreviation, chapters.bookCode],
    references: [books.bibleAbbreviation, books.code],
  }),
  previous: one(chapters, {
    fields: [chapters.bibleAbbreviation, chapters.previousCode],
    references: [chapters.bibleAbbreviation, chapters.code],
    relationName: 'previous',
  }),
  next: one(chapters, {
    fields: [chapters.bibleAbbreviation, chapters.nextCode],
    references: [chapters.bibleAbbreviation, chapters.code],
    relationName: 'next',
  }),
  verses: many(verses),
  bookmarks: many(chapterBookmarks),
  notes: many(chapterNotes),
  chaptersToSourceDocuments: many(chaptersToSourceDocuments),
}));

export const chapterBookmarks = sqliteTable(
  'chapter_bookmarks',
  {
    ...baseModelNoId,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    chapterCode: text('chapter_code').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.bibleAbbreviation, table.chapterCode, table.userId] }),
    foreignKey({
      columns: [table.bibleAbbreviation, table.chapterCode],
      foreignColumns: [chapters.bibleAbbreviation, chapters.code],
    }).onDelete('cascade'),
    index('chapter_bookmarks_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('chapter_bookmarks_chapter_code_idx').on(table.chapterCode),
    index('chapter_bookmarks_user_id_idx').on(table.userId),
  ],
);

export const chapterBookmarksRelations = relations(chapterBookmarks, ({ one }) => ({
  user: one(users, {
    fields: [chapterBookmarks.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [chapterBookmarks.bibleAbbreviation, chapterBookmarks.chapterCode],
    references: [chapters.bibleAbbreviation, chapters.code],
  }),
}));

export const chapterNotes = sqliteTable(
  'chapter_notes',
  {
    ...baseModel,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    chapterCode: text('chapter_code').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bibleAbbreviation, table.chapterCode],
      foreignColumns: [chapters.bibleAbbreviation, chapters.code],
    }).onDelete('cascade'),
    index('chapter_notes_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('chapter_notes_chapter_code_idx').on(table.chapterCode),
    index('chapter_notes_user_id_idx').on(table.userId),
  ],
);

export const chapterNotesRelations = relations(chapterNotes, ({ one }) => ({
  user: one(users, {
    fields: [chapterNotes.userId],
    references: [users.id],
  }),
  chapter: one(chapters, {
    fields: [chapterNotes.bibleAbbreviation, chapterNotes.chapterCode],
    references: [chapters.bibleAbbreviation, chapters.code],
  }),
}));

export const chaptersToSourceDocuments = sqliteTable(
  'chapters_to_source_documents',
  {
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    chapterCode: text('chapter_code').notNull(),
    sourceDocumentId: text('source_document_id')
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.bibleAbbreviation, table.chapterCode, table.sourceDocumentId],
    }),
    foreignKey({
      columns: [table.bibleAbbreviation, table.chapterCode],
      foreignColumns: [chapters.bibleAbbreviation, chapters.code],
    }).onDelete('cascade'),
    index('chapters_to_source_documents_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('chapters_to_source_documents_chapter_code_idx').on(table.chapterCode),
    index('chapters_to_source_documents_source_document_id_idx').on(table.sourceDocumentId),
  ],
);

export const chaptersToSourceDocumentsRelations = relations(
  chaptersToSourceDocuments,
  ({ one }) => ({
    chapter: one(chapters, {
      fields: [chaptersToSourceDocuments.bibleAbbreviation, chaptersToSourceDocuments.chapterCode],
      references: [chapters.bibleAbbreviation, chapters.code],
    }),
    sourceDocument: one(sourceDocuments, {
      fields: [chaptersToSourceDocuments.sourceDocumentId],
      references: [sourceDocuments.id],
    }),
  }),
);

export const dailyStudySessions = sqliteTable(
  'daily_study_sessions',
  {
    ...baseModel,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    goal: text('goal').notNull(),
    passageOrTopic: text('passage_or_topic').notNull(),
    passageContext: text('passage_context').notNull(),
    conciseExplanation: text('concise_explanation').notNull(),
    reflectionPrompt: text('reflection_prompt').notNull(),
    notes: text('notes').notNull().default(''),
    recap: text('recap'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    returnedWithin7Days: integer('returned_within_7_days', { mode: 'boolean' })
      .notNull()
      .default(false),
    dailyActiveStudyBaseline: integer('daily_active_study_baseline', { mode: 'boolean' })
      .notNull()
      .default(true),
    status: text('status', { enum: ['active', 'completed', 'failed'] })
      .notNull()
      .default('active'),
    failureReason: text('failure_reason'),
  },
  (table) => [
    index('daily_study_sessions_user_id_idx').on(table.userId),
    index('daily_study_sessions_start_time_idx').on(table.startTime),
    index('daily_study_sessions_end_time_idx').on(table.endTime),
    index('daily_study_sessions_returned_within_7_days_idx').on(table.returnedWithin7Days),
    index('daily_study_sessions_status_idx').on(table.status),
  ],
);

export const dailyStudySessionsRelations = relations(dailyStudySessions, ({ one }) => ({
  user: one(users, {
    fields: [dailyStudySessions.userId],
    references: [users.id],
  }),
}));

export const readingSessions = sqliteTable(
  'reading_sessions',
  {
    ...baseModel,
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
  },
  (table) => [
    index('reading_sessions_user_id_idx').on(table.userId),
    index('reading_sessions_start_time_idx').on(table.startTime),
    index('reading_sessions_end_time_idx').on(table.endTime),
  ],
);

export const readingSessionsRelations = relations(readingSessions, ({ one }) => ({
  user: one(users, {
    fields: [readingSessions.userId],
    references: [users.id],
  }),
}));

export const verses = sqliteTable(
  'verses',
  {
    ...baseModelNoId,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    bookCode: text('book_code').notNull(),
    chapterCode: text('chapter_code').notNull(),
    previousCode: text('previous_code'),
    nextCode: text('next_code'),
    code: text('code').notNull(),
    name: text('name').notNull(),
    number: integer('number').notNull(),
    content: text('content', { mode: 'json' }).notNull().$type<Content[]>(),
  },
  (table) => [
    primaryKey({ columns: [table.bibleAbbreviation, table.code] }),
    foreignKey({
      columns: [table.bibleAbbreviation, table.bookCode],
      foreignColumns: [books.bibleAbbreviation, books.code],
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bibleAbbreviation, table.chapterCode],
      foreignColumns: [chapters.bibleAbbreviation, chapters.code],
    }).onDelete('cascade'),
    index('verses_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('verses_book_code_idx').on(table.bookCode),
    index('verses_chapter_code_idx').on(table.chapterCode),
    index('verses_next_code_idx').on(table.nextCode),
    index('verses_code_idx').on(table.code),
    index('verses_name_idx').on(table.name),
    index('verses_number_idx').on(table.number),
  ],
);

export const versesRelations = relations(verses, ({ one, many }) => ({
  bible: one(bibles, {
    fields: [verses.bibleAbbreviation],
    references: [bibles.abbreviation],
  }),
  book: one(books, {
    fields: [verses.bibleAbbreviation, verses.bookCode],
    references: [books.bibleAbbreviation, books.code],
  }),
  chapter: one(chapters, {
    fields: [verses.bibleAbbreviation, verses.chapterCode],
    references: [chapters.bibleAbbreviation, chapters.code],
  }),
  previous: one(verses, {
    fields: [verses.bibleAbbreviation, verses.previousCode],
    references: [verses.bibleAbbreviation, verses.code],
    relationName: 'previous',
  }),
  next: one(verses, {
    fields: [verses.bibleAbbreviation, verses.nextCode],
    references: [verses.bibleAbbreviation, verses.code],
    relationName: 'next',
  }),
  highlights: many(verseHighlights),
  notes: many(verseNotes),
}));

export const verseHighlights = sqliteTable(
  'verse_highlights',
  {
    ...baseModelNoId,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    verseCode: text('verse_code').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    color: text('color').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bibleAbbreviation, table.verseCode, table.userId] }),
    foreignKey({
      columns: [table.bibleAbbreviation, table.verseCode],
      foreignColumns: [verses.bibleAbbreviation, verses.code],
    }).onDelete('cascade'),
    index('verse_highlights_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('verse_highlights_verse_code_idx').on(table.verseCode),
    index('verse_highlights_user_id_idx').on(table.userId),
  ],
);

export const verseHighlightsRelations = relations(verseHighlights, ({ one }) => ({
  user: one(users, {
    fields: [verseHighlights.userId],
    references: [users.id],
  }),
  verse: one(verses, {
    fields: [verseHighlights.bibleAbbreviation, verseHighlights.verseCode],
    references: [verses.bibleAbbreviation, verses.code],
  }),
}));

export const verseNotes = sqliteTable(
  'verse_notes',
  {
    ...baseModel,
    bibleAbbreviation: text('bible_abbreviation')
      .references(() => bibles.abbreviation, { onDelete: 'cascade' })
      .notNull(),
    verseCode: text('verse_code').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bibleAbbreviation, table.verseCode],
      foreignColumns: [verses.bibleAbbreviation, verses.code],
    }).onDelete('cascade'),
    index('verse_notes_bible_abbreviation_idx').on(table.bibleAbbreviation),
    index('verse_notes_verse_code_idx').on(table.verseCode),
    index('verse_notes_user_id_idx').on(table.userId),
  ],
);

export const verseNotesRelations = relations(verseNotes, ({ one }) => ({
  user: one(users, {
    fields: [verseNotes.userId],
    references: [users.id],
  }),
  verse: one(verses, {
    fields: [verseNotes.bibleAbbreviation, verseNotes.verseCode],
    references: [verses.bibleAbbreviation, verses.code],
  }),
}));

export const sourceDocuments = sqliteTable('source_documents', {
  ...baseModel,
});
