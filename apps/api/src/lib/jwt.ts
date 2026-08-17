export interface JwtPayload {
  sub: string;
  email: string;
  rol: 'admin' | 'medico' | 'rrhh';
  exp: number;
}

type JwtInput = Omit<JwtPayload, 'exp'>;

function toB64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createJwt(
  secret: string,
  payload: JwtInput,
  ttlSeconds = 900
): Promise<string> {
  const h = toB64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = toB64Url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = await hmac(secret, `${h}.${p}`);
  return `${h}.${p}.${sig}`;
}

export async function verifyJwt(secret: string, token: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expected = await hmac(secret, `${h}.${p}`);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(fromB64Url(p)) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
