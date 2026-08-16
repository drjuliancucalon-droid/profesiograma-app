// ==============================================================
// RUTA AUTH — Registro, Login, Logout, Perfil
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me
// ==============================================================

import { Hono } from 'hono';
import { userQueries, sessionQueries } from '../db/queries';
import { signJWT, hashToken, requireAuth, type Env, type Variables } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// Hash de password con Web Crypto (PBKDF2 — sin bcrypt, compatible Workers)
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt ?? Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(actualSalt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: `pbkdf2:${actualSalt}:${hash}`, salt: actualSalt };
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith('pbkdf2:')) return false;
  const [, salt] = storedHash.split(':');
  const { hash: newHash } = await hashPassword(password, salt);
  return newHash === storedHash;
}

// POST /api/auth/register
auth.post('/register', async (c) => {
  try {
    const { email, password, nombre, rol, empresa_id } = await c.req.json();
    if (!email || !password || !nombre || !rol) {
      return c.json({ success: false, error: 'Campos requeridos: email, password, nombre, rol' }, 400);
    }
    if (password.length < 8) {
      return c.json({ success: false, error: 'Password mínimo 8 caracteres' }, 400);
    }
    const existing = await userQueries.findByEmail(c.env.DB, email);
    if (existing) {
      return c.json({ success: false, error: 'El email ya está registrado' }, 409);
    }
    const { hash } = await hashPassword(password);
    const id = crypto.randomUUID();
    await userQueries.create(c.env.DB, { id, email, password_hash: hash, nombre, rol, empresa_id });
    return c.json({ success: true, message: 'Usuario creado exitosamente' }, 201);
  } catch (e) {
    return c.json({ success: false, error: 'Error interno del servidor' }, 500);
  }
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ success: false, error: 'Email y password requeridos' }, 400);
    }
    const user = await userQueries.findByEmail(c.env.DB, email) as any;
    if (!user) {
      return c.json({ success: false, error: 'Credenciales inválidas' }, 401);
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({ success: false, error: 'Credenciales inválidas' }, 401);
    }
    const token = await signJWT(
      { sub: user.id, email: user.email, rol: user.rol, empresa_id: user.empresa_id },
      c.env.JWT_SECRET,
      48 // 48 horas
    );
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    await sessionQueries.create(c.env.DB, user.id, tokenHash, expiresAt);
    return c.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol, empresa_id: user.empresa_id }
      }
    });
  } catch (e) {
    return c.json({ success: false, error: 'Error interno del servidor' }, 500);
  }
});

// POST /api/auth/logout
auth.post('/logout', requireAuth, async (c) => {
  const authHeader = c.req.header('Authorization')!;
  const token = authHeader.slice(7);
  const tokenHash = await hashToken(token);
  await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  return c.json({ success: true, message: 'Sesión cerrada' });
});

// GET /api/auth/me
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ success: true, data: user });
});

export default auth;
