import { SOURCE_CHRISTIAN_TRADITIONS } from '@/core/christian-traditions';
import { dataSources } from '@/core/database/schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { MetadataSchema } from '../utils/metadata';
import { defaultRefine } from '../utils/refine';

export const SourceChristianTraditionSchema = z.enum(SOURCE_CHRISTIAN_TRADITIONS);
const refine = {
  ...defaultRefine,
  metadata: MetadataSchema,
  version: z.string().min(1).max(100),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  attribution: z.string().min(1).max(2_000).nullable(),
  traditionClassification: z.array(SourceChristianTraditionSchema).max(9),
};

export const DataSourceSchema = createSelectSchema(dataSources, refine);

export const CreateDataSourceSchema = createInsertSchema(dataSources, {
  ...refine,
  name: z.string().min(1).max(255),
  url: z.url().refine((url) => url.startsWith('https://') || url.startsWith('r2://'), {
    message: 'Origin must use HTTPS or private R2 storage',
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAutomaticSync: true,
  lastManualSync: true,
});

export const UpdateDataSourceSchema = CreateDataSourceSchema.partial();

export * from './index-operations';
