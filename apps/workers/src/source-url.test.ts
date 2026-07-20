import { describe, expect, it } from 'vitest';
import { assertAllowedSourceUrl, validateResolvedSourceUrl } from './source-url';

describe('assertAllowedSourceUrl', () => {
  it('accepts public HTTPS origins', () => {
    expect(assertAllowedSourceUrl('https://example.org/study/source.pdf').hostname).toBe(
      'example.org',
    );
  });

  it.each([
    'http://example.org/source',
    'https://localhost/source',
    'https://127.0.0.1/source',
    'https://10.2.3.4/source',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/source',
  ])('rejects unsafe source URL %s', (url) => {
    expect(() => assertAllowedSourceUrl(url)).toThrow('not allowed');
  });
});

describe('resolved source URLs', () => {
  it('rejects hostnames that resolve to private addresses', async () => {
    await expect(
      validateResolvedSourceUrl(new URL('https://metadata.example/source'), async () => [
        '169.254.169.254',
      ]),
    ).rejects.toThrow('not allowed');
  });

  it('accepts hostnames only when every resolved address is public', async () => {
    await expect(
      validateResolvedSourceUrl(new URL('https://example.org/source'), async () => [
        '93.184.216.34',
        '2606:2800:220:1:248:1893:25c8:1946',
      ]),
    ).resolves.toBeUndefined();
  });
});
