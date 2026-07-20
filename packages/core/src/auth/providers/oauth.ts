import { env } from '../../env';
import { decodeBase64IgnorePadding } from '@oslojs/encoding';
import { Apple, Google } from 'arctic';

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.WEB_APP_URL}/api/auth/google/callback`,
);

export const apple = new Apple(
  env.APPLE_CLIENT_ID,
  env.APPLE_TEAM_ID,
  env.APPLE_KEY_ID,
  decodeBase64IgnorePadding(
    env.APPLE_AUTH_KEY.replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replaceAll('\r', '')
      .replaceAll('\n', '')
      .trim(),
  ),
  `${env.WEB_APP_URL}/api/auth/apple/callback`,
);
