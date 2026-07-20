import { db } from '@/core/database';
import { users } from '@/core/database/schema';
import { env } from '@/core/env';
import {
  getPrivateSourcesBucket,
  getPublicMediaBucket,
  getPublicMediaKey,
  getPublicMediaUrl,
} from '@/core/storage';
import { createId } from '@/core/utils/id';
import { authenticate, getUserRolesAndSettings } from '@/www/server/utils/authenticate';
import {
  type UploadKind,
  sanitizeUploadName,
  validateUpload,
} from '@/www/server/utils/upload-policy';
import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { user } = await authenticate();
        if (!user) return json({ error: 'Authentication required' }, 401);

        const url = new URL(request.url);
        const kind = url.searchParams.get('kind') as UploadKind | null;
        if (kind !== 'bible' && kind !== 'profile' && kind !== 'source') {
          return json({ error: 'Invalid upload kind' }, 400);
        }

        if (kind !== 'profile') {
          const { roles } = await getUserRolesAndSettings(user.id);
          if (!roles.some((role) => role.id === 'admin')) {
            return json({ error: 'Administrator access required' }, 403);
          }
        }

        const contentType = request.headers.get('content-type')?.split(';')[0] ?? '';
        const bytes = new Uint8Array(await request.arrayBuffer());
        try {
          validateUpload(kind, contentType, bytes.byteLength, bytes);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : 'Invalid upload' }, 400);
        }

        const name = sanitizeUploadName(url.searchParams.get('name') ?? 'upload');
        if (kind === 'profile') {
          const key = `profile-images/${user.id}/${createId()}_${name}`;
          const bucket = getPublicMediaBucket();
          await bucket.put(key, bytes, {
            httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
            customMetadata: { userId: user.id },
          });
          const image = getPublicMediaUrl(key);
          await db.update(users).set({ image }).where(eq(users.id, user.id));
          const previousImageKey = user.image ? getPublicMediaKey(user.image) : null;
          if (previousImageKey && previousImageKey !== key) {
            await bucket.delete(previousImageKey);
          }
          return json({ key, url: image });
        }

        if (kind === 'bible') {
          const key = `bibles/${createId()}_${name}`;
          const publicationId = url.searchParams.get('publicationId') || undefined;
          const generateEmbeddings = url.searchParams.get('generateEmbeddings') === 'true';
          await getPrivateSourcesBucket().put(key, bytes, {
            httpMetadata: { contentType },
            customMetadata: {
              generateEmbeddings: String(generateEmbeddings),
              ...(publicationId ? { publicationId } : {}),
            },
          });
          await env.BIBLE_IMPORT_QUEUE.send({
            type: 'archive',
            key,
            publicationId,
            generateEmbeddings,
          });
          return json({ key });
        }

        const checksumBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
        const checksum = Array.from(checksumBytes, (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('');
        const key = `grounding-sources/${createId()}_${name}`;
        await getPrivateSourcesBucket().put(key, bytes, {
          httpMetadata: { contentType },
          customMetadata: { originalName: name, uploadedBy: user.id, checksum },
        });
        return json({ key, url: `r2://private-sources/${key}`, checksum });
      },
    },
  },
});
