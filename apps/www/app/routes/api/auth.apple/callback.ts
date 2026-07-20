import { lucia } from '@/core/auth/lucia';
import { apple } from '@/core/auth/providers/oauth';
import { db } from '@/core/database';
import { users } from '@/core/database/schema';
import { ObjectParser } from '@pilcrowjs/object-parser';
import { createFileRoute } from '@tanstack/react-router';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { decodeIdToken } from 'arctic';
import { eq } from 'drizzle-orm';

type AppleNameObject = { firstName?: string; lastName?: string };

export const Route = createFileRoute('/api/auth/apple/callback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const storedState = getCookie('apple_oauth_state');
        const body = await request.formData();
        const code = body.get('code') as string | null;
        const state = body.get('state') as string | null;

        if (!storedState || !code || !state) {
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

        let appleId: string;
        let name: AppleNameObject | undefined;
        let email: string | undefined;
        try {
          const tokens = await apple.validateAuthorizationCode(code);
          const claims = decodeIdToken(tokens.idToken());
          const claimsParser = new ObjectParser(claims);

          if (!claimsParser.has('sub')) {
            throw new Error('Missing sub claim');
          }
          appleId = claimsParser.getString('sub');

          if (claimsParser.has('name')) {
            name = claimsParser.getObject('name') as AppleNameObject;
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

        const existingUserByAppleId = await db.query.users.findFirst({
          where: (table, { eq }) => eq(table.appleId, appleId),
        });
        if (existingUserByAppleId) {
          const sessionToken = lucia.sessions.generateSessionToken();
          const session = await lucia.sessions.createSession(
            sessionToken,
            existingUserByAppleId.id,
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
            .set({ appleId, firstName: name?.firstName, lastName: name?.lastName })
            .where(eq(users.id, user.id))
            .returning();
        } else {
          [user] = await db
            .insert(users)
            .values({ appleId, email, firstName: name?.firstName, lastName: name?.lastName })
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
