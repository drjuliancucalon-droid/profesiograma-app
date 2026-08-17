import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimitMiddleware } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import profesiogramaRoutes from './routes/profesiograma';
import empresasRoutes from './routes/empresas';
import historialRoutes from './routes/historial';
import usersRoutes from './routes/users';
import ordenesRoutes from './routes/ordenes';
import pdfRoutes from './routes/pdf';
import settingsRoutes from './routes/settings';
import type { Env, HonoEnv } from './types/env';

const app = new Hono<HonoEnv>();

// ── Middlewares globales ──────────────────────────────────────────
app.use('*', logger());
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = (c.env as unknown as Env).CORS_ORIGIN;
    if (!origin) return allowed;
    if (origin === allowed) return origin;
    if (/^http:\/\/localhost:\d+$/.test(origin)) return origin;
    return allowed;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use('/api/profesiograma/generate', rateLimitMiddleware(10, 60_000));

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Rutas ─────────────────────────────────────────────────────────
app.route('/api/auth',          authRoutes);
app.route('/api/profesiograma', profesiogramaRoutes);
app.route('/api/empresas',      empresasRoutes);
app.route('/api/historial',     historialRoutes);
app.route('/api/users',         usersRoutes);
app.route('/api/ordenes',       ordenesRoutes);
app.route('/api/pdf',           pdfRoutes);
app.route('/api/settings',      settingsRoutes);

// ── Fallbacks ─────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, error: 'Ruta no encontrada' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'Error interno del servidor' }, 500);
});

export default app;
