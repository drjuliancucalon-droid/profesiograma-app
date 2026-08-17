import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { empresaSchema } from '../lib/schemas';

const empresas = new Hono<HonoEnv>();

empresas.use('*', requireAuth);

empresas.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM empresas ORDER BY nombre').all();
  return c.json({ success: true, data: results });
});

empresas.get('/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM empresas WHERE id = ? LIMIT 1')
    .bind(c.req.param('id')).first();
  if (!row) return c.json({ success: false, error: 'No encontrada' }, 404);
  return c.json({ success: true, data: row });
});

empresas.post('/', requireRole('admin', 'medico'), async (c) => {
  const parsed = await parseBody(c, empresaSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO empresas (id,nombre,nit,responsable,logo_url,creado_en,actualizado_en)
    VALUES (?,?,?,?,?,?,?)
  `).bind(
    id, body.nombre, body.nit ?? null, body.responsable ?? null,
    body.logo_url ?? null, now, now
  ).run();
  return c.json({ success: true, id }, 201);
});

empresas.put('/:id', requireRole('admin'), async (c) => {
  const parsed = await parseBody(c, empresaSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    UPDATE empresas SET nombre=?,nit=?,responsable=?,logo_url=?,actualizado_en=? WHERE id=?
  `).bind(
    body.nombre, body.nit ?? null, body.responsable ?? null,
    body.logo_url ?? null, now, c.req.param('id')
  ).run();
  return c.json({ success: true });
});

export default empresas;
