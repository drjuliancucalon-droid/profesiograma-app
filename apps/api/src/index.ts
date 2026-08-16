// ==============================================================
// CLOUDFLARE WORKER — API Principal
// Hono Router — Profesiograma SST
// ==============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './middleware/auth';

import authRoutes from './routes/auth';
import profesiogramaRoutes from './routes/profesiograma';
import empresasRoutes from './routes/empresas';
import historialRoutes from './routes/historial';

const app = new Hono<{ Bindings: Env }>();

// ==============================================================
// MIDDLEWARES GLOBALES
// ==============================================================
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = [c.env.CORS_ORIGIN, 'http://localhost:5173'];
    return allowed.includes(origin) ? origin : c.env.CORS_ORIGIN;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ==============================================================
// HEALTH CHECK
// ==============================================================
app.get('/health', (c) => c.json({
  status: 'ok',
  service: 'Profesiograma API',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ==============================================================
// RUTAS
// ==============================================================
app.route('/api/auth', authRoutes);
app.route('/api/profesiograma', profesiogramaRoutes);
app.route('/api/empresas', empresasRoutes);
app.route('/api/historial', historialRoutes);

// 404 global
app.notFound((c) => c.json({ success: false, error: 'Ruta no encontrada' }, 404));

// Error global
app.onError((err, c) => {
  console.error('Error no manejado:', err);
  return c.json({ success: false, error: 'Error interno del servidor' }, 500);
});

export default app;
