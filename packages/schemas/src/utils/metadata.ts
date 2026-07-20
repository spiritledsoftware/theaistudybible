import type { JSONValue } from 'ai';
import { z } from 'zod';

const LiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const JSONSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([LiteralSchema, z.array(JSONSchema), z.record(z.string(), JSONSchema)]),
);

export const MetadataSchema = z.record(z.string(), JSONSchema);
