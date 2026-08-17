import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';

type HonoEnv = { Bindings: Env; Variables: { user: { sub: string; email: string; rol: string } } };
const ordenes = new Hono<HonoEnv>();

ordenes.use('*', requireAuth);

// GET /api/ordenes
ordenes.get('/', async (c) => {
  const empresaId = c.req.query('empresa_id');
  const profId    = c.req.query('profesiograma_id');

  if (empresaId && profId) {
    const { results } = await c.env.DB
      .prepare('SELECT * FROM ordenes_servicio WHERE empresa_id = ? AND profesiograma_id = ? ORDER BY creado_en DESC')
      .bind(empresaId, profId).all();
    return c.json({ success: true, data: results });
  } else if (empresaId) {
    const { results } = await c.env.DB
      .prepare('SELECT * FROM ordenes_servicio WHERE empresa_id = ? ORDER BY creado_en DESC')
      .bind(empresaId).all();
    return c.json({ success: true, data: results });
  } else if (profId) {
    const { results } = await c.env.DB
      .prepare('SELECT * FROM ordenes_servicio WHERE profesiograma_id = ? ORDER BY creado_en DESC')
      .bind(profId).all();
    return c.json({ success: true, data: results });
  } else {
    const { results } = await c.env.DB
      .prepare('SELECT * FROM ordenes_servicio ORDER BY creado_en DESC')
      .all();
    return c.json({ success: true, data: results });
  }
});

// GET /api/ordenes/:id
ordenes.get('/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM ordenes_servicio WHERE id = ? LIMIT 1')
    .bind(c.req.param('id')).first();
  if (!row) return c.json({ success: false, error: 'No encontrada' }, 404);
  return c.json({ success: true, data: row });
});

// POST /api/ordenes
ordenes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    profesiograma_id: string;
    empresa_id: string;
    cargo_id?: string;
    candidato_nombre?: string;
    candidato_documento?: string;
    momento: 'I' | 'P' | 'R' | 'PI' | 'RL';
    examenes_json?: unknown[];
    restricciones_json?: unknown[];
  }>();
  if (!body.profesiograma_id || !body.empresa_id || !body.momento) {
    return c.json({ success: false, error: 'Faltan campos requeridos' }, 400);
  }
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO ordenes_servicio
    (id, profesiograma_id, cargo_id, empresa_id, candidato_nombre, candidato_documento, momento, examenes_json, restricciones_json, estado, creado_por, creado_en, actualizado_en)
    VALUES (?,?,?,?,?,?,?,?,?,'emitida',?,?,?)
  `).bind(
    id, body.profesiograma_id, body.cargo_id ?? null, body.empresa_id,
    body.candidato_nombre ?? null, body.candidato_documento ?? null, body.momento,
    JSON.stringify(body.examenes_json ?? []), JSON.stringify(body.restricciones_json ?? []),
    user.sub, now, now
  ).run();
  return c.json({ success: true, id }, 201);
});

// PATCH /api/ordenes/:id/estado
ordenes.patch('/:id/estado', async (c) => {
  const { estado } = await c.req.json<{ estado: string }>();
  if (!['emitida', 'vigente', 'anulada'].includes(estado)) {
    return c.json({ success: false, error: 'Estado inválido' }, 400);
  }
  await c.env.DB
    .prepare('UPDATE ordenes_servicio SET estado=?, actualizado_en=? WHERE id=?')
    .bind(estado, new Date().toISOString(), c.req.param('id')).run();
  return c.json({ success: true });
});

export default ordenes;
