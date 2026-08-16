import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getEmpresas, createEmpresa } from '../db/queries';

type Env = { DB: D1Database; JWT_SECRET: string };
const empresas = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// GET /api/empresas
empresas.get('/', authMiddleware(), async (c) => {
  const data = await getEmpresas(c.env.DB);
  return c.json(data);
});

// POST /api/empresas
empresas.post('/', authMiddleware(['admin', 'medico']), async (c) => {
  const body = await c.req.json();
  if (!body.nombre) return c.json({ error: 'El nombre de la empresa es requerido' }, 400);
  const empresa = await createEmpresa(c.env.DB, body);
  return c.json(empresa, 201);
});

export default empresas;
