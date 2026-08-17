import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { ordenSchema } from '../lib/schemas';
import { auditLog } from '../lib/audit';
import { orgId } from '../lib/org';

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

  const conditions = ['o.organizacion_id = ?'];
  const params: string[] = [orgId(c)];
  if (empresaId) { conditions.push('o.empresa_id = ?'); params.push(empresaId); }
  if (profId) { conditions.push('o.profesiograma_id = ?'); params.push(profId); }

  const { results } = await c.env.DB
    .prepare(`${LIST_QUERY} WHERE ${conditions.join(' AND ')} ORDER BY o.creado_en DESC`)
    .bind(...params).all();
  return c.json({ success: true, data: results });
});

// GET /api/ordenes/:id
ordenes.get('/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM ordenes_servicio WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(c.req.param('id'), orgId(c)).first();
  if (!row) return c.json({ success: false, error: 'No encontrada' }, 404);
  return c.json({ success: true, data: row });
});

// POST /api/ordenes
ordenes.post('/', async (c) => {
  const user = c.get('user');
  const parsed = await parseBody(c, ordenSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const org = orgId(c);

  // El profesiograma, el cargo y la empresa referenciados deben pertenecer a
  // la misma organización del solicitante — si no, alguien podría crear una
  // orden apuntando a datos de otra organización adivinando o probando ids.
  const profesiograma = await c.env.DB
    .prepare('SELECT id FROM profesiogramas WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(body.profesiograma_id, org).first();
  const cargo = await c.env.DB
    .prepare('SELECT id FROM cargos WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(body.cargo_id, org).first();
  const empresa = await c.env.DB
    .prepare('SELECT id FROM empresas WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(body.empresa_id, org).first();
  if (!profesiograma || !cargo || !empresa) {
    return c.json({ success: false, error: 'profesiograma_id, cargo_id o empresa_id inválidos' }, 400);
  }

  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    INSERT INTO ordenes_servicio
    (id, organizacion_id, profesiograma_id, cargo_id, empresa_id, tipo_momento, candidato_nombre, candidato_id,
     examenes_json, generado_por, creado_en)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, org, body.profesiograma_id, body.cargo_id, body.empresa_id, body.tipo_momento,
    body.candidato_nombre ?? '', body.candidato_id ?? '',
    JSON.stringify(body.examenes_json ?? []),
    user.sub, now
  ).run();
  auditLog(c, {
    action: 'orden.create', entityType: 'orden', entityId: id, userId: user.sub,
    metadata: { tipo_momento: body.tipo_momento, empresa_id: body.empresa_id, cargo_id: body.cargo_id },
  });
  return c.json({ success: true, id }, 201);
});

export default ordenes;
