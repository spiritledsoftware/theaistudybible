import { DurableObject } from 'cloudflare:workers';

const SET_PREFIX = 'set:';
const LEASE_PREFIX = 'lease:';

function validateKey(key: string) {
  if (key.length === 0 || key.length > 512) {
    throw new TypeError('Cache key must contain 1 to 512 characters');
  }
}

export class AppCache extends DurableObject<unknown> {
  async get<T>(key: string): Promise<T | null> {
    validateKey(key);
    return (await this.ctx.storage.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    validateKey(key);
    await this.ctx.storage.put(key, value);
  }

  addToSet(key: string, value: string): Promise<number> {
    validateKey(key);
    return this.ctx.storage.transaction(async (transaction) => {
      const storageKey = `${SET_PREFIX}${key}`;
      const values = (await transaction.get<string[]>(storageKey)) ?? [];
      if (values.includes(value)) return 0;
      await transaction.put(storageKey, [...values, value]);
      return 1;
    });
  }

  acquireLease(
    key: string,
    request: { token: string; now: number; expiresAt: number },
  ): Promise<boolean> {
    validateKey(key);
    if (request.expiresAt <= request.now) throw new TypeError('Lease must expire in the future');
    return this.ctx.storage.transaction(async (transaction) => {
      const storageKey = `${LEASE_PREFIX}${key}`;
      const existing = await transaction.get<{ token: string; expiresAt: number }>(storageKey);
      if (existing && existing.expiresAt > request.now) return false;
      await transaction.put(storageKey, {
        token: request.token,
        expiresAt: request.expiresAt,
      });
      return true;
    });
  }

  async releaseLease(key: string, token: string): Promise<void> {
    validateKey(key);
    await this.ctx.storage.transaction(async (transaction) => {
      const storageKey = `${LEASE_PREFIX}${key}`;
      const existing = await transaction.get<{ token: string }>(storageKey);
      if (existing?.token === token) await transaction.delete(storageKey);
    });
  }

  removeFromSet(key: string, value: string): Promise<number> {
    validateKey(key);
    return this.ctx.storage.transaction(async (transaction) => {
      const storageKey = `${SET_PREFIX}${key}`;
      const values = (await transaction.get<string[]>(storageKey)) ?? [];
      if (!values.includes(value)) return 0;
      await transaction.put(
        storageKey,
        values.filter((item) => item !== value),
      );
      return 1;
    });
  }
}
