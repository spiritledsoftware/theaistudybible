import { env } from './env';

export function getPublicMediaUrl(key: string) {
  const baseUrl = env.PUBLIC_MEDIA_URL.endsWith('/')
    ? env.PUBLIC_MEDIA_URL
    : `${env.PUBLIC_MEDIA_URL}/`;
  return new URL(key, baseUrl).toString();
}

export function getPublicMediaKey(url: string) {
  const mediaUrl = new URL(env.PUBLIC_MEDIA_URL);
  const candidate = new URL(url);
  if (candidate.origin !== mediaUrl.origin) return null;
  const key = decodeURIComponent(candidate.pathname.replace(/^\/+/, ''));
  return key || null;
}

export function getPrivateSourceKey(url: string) {
  try {
    const candidate = new URL(url);
    if (candidate.protocol !== 'r2:' || candidate.hostname !== 'private-sources') return null;
    const key = decodeURIComponent(candidate.pathname.replace(/^\/+/, ''));
    return key || null;
  } catch {
    return null;
  }
}

export function getPrivateSourcesBucket() {
  return env.PRIVATE_SOURCES;
}

export function getPublicMediaBucket() {
  return env.PUBLIC_MEDIA;
}
