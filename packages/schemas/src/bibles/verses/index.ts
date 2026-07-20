import { verses } from '@/core/database/schema';
import { defaultRefine } from '@/schemas/utils/refine';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { ContentSchema } from '../contents';

const refine = {
  ...defaultRefine,
  content: ContentSchema.array(),
};

export const VerseSchema = createSelectSchema(verses, refine);

export const CreateVerseSchema = createInsertSchema(verses, refine).omit({
  createdAt: true,
  updatedAt: true,
});

export const UpdateVerseSchema = CreateVerseSchema.partial().omit({
  bibleAbbreviation: true,
  bookCode: true,
  chapterCode: true,
  previousCode: true,
  nextCode: true,
});

export * from './notes';
