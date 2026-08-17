import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { profesionalSchema } from '../lib/schemas';
import { auditLog } from '../lib/audit';

const profesionales = new Hono<HonoEnv>();

profesionales.use('*', requireAuth);

profesionales.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM profesionales ORDER BY nombre').all();
  return c.json({ success: true, data: results });
});

// POST /api/profesionales — crea, o reutiliza si ya existe uno con la misma cédula
profesionales.post('/', async (c) => {
  const parsed = await parseBody(c, profesionalSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (body.cedula) {
    const existing = await c.env.DB
      .prepare('SELECT id FROM profesionales WHERE cedula = ? LIMIT 1')
      .bind(body.cedula).first<{ id: string }>();
    if (existing) return c.json({ success: true, id: existing.id, reused: true });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // cedula es NOT NULL UNIQUE en el schema real: si no se indica, se genera un
  // valor único para no chocar con otros registros sin cédula.
  const cedula = body.cedula?.trim() || `sin-cedula-${id}`;
  await c.env.DB.prepare(`
    INSERT INTO profesionales (id, nombre, cedula, titulo, licencia, celular, correo, firma_url, creado_en)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(
    id, body.nombre, cedula, body.titulo ?? '', body.licencia ?? '',
    body.celular ?? null, body.correo ?? null, body.firma_url ?? null, now
  ).run();
  auditLog(c, {
    action: 'profesional.create', entityType: 'profesional', entityId: id, userId: c.get('user').sub,
    metadata: { nombre: body.nombre },
  });
  return c.json({ success: true, id }, 201);
});

export default profesionales;
