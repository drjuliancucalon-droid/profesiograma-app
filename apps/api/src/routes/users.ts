import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { hashPassword } from '../lib/password';

const users = new Hono<HonoEnv>();

users.use('*', requireAuth);

// GET /api/users
users.get('/', requireRole('admin'), async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT id, email, nombre, rol, activo, creado_en FROM users ORDER BY nombre')
    .all();
  return c.json({ success: true, data: results });
});

// POST /api/users
users.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json<{
    email: string; password: string; nombre: string;
    rol: 'admin' | 'medico' | 'rrhh';
  }>();
  if (!body.email || !body.password || !body.nombre || !body.rol) {
    return c.json({ success: false, error: 'Todos los campos son requeridos' }, 400);
  }
  const exists = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(body.email).first();
  if (exists) return c.json({ success: false, error: 'El email ya existe' }, 409);

  const { hash, salt, iterations } = await hashPassword(body.password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, nombre, rol, password_hash, password_salt, password_iterations, activo, creado_en, actualizado_en)
    VALUES (?,?,?,?,?,?,?,1,?,?)
  `).bind(id, body.email, body.nombre, body.rol, hash, salt, iterations, now, now).run();
  return c.json({ success: true, id }, 201);
});

// PATCH /api/users/:id/toggle
users.patch('/:id/toggle', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB
    .prepare('SELECT activo FROM users WHERE id = ? LIMIT 1')
    .bind(id).first<{ activo: number }>();
  if (!user) return c.json({ success: false, error: 'Usuario no encontrado' }, 404);
  await c.env.DB.prepare('UPDATE users SET activo = ?, actualizado_en = ? WHERE id = ?')
    .bind(user.activo ? 0 : 1, new Date().toISOString(), id).run();
  return c.json({ success: true });
});

// DELETE /api/users/:id
users.delete('/:id', requireRole('admin'), async (c) => {
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

export default users;
