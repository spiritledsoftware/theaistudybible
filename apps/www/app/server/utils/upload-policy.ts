export type UploadKind = 'bible' | 'profile' | 'source';

const MEBIBYTE = 1024 * 1024;

const uploadPolicies = {
  bible: {
    maxBytes: 100 * MEBIBYTE,
    contentTypes: ['application/zip'],
  },
  profile: {
    maxBytes: 5 * MEBIBYTE,
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  source: {
    maxBytes: 25 * MEBIBYTE,
    contentTypes: ['application/pdf', 'text/html', 'text/markdown', 'text/plain'],
  },
} as const;

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasMatchingSignature(contentType: string, bytes: Uint8Array) {
  switch (contentType) {
    case 'application/zip':
      return (
        startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
        startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
        startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
      );
    case 'application/pdf':
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
      );
    default:
      return true;
  }
}

export function validateUpload(
  kind: UploadKind,
  contentType: string,
  size: number,
  bytes: Uint8Array,
) {
  const policy = uploadPolicies[kind];
  if (!(policy.contentTypes as readonly string[]).includes(contentType)) {
    throw new Error(`Unsupported ${kind} upload type`);
  }
  if (size < 1 || size > policy.maxBytes) {
    throw new Error(`${kind} upload is too large`);
  }
  if (!hasMatchingSignature(contentType, bytes)) {
    throw new Error('Upload content does not match its declared type');
  }
  return { maxBytes: policy.maxBytes };
}

export function sanitizeUploadName(name: string) {
  const basename = name.split(/[\\/]/).at(-1) ?? 'upload';
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'upload';
}
