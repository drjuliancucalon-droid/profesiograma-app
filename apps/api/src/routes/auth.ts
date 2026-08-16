import { Hono } from 'hono';
import { findUserByEmail, createSession, findSession, deleteSession } from '../db/queries';
import { signJWT, verifyJWT } from '../middleware/auth';

type Env = { DB: D1Database; JWT_SECRET: string };
const auth = new Hono<{ Bindings: Env }>();

// Función simple de hash (Workers no tiene bcrypt — usar PBKDF2 con Web Crypto)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const hashArray = new Uint8Array(bits);
  return btoa(String.fromCharCode(...salt)) + '.' + btoa(String.fromCharCode(...hashArray));
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [saltB64, hashB64] = stored.split('.');
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
    const hashArray = new Uint8Array(bits);
    return btoa(String.fromCharCode(...hashArray)) === hashB64;
  } catch { return false; }
}

// POST /api/auth/login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email y contraseña requeridos' }, 400);
  const user = await findUserByEmail(c.env.DB, email) as any;
  if (!user) return c.json({ error: 'Credenciales inválidas' }, 401);
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: 'Credenciales inválidas' }, 401);
  const accessToken = await signJWT({ sub: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET, 3600);
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  await createSession(c.env.DB, user.id, refreshToken, expiresAt);
  return c.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
  });
});

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const { refresh_token } = await c.req.json();
  if (!refresh_token) return c.json({ error: 'Refresh token requerido' }, 400);
  const session = await findSession(c.env.DB, refresh_token) as any;
  if (!session) return c.json({ error: 'Sesión inválida o expirada' }, 401);
  const accessToken = await signJWT({ sub: session.user_id, email: session.email, role: session.role }, c.env.JWT_SECRET, 3600);
  return c.json({ access_token: accessToken });
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const { refresh_token } = await c.req.json();
  if (refresh_token) await deleteSession(c.env.DB, refresh_token);
  return c.json({ message: 'Sesión cerrada' });
});

export default auth;
