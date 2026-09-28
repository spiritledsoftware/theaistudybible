import JSZip from 'jszip';
import { describe, expect, test } from 'vitest';
import { openDblBundle } from '@/core/utils/bibles/dbl-bundle';

function zip(files: Record<string, string>) {
  const archive = new JSZip();
  for (const [name, content] of Object.entries(files)) archive.file(name, content);
  return archive.generateAsync({ type: 'uint8array' });
}

describe('openDblBundle', () => {
  test('reads a bundle whose files sit at the zip root', async () => {
    const bundle = await openDblBundle(
      await zip({ 'metadata.xml': '<root/>', 'release/USX_1/GEN.usx': 'gen' }),
    );
    expect(await bundle.file('metadata.xml')?.async('text')).toBe('<root/>');
    expect(await bundle.file('release/USX_1/GEN.usx')?.async('text')).toBe('gen');
  });

  test('reads a bundle wrapped in one top-level folder', async () => {
    const bundle = await openDblBundle(
      await zip({
        'text-a761ca71e0b3ddcf-281768/metadata.xml': '<root/>',
        'text-a761ca71e0b3ddcf-281768/release/USX_1/GEN.usx': 'gen',
      }),
    );
    expect(await bundle.file('metadata.xml')?.async('text')).toBe('<root/>');
    expect(await bundle.file('release/USX_1/GEN.usx')?.async('text')).toBe('gen');
  });

  test('does not guess between several wrapped bundles', async () => {
    const bundle = await openDblBundle(
      await zip({ 'a/metadata.xml': '<a/>', 'b/metadata.xml': '<b/>' }),
    );
    expect(bundle.file('metadata.xml')).toBeNull();
  });
});
