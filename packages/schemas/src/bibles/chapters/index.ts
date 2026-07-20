import { chapters } from '@/core/database/schema';
import { defaultRefine } from '@/schemas/utils/refine';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { ContentSchema } from '../contents';

const refine = {
  ...defaultRefine,
  content: ContentSchema.array(),
};

export const ChapterSchema = createSelectSchema(chapters, refine);

export const CreateChapterSchema = createInsertSchema(chapters, refine).omit({
  createdAt: true,
  updatedAt: true,
});

export const UpdateChapterSchema = CreateChapterSchema.partial().omit({
  bibleAbbreviation: true,
  bookCode: true,
  previousCode: true,
  nextCode: true,
});

export * from './notes';
