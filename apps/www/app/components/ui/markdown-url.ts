import { defaultUrlTransform } from 'react-markdown';

const ALLOWED_PROTOCOLS: Record<string, true> = {
  'http:': true,
  'https:': true,
  'mailto:': true,
};

export function sanitizeMarkdownUrl(url: string): string {
  const sanitized = defaultUrlTransform(url);
  if (!sanitized) return '';
  if (
    sanitized.startsWith('#') ||
    sanitized.startsWith('?') ||
    (sanitized.startsWith('/') && !sanitized.startsWith('//'))
  ) {
    return sanitized;
  }

  try {
    const parsed = new URL(sanitized);
    return parsed.protocol in ALLOWED_PROTOCOLS ? sanitized : '';
  } catch {
    return '';
  }
}
