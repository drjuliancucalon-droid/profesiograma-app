import { Hono } from 'hono';
import type { Env } from '../types/env';
import { signJwt, verifyJwt } from '../lib/jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import { newId, nowIso } from '../lib/id';

const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ success: false, error: 'Email y contraseña requeridos' }, 400);
  }

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE email = ? AND activo = 1 LIMIT 1')
    .bind(email)
    .first<{
      id: string;
      email: string;
      full_name: string;
      rol: string;
      password_hash: string;
      salt: string;
      iterations: number;
    }>();

  if (!user) return c.json({ success: false, error: 'Credenciales inválidas' }, 401);

  const valid = await verifyPassword(password, {
    hash: user.password_hash,
    salt: user.salt,
    iterations: user.iterations,
  });
  if (!valid) return c.json({ success: false, error: 'Credenciales inválidas' }, 401);

  const accessToken = await signJwt(c.env.JWT_SECRET, {
    sub: user.id,
    email: user.email,
    rol: user.rol,
  }, 3600);

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  await c.env.DB
    .prepare('INSERT INTO sessions (id, user_id, token, expires_at, creado_en) VALUES (?,?,?,?,?)')
    .bind(newId(), user.id, refreshToken, expiresAt, nowIso())
    .run();

  return c.json({
    success: true,
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, full_name: user.full_name, rol: user.rol },
  });
});

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json<{ refresh_token?: string }>();
  const { refresh_token } = body;
  if (!refresh_token) return c.json({ success: false, error: 'Refresh token requerido' }, 400);

  const session = await c.env.DB
    .prepare(`
      SELECT s.*, u.email, u.rol, u.activo
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
      LIMIT 1
    `)
    .bind(refresh_token)
    .first<{ user_id: string; email: string; rol: string; activo: number }>();

  if (!session || !session.activo) {
    return c.json({ success: false, error: 'Sesión inválida o expirada' }, 401);
  }

  const accessToken = await signJwt(c.env.JWT_SECRET, {
    sub: session.user_id,
    email: session.email,
    rol: session.rol,
  }, 3600);

  return c.json({ success: true, access_token: accessToken });
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const body = await c.req.json<{ refresh_token?: string }>();
  const { refresh_token } = body;
  if (refresh_token) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(refresh_token).run();
  }
  return c.json({ success: true, message: 'Sesión cerrada' });
});

// GET /api/auth/me — devuelve usuario autenticado
auth.get('/me', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ success: false, error: 'No autorizado' }, 401);
  const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
  if (!payload) return c.json({ success: false, error: 'Token inválido' }, 401);
  const sub = payload.sub as string;
  const user = await c.env.DB
    .prepare('SELECT id, email, full_name, rol FROM users WHERE id = ? LIMIT 1')
    .bind(sub)
    .first<{ id: string; email: string; full_name: string; rol: string }>();
  if (!user) return c.json({ success: false, error: 'Usuario no encontrado' }, 404);
  return c.json({ success: true, user });
});

export { hashPassword, newId }; // para seed
export default auth;
