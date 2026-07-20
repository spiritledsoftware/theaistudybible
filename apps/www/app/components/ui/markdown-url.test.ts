import { describe, expect, it } from 'vitest';
import { sanitizeMarkdownUrl } from './markdown-url';

describe('sanitizeMarkdownUrl', () => {
  it.each([
    '/bible/NASB/GEN/1',
    '#section',
    'https://theaistudybible.com/bible/NASB/GEN/1',
    'mailto:support@theaistudybible.com',
  ])('keeps safe URL %s', (url) => {
    expect(sanitizeMarkdownUrl(url)).toBe(url);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    '//evil.example/track',
    'not a url',
  ])('rejects unsafe URL %s', (url) => {
    expect(sanitizeMarkdownUrl(url)).toBe('');
  });
});
