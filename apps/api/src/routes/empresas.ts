import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';

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

empresas.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json<{
    nombre: string; nit?: string; logo_url?: string;
    responsable_sg_sst?: string; correo?: string; telefono?: string; ciudad?: string;
  }>();
  if (!body.nombre) return c.json({ success: false, error: 'nombre requerido' }, 400);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO empresas (id,nombre,nit,logo_url,responsable_sg_sst,correo,telefono,ciudad,creado_en,actualizado_en)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, body.nombre, body.nit ?? null, body.logo_url ?? null,
    body.responsable_sg_sst ?? null, body.correo ?? null,
    body.telefono ?? null, body.ciudad ?? null, now, now
  ).run();
  return c.json({ success: true, id }, 201);
});

empresas.put('/:id', requireRole('admin'), async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    UPDATE empresas SET nombre=?,nit=?,logo_url=?,responsable_sg_sst=?,correo=?,telefono=?,ciudad=?,actualizado_en=? WHERE id=?
  `).bind(
    body.nombre, body.nit ?? null, body.logo_url ?? null,
    body.responsable_sg_sst ?? null, body.correo ?? null,
    body.telefono ?? null, body.ciudad ?? null, now, c.req.param('id')
  ).run();
  return c.json({ success: true });
});

export default empresas;
