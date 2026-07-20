type AddressResolver = (hostname: string) => Promise<string[]>;

function parseIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return parts as [number, number, number, number];
}

function isPrivateIpv4(hostname: string) {
  const parts = parseIpv4(hostname);
  if (!parts) return false;
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function parseIpv6(hostname: string) {
  let host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const ipv4Match = host.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match) {
    const parts = parseIpv4(ipv4Match[1]);
    if (!parts) return null;
    const [a, b, c, d] = parts;
    host = `${host.slice(0, -ipv4Match[1].length)}${((a << 8) | b).toString(16)}:${(
      (c << 8) | d
    ).toString(16)}`;
  }
  if (!host.includes(':') || host.split('::').length > 2) return null;
  const [leftValue, rightValue] = host.split('::');
  const left = leftValue ? leftValue.split(':') : [];
  const right = rightValue ? rightValue.split(':') : [];
  const omitted = 8 - left.length - right.length;
  if ((host.includes('::') && omitted < 1) || (!host.includes('::') && omitted !== 0)) return null;
  const groups = [...left, ...Array.from({ length: omitted }, () => '0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) return null;
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function isPrivateIpv6(hostname: string) {
  const address = parseIpv6(hostname);
  if (address === null) return false;
  if (address <= 1n || address >> 121n === 0x7en || address >> 118n === 0x3fan) return true;
  if (address >> 120n === 0xffn || address >> 96n === 0x20010db8n) return true;
  if (address >> 32n === 0n) return true;
  if (address >> 32n === 0xffffn) {
    const mapped = Number(address & 0xffff_ffffn);
    return isPrivateIpv4(
      `${mapped >>> 24}.${(mapped >>> 16) & 255}.${(mapped >>> 8) & 255}.${mapped & 255}`,
    );
  }
  return false;
}

function isIpAddress(hostname: string) {
  return parseIpv4(hostname) !== null || parseIpv6(hostname) !== null;
}

export function assertAllowedSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Source URL is not allowed');
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    isPrivateIpv4(hostname) ||
    isPrivateIpv6(hostname)
  ) {
    throw new Error('Source URL is not allowed');
  }
  return url;
}

async function resolveHostname(hostname: string) {
  const endpoint = 'https://cloudflare-dns.com/dns-query';
  const responses = await Promise.all(
    ['A', 'AAAA'].map(async (type) => {
      const url = `${endpoint}?name=${encodeURIComponent(hostname)}&type=${type}`;
      const response = await fetch(url, { headers: { Accept: 'application/dns-json' } });
      if (!response.ok) throw new Error('Source hostname could not be verified');
      return (await response.json()) as {
        Status: number;
        Answer?: Array<{ data: string; type: number }>;
      };
    }),
  );
  return responses.flatMap((response) =>
    response.Status === 0
      ? (response.Answer ?? [])
          .filter((answer) => answer.type === 1 || answer.type === 28)
          .map((answer) => answer.data)
      : [],
  );
}

export async function validateResolvedSourceUrl(
  url: URL,
  resolver: AddressResolver = resolveHostname,
) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIpAddress(hostname) ? [hostname] : await resolver(hostname);
  if (
    addresses.length === 0 ||
    addresses.some(
      (address) =>
        (!parseIpv4(address) && !parseIpv6(address)) ||
        isPrivateIpv4(address) ||
        isPrivateIpv6(address),
    )
  ) {
    throw new Error('Source URL is not allowed');
  }
}

export async function fetchAllowedSource(value: string, maxRedirects = 3) {
  let url = assertAllowedSourceUrl(value);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await validateResolvedSourceUrl(url);
    const response = await fetch(url, { redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location || redirect === maxRedirects) throw new Error('Source redirect is not allowed');
    url = assertAllowedSourceUrl(new URL(location, url).toString());
  }
  throw new Error('Source redirect is not allowed');
}
