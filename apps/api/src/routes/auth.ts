import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { signJwt, verifyJwt } from '../lib/jwt';
import { hashPassword, verifyPassword } from '../lib/password';
import { newId, nowIso } from '../lib/id';
import { parseBody } from '../lib/validate';
import { loginSchema, refreshSchema, logoutSchema } from '../lib/schemas';

const auth = new Hono<HonoEnv>();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const parsed = await parseBody(c, loginSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  const user = await c.env.DB
    .prepare('SELECT * FROM users WHERE email = ? AND activo = 1 LIMIT 1')
    .bind(email)
    .first<{
      id: string; email: string; nombre: string; rol: string;
      password_hash: string; password_salt: string; password_iterations: number;
    }>();

  if (!user) return c.json({ success: false, error: 'Credenciales inválidas' }, 401);

  const valid = await verifyPassword(password, {
    hash: user.password_hash,
    salt: user.password_salt,
    iterations: user.password_iterations,
  });
  if (!valid) return c.json({ success: false, error: 'Credenciales inválidas' }, 401);

  const accessToken = await signJwt(c.env.JWT_SECRET, {
    sub: user.id, email: user.email, rol: user.rol,
  }, 3600);

  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  await c.env.DB
    .prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at, creado_en) VALUES (?,?,?,?,?)')
    .bind(newId(), user.id, refreshToken, expiresAt, nowIso())
    .run();

  return c.json({
    success: true,
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
  });
});

// POST /api/auth/refresh
// Rota el refresh token en cada uso (single-use): el token recibido se revoca
// y se emite uno nuevo. Así, si un refresh token se filtra, solo sirve una vez
// antes de quedar inválido — el atacante y el usuario legítimo no pueden
// ambos seguir usándolo indefinidamente.
auth.post('/refresh', async (c) => {
  const parsed = await parseBody(c, refreshSchema);
  if (!parsed.ok) return parsed.response;
  const { refresh_token } = parsed.data;

  const session = await c.env.DB
    .prepare(`
      SELECT s.id as session_id, s.user_id, u.email, u.rol, u.activo
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.refresh_token = ? AND s.revoked = 0 AND s.expires_at > datetime('now') LIMIT 1
    `)
    .bind(refresh_token)
    .first<{ session_id: string; user_id: string; email: string; rol: string; activo: number }>();

  if (!session || !session.activo) {
    return c.json({ success: false, error: 'Sesión inválida o expirada' }, 401);
  }

  const newRefreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').bind(session.session_id),
    c.env.DB
      .prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at, creado_en) VALUES (?,?,?,?,?)')
      .bind(newId(), session.user_id, newRefreshToken, expiresAt, nowIso()),
  ]);

  const accessToken = await signJwt(c.env.JWT_SECRET, {
    sub: session.user_id, email: session.email, rol: session.rol,
  }, 3600);

  return c.json({ success: true, access_token: accessToken, refresh_token: newRefreshToken });
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const parsed = await parseBody(c, logoutSchema);
  if (!parsed.ok) return parsed.response;
  if (parsed.data.refresh_token) {
    await c.env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE refresh_token = ?').bind(parsed.data.refresh_token).run();
  }
  return c.json({ success: true, message: 'Sesión cerrada' });
});

// GET /api/auth/me
auth.get('/me', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return c.json({ success: false, error: 'No autorizado' }, 401);
  const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
  if (!payload) return c.json({ success: false, error: 'Token inválido' }, 401);
  const user = await c.env.DB
    .prepare('SELECT id, email, nombre, rol FROM users WHERE id = ? LIMIT 1')
    .bind(payload.sub as string)
    .first<{ id: string; email: string; nombre: string; rol: string }>();
  if (!user) return c.json({ success: false, error: 'Usuario no encontrado' }, 404);
  return c.json({ success: true, user });
});

export { hashPassword, newId };
export default auth;
