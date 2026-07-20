import { isChristianTraditionApproved } from '@/core/christian-tradition-approvals';
import { lucia } from '@/core/auth';
import { db } from '@/core/database';
import { userSettings } from '@/core/database/schema';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { sql } from 'drizzle-orm';

export const authenticate = async () => {
  const sessionToken = getCookie(lucia.cookies.sessionCookieName) ?? null;
  if (!sessionToken) return { session: null, user: null };

  const { session, user } = await lucia.sessions.validateSessionToken(sessionToken);
  if (!session || !user) {
    const cookie = lucia.cookies.createBlankSessionCookie();
    setCookie(cookie.name, cookie.value, cookie.attributes);
    return { session: null, user: null };
  }

  return { session, user };
};

export const getUserRolesAndSettings = async (userId: string) => {
  const [settings, roles] = await Promise.all([
    db
      .insert(userSettings)
      .values({ userId: userId, emailNotifications: true, preferredBibleAbbreviation: null })
      .onConflictDoUpdate({
        target: [userSettings.userId],
        set: { id: sql`id` }, // No-op to return the existing row
      })
      .returning()
      .then((rows) => rows[0]),
    db.query.usersToRoles
      .findMany({
        where: (usersToRoles, { eq }) => eq(usersToRoles.userId, userId),
        with: { role: true },
      })
      .then((userRoles) => userRoles.map((role) => role.role)),
  ]);

  if (
    settings?.christianTradition &&
    !(await isChristianTraditionApproved(settings.christianTradition))
  ) {
    return { settings: { ...settings, christianTradition: null }, roles };
  }
  return { settings, roles };
};
