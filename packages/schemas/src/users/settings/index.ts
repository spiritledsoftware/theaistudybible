import { CHRISTIAN_TRADITIONS } from '@/core/christian-traditions';
import { userSettings } from '@/core/database/schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { defaultRefine } from '../../utils/refine';

export const MAX_ASSISTANT_PREFERENCES_LENGTH = 1_000;
export const ChristianTraditionSchema = z.enum(CHRISTIAN_TRADITIONS);
const AssistantPreferencesSchema = z
  .string()
  .trim()
  .max(MAX_ASSISTANT_PREFERENCES_LENGTH)
  .nullable();
export const UserSettingsSchema = createSelectSchema(userSettings, {
  ...defaultRefine,
  christianTradition: ChristianTraditionSchema.nullable(),
});

export const CreateUserSettingsSchema = createInsertSchema(userSettings, {
  ...defaultRefine,
  christianTradition: ChristianTraditionSchema.nullable(),
})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({ aiInstructions: AssistantPreferencesSchema.optional() });

export const UpdateUserSettingsSchema = CreateUserSettingsSchema.partial();
