// ==============================================================
// RUTA HISTORIAL — Versiones de profesiograma
// GET /api/historial/:profesiogramaId
// ==============================================================

import { Hono } from 'hono';
import { requireAuth, type Env, type Variables } from '../middleware/auth';
import { historialQueries } from '../db/queries';

const historial = new Hono<{ Bindings: Env; Variables: Variables }>();

historial.get('/:profesiogramaId', requireAuth, async (c) => {
  const result = await historialQueries.findByProfesiograma(c.env.DB, c.req.param('profesiogramaId'));
  return c.json({ success: true, data: result.results ?? [] });
});

export default historial;
