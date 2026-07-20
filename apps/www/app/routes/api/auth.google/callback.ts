import { lucia } from '@/core/auth';
import { google } from '@/core/auth/providers/oauth';
import { db } from '@/core/database';
import { users } from '@/core/database/schema';
import { ObjectParser } from '@pilcrowjs/object-parser';
import { createFileRoute } from '@tanstack/react-router';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { decodeIdToken } from 'arctic';
import { eq } from 'drizzle-orm';

export const Route = createFileRoute('/api/auth/google/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const storedState = getCookie('google_oauth_state');
        const codeVerifier = getCookie('google_code_verifier');

        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!storedState || !codeVerifier || !code || !state) {
          return new Response('Missing required parameters.', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
        if (storedState !== state) {
          return new Response('Invalid state.', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        let googleId: string;
        let name: string | undefined;
        let picture: string | undefined;
        let email: string | undefined;
        try {
          const tokens = await google.validateAuthorizationCode(code, codeVerifier);
          const claims = decodeIdToken(tokens.idToken());
          const claimsParser = new ObjectParser(claims);

          if (!claimsParser.has('sub')) {
            throw new Error('Missing sub claim');
          }
          googleId = claimsParser.getString('sub');

          if (claimsParser.has('name')) {
            name = claimsParser.getString('name');
          }
          if (claimsParser.has('picture')) {
            picture = claimsParser.getString('picture');
          }
          if (claimsParser.has('email')) {
            email = claimsParser.getString('email');
          }
        } catch (e) {
          return new Response(
            `Invalid authorization code. ${e instanceof Error ? e.message : 'Unknown error'}`,
            { status: 400, headers: { 'Content-Type': 'text/plain' } },
          );
        }

        const existingUserByGoogleId = await db.query.users.findFirst({
          where: (table, { eq }) => eq(table.googleId, googleId),
        });
        if (existingUserByGoogleId) {
          const sessionToken = lucia.sessions.generateSessionToken();
          const session = await lucia.sessions.createSession(
            sessionToken,
            existingUserByGoogleId.id,
          );
          const sessionCookie = lucia.cookies.createSessionCookie(sessionToken, session);
          setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

          const redirectUrl = getCookie('redirect_url');
          return new Response(null, {
            status: 302,
            headers: { Location: redirectUrl ?? '/' },
          });
        }

        if (!email) {
          return new Response('Email address is required for sign-up.', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        let user = await db.query.users.findFirst({
          where: (table, { eq }) => eq(table.email, email),
        });
        if (user) {
          [user] = await db
            .update(users)
            .set({
              googleId,
              firstName: name?.split(' ')[0],
              lastName: name?.split(' ')[1],
              image: picture,
            })
            .where(eq(users.id, user.id))
            .returning();
        } else {
          [user] = await db
            .insert(users)
            .values({
              googleId,
              email,
              firstName: name?.split(' ')[0],
              lastName: name?.split(' ')[1],
              image: picture,
            })
            .returning();
        }

        const sessionToken = lucia.sessions.generateSessionToken();
        const session = await lucia.sessions.createSession(sessionToken, user.id);
        const sessionCookie = lucia.cookies.createSessionCookie(sessionToken, session);
        setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

        const redirectUrl = getCookie('redirect_url');
        return new Response(null, {
          status: 302,
          headers: { Location: redirectUrl ?? '/' },
        });
      },
    },
  },
});
