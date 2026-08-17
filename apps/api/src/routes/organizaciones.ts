import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireSuperadmin } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import { createOrgSchema } from '../lib/schemas';
import { hashPassword, generateRandomPassword } from '../lib/password';
import { auditLog } from '../lib/audit';

const organizaciones = new Hono<HonoEnv>();

organizaciones.use('*', requireAuth, requireSuperadmin);

// GET /api/organizaciones — panel del superadmin: lista todas las organizaciones
organizaciones.get('/', async (c) => {
  const { results } = await c.env.DB
    .prepare(`
      SELECT o.id, o.nombre, o.activo, o.creado_en,
             (SELECT COUNT(*) FROM users u WHERE u.organizacion_id = o.id) AS usuarios
      FROM organizaciones o ORDER BY o.creado_en DESC
    `)
    .all();
  return c.json({ success: true, data: results });
});

// POST /api/organizaciones — crea una organización nueva y su primer admin.
// La contraseña generada solo se devuelve en ESTA respuesta (texto plano,
// una sola vez) para que el superadmin la copie y se la entregue al cliente
// nuevo; a partir de ahí solo queda guardada cifrada (hash) en la base.
organizaciones.post('/', async (c) => {
  const parsed = await parseBody(c, createOrgSchema);
  if (!parsed.ok) return parsed.response;
  const { nombre_organizacion, admin_email, admin_nombre } = parsed.data;
  const superadmin = c.get('user');

  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(admin_email).first();
  if (existing) return c.json({ success: false, error: 'El email ya existe' }, 409);

  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  const password = generateRandomPassword();
  const { hash, salt, iterations } = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO organizaciones (id, nombre, activo, creado_en) VALUES (?,?,1,?)')
      .bind(orgId, nombre_organizacion, now),
    c.env.DB.prepare(`
      INSERT INTO users (id, email, nombre, rol, password_hash, password_salt, password_iterations, activo, organizacion_id, es_superadmin, creado_en, actualizado_en)
      VALUES (?,?,?,'admin',?,?,?,1,?,0,?,?)
    `).bind(userId, admin_email, admin_nombre, hash, salt, iterations, orgId, now, now),
  ]);

  auditLog(c, {
    action: 'organizacion.create', entityType: 'organizacion', entityId: orgId, userId: superadmin.sub,
    organizacionId: orgId, metadata: { nombre_organizacion, admin_email },
  });

  return c.json({
    success: true,
    organizacion_id: orgId,
    admin: { id: userId, email: admin_email, nombre: admin_nombre, password },
  }, 201);
});

export default organizaciones;
