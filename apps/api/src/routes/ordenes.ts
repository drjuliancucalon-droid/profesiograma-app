import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { ordenSchema } from '../lib/schemas';

const ordenes = new Hono<HonoEnv>();

ordenes.use('*', requireAuth);

const LIST_QUERY = `
  SELECT o.*, e.nombre AS empresa_nombre, c.nombre_cargo AS cargo_nombre
  FROM ordenes_servicio o
  LEFT JOIN empresas e ON e.id = o.empresa_id
  LEFT JOIN cargos c ON c.id = o.cargo_id
`;

// GET /api/ordenes
ordenes.get('/', async (c) => {
  const empresaId = c.req.query('empresa_id');
  const profId    = c.req.query('profesiograma_id');

  if (empresaId && profId) {
    const { results } = await c.env.DB
      .prepare(`${LIST_QUERY} WHERE o.empresa_id = ? AND o.profesiograma_id = ? ORDER BY o.creado_en DESC`)
      .bind(empresaId, profId).all();
    return c.json({ success: true, data: results });
  } else if (empresaId) {
    const { results } = await c.env.DB
      .prepare(`${LIST_QUERY} WHERE o.empresa_id = ? ORDER BY o.creado_en DESC`)
      .bind(empresaId).all();
    return c.json({ success: true, data: results });
  } else if (profId) {
    const { results } = await c.env.DB
      .prepare(`${LIST_QUERY} WHERE o.profesiograma_id = ? ORDER BY o.creado_en DESC`)
      .bind(profId).all();
    return c.json({ success: true, data: results });
  } else {
    const { results } = await c.env.DB
      .prepare(`${LIST_QUERY} ORDER BY o.creado_en DESC`)
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
  const parsed = await parseBody(c, ordenSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO ordenes_servicio
    (id, profesiograma_id, cargo_id, empresa_id, tipo_momento, candidato_nombre, candidato_id,
     examenes_json, generado_por, creado_en)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, body.profesiograma_id, body.cargo_id, body.empresa_id, body.tipo_momento,
    body.candidato_nombre ?? '', body.candidato_id ?? '',
    JSON.stringify(body.examenes_json ?? []),
    user.sub, now
  ).run();
  return c.json({ success: true, id }, 201);
});

export default ordenes;
