const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });

export function decodeUtf8Source(bytes: Uint8Array): string {
  return UTF8_DECODER.decode(bytes);
}
