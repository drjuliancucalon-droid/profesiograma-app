import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { hashPassword } from '../lib/password';
import { parseBody } from '../lib/validate';
import { createUserSchema } from '../lib/schemas';
import { auditLog } from '../lib/audit';
import { orgId } from '../lib/org';

const users = new Hono<HonoEnv>();

users.use('*', requireAuth);

// GET /api/users
users.get('/', requireRole('admin'), async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT id, email, nombre, rol, activo, creado_en FROM users WHERE organizacion_id = ? ORDER BY nombre')
    .bind(orgId(c))
    .all();
  return c.json({ success: true, data: results });
});

// POST /api/users
users.post('/', requireRole('admin'), async (c) => {
  const parsed = await parseBody(c, createUserSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const exists = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(body.email).first();
  if (exists) return c.json({ success: false, error: 'El email ya existe' }, 409);

  const { hash, salt, iterations } = await hashPassword(body.password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, nombre, rol, password_hash, password_salt, password_iterations, activo, organizacion_id, creado_en, actualizado_en)
    VALUES (?,?,?,?,?,?,?,1,?,?,?)
  `).bind(id, body.email, body.nombre, body.rol, hash, salt, iterations, orgId(c), now, now).run();
  auditLog(c, {
    action: 'user.create', entityType: 'user', entityId: id, userId: c.get('user').sub,
    metadata: { email: body.email, rol: body.rol },
  });
  return c.json({ success: true, id }, 201);
});

// PATCH /api/users/:id/toggle
users.patch('/:id/toggle', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB
    .prepare('SELECT activo FROM users WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(id, orgId(c)).first<{ activo: number }>();
  if (!user) return c.json({ success: false, error: 'Usuario no encontrado' }, 404);
  const nuevoEstado = user.activo ? 0 : 1;
  await c.env.DB.prepare('UPDATE users SET activo = ?, actualizado_en = ? WHERE id = ?')
    .bind(nuevoEstado, new Date().toISOString(), id).run();
  auditLog(c, {
    action: 'user.toggle', entityType: 'user', entityId: id, userId: c.get('user').sub,
    metadata: { activo: !!nuevoEstado },
  });
  return c.json({ success: true });
});

// DELETE /api/users/:id
users.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB
    .prepare('DELETE FROM users WHERE id = ? AND organizacion_id = ?')
    .bind(id, orgId(c)).run();
  if (!result.meta.changes) return c.json({ success: false, error: 'Usuario no encontrado' }, 404);
  auditLog(c, { action: 'user.delete', entityType: 'user', entityId: id, userId: c.get('user').sub });
  return c.json({ success: true });
});

export default users;
