import type { Context, Next } from 'hono';
import type { HonoEnv } from '../types/env';

/**
 * Rate limiter respaldado por D1 (ventana fija, contador atómico). Un Map en
 * memoria NO sirve en Cloudflare Workers: cada request puede caer en una
 * instancia/isolate distinta repartida por cientos de centros de datos, así
 * que el contador nunca se comparte de verdad. Tampoco basta con
 * "SELECT COUNT... luego INSERT" en D1: bajo peticiones concurrentes eso es
 * una condición de carrera (varias leen el mismo conteo antes de que
 * cualquiera termine de escribir). INSERT ... ON CONFLICT DO UPDATE ...
 * RETURNING sí es atómico y elimina la carrera.
 */
export function rateLimitMiddleware(
  max: number,
  windowMs: number
): (c: Context<HonoEnv>, next: Next) => Promise<Response | void> {
  return async (c, next) => {
    const ip =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for') ??
      'unknown';
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    const result = await c.env.DB
      .prepare(`
        INSERT INTO rate_limits (ip, window_start, count)
        VALUES (?, ?, 1)
        ON CONFLICT(ip, window_start) DO UPDATE SET count = count + 1
        RETURNING count
      `)
      .bind(ip, windowStart)
      .first<{ count: number }>();

    if ((result?.count ?? 0) > max) {
      return c.json({ success: false, error: 'Demasiadas solicitudes, intenta más tarde.' }, 429);
    }

    // Limpieza oportunista de ventanas viejas (~1% de las peticiones) para que
    // la tabla no crezca sin límite, sin necesitar un cron aparte.
    if (Math.random() < 0.01) {
      c.executionCtx.waitUntil(
        c.env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?')
          .bind(now - 24 * 60 * 60 * 1000)
          .run()
      );
    }

    await next();
  };
}
