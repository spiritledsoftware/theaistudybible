import { describe, expect, it } from 'vitest';
import { decodeUtf8Source } from './source-content';

describe('decodeUtf8Source', () => {
  it('decodes valid UTF-8 source text', () => {
    expect(decodeUtf8Source(new TextEncoder().encode('Approved source text'))).toBe(
      'Approved source text',
    );
  });

  it('rejects malformed UTF-8 instead of indexing replacement characters', () => {
    expect(() => decodeUtf8Source(new Uint8Array([0xc3, 0x28]))).toThrow();
  });
});
