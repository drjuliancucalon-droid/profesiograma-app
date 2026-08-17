import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { audit } from '../lib/audit';
import { newId, nowIso } from '../lib/id';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

const schema = z.object({
  profesiograma_id: z.string().uuid(),
  cargo_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid(),
  candidato_nombre: z.string().optional(),
  candidato_documento: z.string().optional(),
  momento: z.enum(['I', 'P', 'R', 'PI', 'RL']),
  examenes_json: z.string().default('[]'),
  restricciones_json: z.string().default('[]'),
});

// GET /api/ordenes?empresa_id=xxx
app.get('/', requireAuth, async c => {
  const empresaId = c.req.query('empresa_id');
  const profId = c.req.query('profesiograma_id');
  if (!empresaId && !profId) return c.json({ success: false, error: 'empresa_id o profesiograma_id requerido' }, 400);
  const where = empresaId ? 'empresa_id = ?1' : 'profesiograma_id = ?1';
  const param = (empresaId ?? profId)!;
  const rows = await c.env.DB.prepare(
    `SELECT o.*, c.cargo as cargo_nombre FROM ordenes_servicio o
     LEFT JOIN cargos c ON c.id = o.cargo_id
     WHERE o.${where} ORDER BY o.creado_en DESC`
  ).bind(param).all();
  return c.json({ success: true, data: rows.results });
});

// GET /api/ordenes/:id
app.get('/:id', requireAuth, async c => {
  const row = await c.env.DB.prepare(
    `SELECT o.*, c.cargo as cargo_nombre, e.nombre as empresa_nombre
     FROM ordenes_servicio o
     LEFT JOIN cargos c ON c.id = o.cargo_id
     LEFT JOIN empresas e ON e.id = o.empresa_id
     WHERE o.id = ?1`
  ).bind(c.req.param('id')).first();
  if (!row) return c.json({ success: false, error: 'No encontrada' }, 404);
  return c.json({ success: true, data: row });
});

// POST /api/ordenes — si cargo_id viene, rellena exámenes automáticamente del momento
app.post('/', requireAuth, requireRole('admin', 'medico', 'rrhh'), async c => {
  const body = schema.parse(await c.req.json());
  const actor = c.get('user') as any;

  let examenesJson = body.examenes_json;

  // Auto-fill desde matriz del cargo si viene cargo_id y no hay exámenes explícitos
  if (body.cargo_id && examenesJson === '[]') {
    const cargo = await c.env.DB.prepare(
      `SELECT matriz_json FROM cargos WHERE id = ?1`
    ).bind(body.cargo_id).first<{ matriz_json: string }>();
    if (cargo) {
      try {
        const matriz = JSON.parse(cargo.matriz_json) as Record<string, Record<string, boolean>>;
        const momentoKey = body.momento as string;
        const examenes = Object.entries(matriz)
          .filter(([, momentos]) => momentos[momentoKey] === true)
          .map(([examen]) => examen);
        examenesJson = JSON.stringify(examenes);
      } catch { /* usar vacío */ }
    }
  }

  const id = newId();
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO ordenes_servicio
     (id, profesiograma_id, cargo_id, empresa_id, candidato_nombre, candidato_documento,
      momento, examenes_json, restricciones_json, estado, creado_por, creado_en, actualizado_en)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'emitida',?10,?11,?11)`
  ).bind(
    id, body.profesiograma_id, body.cargo_id ?? null, body.empresa_id,
    body.candidato_nombre ?? null, body.candidato_documento ?? null,
    body.momento, examenesJson, body.restricciones_json,
    actor.sub, now
  ).run();

  await audit(c.env, { userId: actor.sub, action: 'orden.create', entityType: 'orden', entityId: id,
    metadata: { momento: body.momento, empresa_id: body.empresa_id } });

  const created = await c.env.DB.prepare(`SELECT * FROM ordenes_servicio WHERE id=?1`).bind(id).first();
  return c.json({ success: true, data: created }, 201);
});

// PATCH /api/ordenes/:id
app.patch('/:id', requireAuth, requireRole('admin', 'medico'), async c => {
  const { id } = c.req.param();
  const body = await c.req.json() as Record<string, unknown>;
  const fields: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  const allowed = ['candidato_nombre','candidato_documento','momento','examenes_json','restricciones_json','estado'];
  for (const key of allowed) {
    if (key in body) { fields.push(`${key}=?${idx++}`); vals.push(body[key]); }
  }
  if (!fields.length) return c.json({ success: false, error: 'Sin cambios' }, 400);
  fields.push(`actualizado_en=?${idx++}`);
  vals.push(nowIso(), id);
  await c.env.DB.prepare(`UPDATE ordenes_servicio SET ${fields.join(',')} WHERE id=?${idx}`).bind(...vals).run();
  const actor = c.get('user') as any;
  await audit(c.env, { userId: actor.sub, action: 'orden.update', entityType: 'orden', entityId: id });
  return c.json({ success: true });
});

// DELETE /api/ordenes/:id — solo anula, no borra físicamente
app.delete('/:id', requireAuth, requireRole('admin'), async c => {
  const { id } = c.req.param();
  await c.env.DB.prepare(`UPDATE ordenes_servicio SET estado='anulada', actualizado_en=?1 WHERE id=?2`)
    .bind(nowIso(), id).run();
  const actor = c.get('user') as any;
  await audit(c.env, { userId: actor.sub, action: 'orden.anular', entityType: 'orden', entityId: id });
  return c.json({ success: true });
});

export default app;
