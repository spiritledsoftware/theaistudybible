import { CHRISTIAN_TRADITIONS } from '@/core/christian-traditions';
import { describe, expect, it } from 'vitest';
import { MAX_ASSISTANT_PREFERENCES_LENGTH, UpdateUserSettingsSchema } from './index';

describe('UpdateUserSettingsSchema Assistant Preferences', () => {
  it('accepts bounded response preferences', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      aiInstructions: 'Use concise language at an introductory reading level.',
    });

    expect(result.success).toBe(true);
  });

  it('rejects preferences above the stored limit', () => {
    const result = UpdateUserSettingsSchema.safeParse({
      aiInstructions: 'a'.repeat(MAX_ASSISTANT_PREFERENCES_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe('UpdateUserSettingsSchema Christian Tradition', () => {
  it.each(CHRISTIAN_TRADITIONS)('accepts the supported %s tradition', (christianTradition) => {
    expect(UpdateUserSettingsSchema.safeParse({ christianTradition }).success).toBe(true);
  });

  it('allows a Reader to clear the preference', () => {
    expect(UpdateUserSettingsSchema.safeParse({ christianTradition: null }).success).toBe(true);
  });

  it.each(['BROAD_CHRISTIAN', 'PROTESTANT', 'EVANGELICAL'])(
    'rejects the unsupported %s tradition',
    (christianTradition) => {
      expect(UpdateUserSettingsSchema.safeParse({ christianTradition }).success).toBe(false);
    },
  );
});
