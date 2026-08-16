import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimitMiddleware } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import profesiogramaRoutes from './routes/profesiograma';
import empresasRoutes from './routes/empresas';

type Env = {
  DB: D1Database;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

// ─── MIDDLEWARES GLOBALES ─────────────────────────────────────
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => origin,  // Configurar con FRONTEND_URL en producción
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use('/api/profesiograma/generate', rateLimitMiddleware(10, 60_000)); // 10 req/min para IA

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── RUTAS ───────────────────────────────────────────────────
app.route('/api/auth', authRoutes);
app.route('/api/profesiograma', profesiogramaRoutes);
app.route('/api/empresas', empresasRoutes);

// ─── 404 ─────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Ruta no encontrada' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Error interno del servidor' }, 500);
});

export default app;
