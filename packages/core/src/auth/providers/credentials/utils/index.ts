import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Native scrypt: workerd forbids compiling wasm at runtime, which rules out hash-wasm's argon2.
// Parameters follow OWASP's 32 MiB scrypt profile (N=2^15, r=8, p=3) to stay well inside Worker memory.
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const KEY_LENGTH = 32;
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer, N: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(hash: string, password: string) {
  const [algorithm, N, r, p, salt, key] = hash.split('$');
  if (algorithm !== 'scrypt' || !N || !r || !p || !salt || !key) {
    throw new Error('Unsupported password hash format');
  }
  const expected = Buffer.from(key, 'base64');
  const actual = await deriveKey(
    password,
    Buffer.from(salt, 'base64'),
    Number(N),
    Number(r),
    Number(p),
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
