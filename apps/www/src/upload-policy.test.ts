import { describe, expect, it } from 'vitest';
import { validateUpload } from '../app/server/utils/upload-policy';

describe('validateUpload', () => {
  it('accepts a rights-managed DBL zip with a valid ZIP signature', () => {
    expect(
      validateUpload('bible', 'application/zip', 4, new Uint8Array([0x50, 0x4b, 0x03, 0x04])),
    ).toEqual({ maxBytes: 100 * 1024 * 1024 });
  });

  it('rejects a PDF whose content does not match its declared type', () => {
    expect(() =>
      validateUpload('source', 'application/pdf', 5, new TextEncoder().encode('hello')),
    ).toThrow('does not match');
  });

  it('rejects oversized profile images', () => {
    expect(() =>
      validateUpload(
        'profile',
        'image/png',
        5 * 1024 * 1024 + 1,
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      ),
    ).toThrow('too large');
  });

  it('rejects executable uploads disguised as text', () => {
    expect(() =>
      validateUpload('source', 'application/x-msdownload', 2, new Uint8Array([0x4d, 0x5a])),
    ).toThrow('Unsupported');
  });
});
