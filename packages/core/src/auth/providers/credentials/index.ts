import { lucia } from '@/core/auth';
import { AuthError } from '@/core/auth/errors';
import { db } from '@/core/database';
import { forgottenPasswordCodes, passwords, userSettings, users } from '@/core/database/schema';
import { queueEmail } from '@/core/utils/email';
import { eq } from 'drizzle-orm';
import type { z } from 'zod';
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './schemas';
import { hashPassword, verifyPassword } from './utils';

export async function signIn(credentials: z.infer<typeof signInSchema>) {
  const validated = await signInSchema.parseAsync(credentials);
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, validated.email),
  });
  if (!existingUser) {
    throw new AuthError('InvalidSignIn', 'User not found');
  }

  const existingUserPassword = await db.query.passwords.findFirst({
    where: (passwords, { and, eq }) =>
      and(eq(passwords.userId, existingUser.id), eq(passwords.active, true)),
  });
  if (!existingUserPassword) {
    throw new AuthError(
      'DifferentProvider',
      'A password does not exist for this user. Try signing in with a different provider.',
    );
  }

  const validPassword = await verifyPassword(existingUserPassword.hash, validated.password);
  if (!validPassword) {
    throw new AuthError('InvalidSignIn', 'Invalid password');
  }

  const sessionToken = lucia.sessions.generateSessionToken();
  const session = await lucia.sessions.createSession(sessionToken, existingUser.id);
  const sessionCookie = lucia.cookies.createSessionCookie(sessionToken, session);

  return sessionCookie;
}

export async function signUp(credentials: z.infer<typeof signUpSchema>) {
  const validated = await signUpSchema.parseAsync(credentials);
  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, validated.email),
  });
  if (existingUser) {
    throw new AuthError('EmailExists', 'A user with this email already exists');
  }

  const hash = await hashPassword(validated.password);
  const [user] = await db
    .insert(users)
    .values({
      email: validated.email,
    })
    .returning();
  await Promise.all([
    db.insert(passwords).values({
      userId: user.id,
      hash,
    }),
    db.insert(userSettings).values({
      userId: user.id,
    }),
  ]);

  const sessionToken = lucia.sessions.generateSessionToken();
  const session = await lucia.sessions.createSession(sessionToken, user.id);
  const sessionCookie = lucia.cookies.createSessionCookie(sessionToken, session);

  return sessionCookie;
}

export async function requestPasswordReset(values: z.infer<typeof forgotPasswordSchema>) {
  const validated = await forgotPasswordSchema.parseAsync(values);

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, validated.email),
  });
  if (!user) {
    throw new AuthError('UserNotFound', 'User not found');
  }

  const [code] = await db
    .insert(forgottenPasswordCodes)
    .values({
      userId: user.id,
    })
    .returning();

  await queueEmail({
    subject: 'Password Reset',
    to: [user.email],
    body: {
      type: 'forgot-password',
      code: code.code,
    },
  });

  return code;
}

export async function resetPassword(values: z.infer<typeof resetPasswordSchema>) {
  const validated = await resetPasswordSchema.parseAsync(values);

  const code = await db.query.forgottenPasswordCodes.findFirst({
    where: (forgottenPasswordCodes, { eq }) => eq(forgottenPasswordCodes.code, validated.code),
  });
  if (!code || code.expiresAt < new Date()) {
    throw new AuthError('InvalidResetCode', 'Invalid reset code');
  }

  const hash = await hashPassword(validated.password);

  const oldPasswords = await db.query.passwords.findMany({
    where: (passwords, { eq }) => eq(passwords.userId, code.userId),
    orderBy: (passwords, { desc }) => [desc(passwords.createdAt)],
    limit: 2,
  });

  for (const oldPassword of oldPasswords) {
    if (await verifyPassword(oldPassword.hash, validated.password)) {
      throw new AuthError('ReusedPassword', 'New password is the same as the last two passwords');
    }
  }

  // Invalidate the existing passwords
  await db.update(passwords).set({ active: false }).where(eq(passwords.userId, code.userId));

  // Create the new password
  await db
    .insert(passwords)
    .values({ userId: code.userId, hash })
    .onConflictDoUpdate({
      target: [passwords.userId],
      set: { hash },
    });
}

export {
  newPasswordSchema,
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schemas';
