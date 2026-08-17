import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth } from '../middleware/auth';

const historial = new Hono<HonoEnv>();

historial.use('*', requireAuth);

historial.get('/', async (c) => {
  const profesiogramaId = c.req.query('profesiograma_id');
  if (!profesiogramaId) return c.json({ success: false, error: 'profesiograma_id requerido' }, 400);
  const { results } = await c.env.DB
    .prepare('SELECT * FROM historial_versiones WHERE profesiograma_id = ? ORDER BY version DESC')
    .bind(profesiogramaId).all();
  return c.json({ success: true, data: results });
});

historial.get('/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT * FROM historial_versiones WHERE id = ? LIMIT 1')
    .bind(c.req.param('id')).first();
  if (!row) return c.json({ success: false, error: 'No encontrado' }, 404);
  return c.json({ success: true, data: row });
});

export default historial;
