// ==============================================================
// RUTA EMPRESAS — CRUD
// GET    /api/empresas
// POST   /api/empresas
// GET    /api/empresas/:id
// PUT    /api/empresas/:id
// GET    /api/empresas/:id/profesiogramas
// ==============================================================

import { Hono } from 'hono';
import { requireAuth, type Env, type Variables } from '../middleware/auth';
import { empresaQueries, profesiogramaQueries } from '../db/queries';

const empresas = new Hono<{ Bindings: Env; Variables: Variables }>();

empresa.use('/*', requireAuth);

empresass.get('/', async (c) => {
  const result = await empresaQueries.findAll(c.env.DB);
  return c.json({ success: true, data: result.results ?? [] });
});

empresass.post('/', async (c) => {
  const body = await c.req.json();
  const empresa = await empresaQueries.create(c.env.DB, body);
  return c.json({ success: true, data: empresa }, 201);
});

empresass.get('/:id', async (c) => {
  const empresa = await empresaQueries.findById(c.env.DB, c.req.param('id'));
  if (!empresa) return c.json({ success: false, error: 'No encontrada' }, 404);
  return c.json({ success: true, data: empresa });
});

empresass.put('/:id', async (c) => {
  const body = await c.req.json();
  const updated = await empresaQueries.update(c.env.DB, c.req.param('id'), body);
  return c.json({ success: true, data: updated });
});

empresass.get('/:id/profesiogramas', async (c) => {
  const result = await profesiogramaQueries.findByEmpresa(c.env.DB, c.req.param('id'));
  return c.json({ success: true, data: result.results ?? [] });
});

export default empresas;
