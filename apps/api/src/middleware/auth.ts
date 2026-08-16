// ==============================================================
// MIDDLEWARE DE AUTENTICACIÓN JWT — Nativo D1
// No depende de Supabase ni librerías externas pesadas
// ==============================================================

import { Context, Next } from 'hono';
import { sessionQueries } from '../db/queries';

export type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  CORS_ORIGIN: string;
  ENVIRONMENT: string;
};

export type Variables = {
  user: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
    empresa_id: string | null;
  };
};

// Genera hash SHA-256 del token para guardar en D1 (nunca el token crudo)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Firma JWT usando Web Crypto API (disponible en Workers)
export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresInHours = 24
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const body = btoa(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sigB64}`;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Middleware Hono — protege rutas autenticadas
export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token requerido' }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ success: false, error: 'Token inválido o expirado' }, 401);
  }
  // Verificar que la sesión existe en D1
  const tokenHash = await hashToken(token);
  const session = await sessionQueries.findByTokenHash(c.env.DB, tokenHash);
  if (!session) {
    return c.json({ success: false, error: 'Sesión no válida o expirada' }, 401);
  }
  c.set('user', {
    id: session.uid as string,
    email: session.email as string,
    nombre: session.nombre as string,
    rol: session.rol as string,
    empresa_id: session.empresa_id as string | null,
  });
  await next();
}

// Guard por rol
export function requireRole(...roles: string[]) {
  return async (
    c: Context<{ Bindings: Env; Variables: Variables }>,
    next: Next
  ) => {
    const user = c.get('user');
    if (!roles.includes(user.rol)) {
      return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
    }
    await next();
  };
}

export { hashToken };
