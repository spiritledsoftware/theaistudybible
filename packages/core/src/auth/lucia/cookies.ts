import type { Session } from '@/schemas/users/types';
import { env } from '@/core/env';
import { type SerializeOptions, stringifySetCookie } from 'cookie';

export class SessionCookie {
  constructor(
    public name: string,
    public value: string,
    public attributes: SerializeOptions,
  ) {}

  serialize() {
    return stringifySetCookie({ name: this.name, value: this.value, ...this.attributes });
  }
}

export const sessionCookieName = 'auth_session';

export function createSessionCookie(token: string, session: Session): SessionCookie {
  return new SessionCookie(sessionCookieName, token, {
    path: '/',
    expires: session.expiresAt,
    sameSite: 'lax',
    httpOnly: true,
    secure: env.DEV !== 'true',
  });
}

export function createBlankSessionCookie(): SessionCookie {
  return new SessionCookie(sessionCookieName, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    httpOnly: true,
    secure: env.DEV !== 'true',
  });
}
