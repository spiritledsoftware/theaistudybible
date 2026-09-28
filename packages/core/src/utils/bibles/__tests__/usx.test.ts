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

  test('parses a book that starts with a UTF-8 byte-order mark', () => {
    const file = fs.readFileSync(path.resolve(__dirname, 'MAT.usx'), 'utf-8');
    const usx = parseUsx(`\uFEFF${file.replace(/^\uFEFF/, '')}`);
    expect(Object.keys(usx)).toHaveLength(28);
  }, 10_000);
});
