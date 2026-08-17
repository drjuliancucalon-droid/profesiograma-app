import { Hono } from 'hono';
import { z } from 'zod';
import { hashPassword } from '../lib/password';
import { newId, nowIso } from '../lib/id';
import { requireAuth, requireRole } from '../middleware/auth';
import { audit } from '../lib/audit';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

const schema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  password: z.string().min(8),
  rol: z.enum(['admin', 'medico', 'rrhh']),
});

app.post('/', requireAuth, requireRole('admin'), async c => {
  const body = schema.parse(await c.req.json());
  const pw = await hashPassword(body.password);
  const id = newId();
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, nombre, password_hash, password_salt, password_iterations, rol, creado_en, actualizado_en)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)`
  ).bind(id, body.email, body.nombre, pw.hash, pw.salt, pw.iterations, body.rol, now).run();
  const actor = c.get('user') as any;
  await audit(c.env, { userId: actor.sub, action: 'user.create', entityType: 'user', entityId: id });
  return c.json({ success: true, data: { id, email: body.email, nombre: body.nombre, rol: body.rol } }, 201);
});

app.get('/', requireAuth, requireRole('admin'), async c => {
  const rows = await c.env.DB.prepare(
    `SELECT id, email, nombre, rol, activo, creado_en FROM users ORDER BY creado_en DESC`
  ).all();
  return c.json({ success: true, data: rows.results });
});

app.patch('/:id/toggle', requireAuth, requireRole('admin'), async c => {
  const { id } = c.req.param();
  const row = await c.env.DB.prepare(`SELECT activo FROM users WHERE id=?1`).bind(id).first<{ activo: number }>();
  if (!row) return c.json({ success: false, error: 'No encontrado' }, 404);
  const nuevoEstado = row.activo === 1 ? 0 : 1;
  await c.env.DB.prepare(`UPDATE users SET activo=?1, actualizado_en=?2 WHERE id=?3`)
    .bind(nuevoEstado, nowIso(), id).run();
  const actor = c.get('user') as any;
  await audit(c.env, { userId: actor.sub, action: nuevoEstado ? 'user.activate' : 'user.deactivate', entityType: 'user', entityId: id });
  return c.json({ success: true, data: { id, activo: nuevoEstado } });
});

export default app;
