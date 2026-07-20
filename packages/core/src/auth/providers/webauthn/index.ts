import { cache } from '@/core/cache';
import { db } from '@/core/database';
import { passkeyCredentials } from '@/core/database/schema';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { and } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export async function createWebAuthnChallenge() {
  const challenge = new Uint8Array(20);
  crypto.getRandomValues(challenge);
  const encoded = encodeHexLowerCase(challenge);
  await cache.addToSet('webauthn:challenges', encoded);
  return challenge;
}

export async function verifyWebAuthnChallenge(challenge: Uint8Array) {
  const encoded = encodeHexLowerCase(challenge);
  return (await cache.removeFromSet('webauthn:challenges', encoded)) === 1;
}

export async function getUserPasskeyCredentials(userId: string) {
  return await db.query.passkeyCredentials.findMany({
    where: (passkeyCreds, { eq }) => eq(passkeyCreds.userId, userId),
  });
}

export async function getPasskeyCredential(credentialId: Uint8Array) {
  return await db.query.passkeyCredentials.findFirst({
    where: (passkeyCreds, { eq }) => eq(passkeyCreds.id, Buffer.from(credentialId)),
  });
}

export async function getUserPasskeyCredential(userId: string, credentialId: Uint8Array) {
  return await db.query.passkeyCredentials.findFirst({
    where: (passkeyCreds, { and, eq }) =>
      and(eq(passkeyCreds.id, Buffer.from(credentialId)), eq(passkeyCreds.userId, userId)),
  });
}

export async function createPasskeyCredential(credential: WebAuthnUserCredential) {
  return (
    await db
      .insert(passkeyCredentials)
      .values({
        ...credential,
        id: Buffer.from(credential.id),
        publicKey: Buffer.from(credential.publicKey),
      })
      .returning()
  )[0];
}

export async function deleteUserPasskeyCredential(userId: string, credentialId: Uint8Array) {
  const result = await db
    .delete(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.id, Buffer.from(credentialId)),
        eq(passkeyCredentials.userId, userId),
      ),
    );
  return result.meta.changes > 0;
}

export interface WebAuthnUserCredential {
  id: Uint8Array;
  userId: string;
  name: string;
  algorithmId: number;
  publicKey: Uint8Array;
}
