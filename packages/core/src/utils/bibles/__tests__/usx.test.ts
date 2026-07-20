import fs from 'node:fs';
import path from 'node:path';
import { parseUsx } from '@/core/utils/bibles/usx';
import { describe, expect, test } from 'vitest';

describe('USX Tests', () => {
  test('parses a complete Bible book', () => {
    const file = fs.readFileSync(path.resolve(__dirname, 'MAT.usx'), 'utf-8');
    const usx = parseUsx(file);
    expect(Object.keys(usx)).toHaveLength(28);
    expect(usx[1]?.verseContents[1]?.contents.length).toBeGreaterThan(0);
  }, 10_000);
});
