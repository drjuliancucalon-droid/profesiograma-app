import type { Context, Next } from 'hono';
import type { HonoEnv } from '../types/env';

const store = new Map<string, { count: number; reset: number }>();

export function rateLimitMiddleware(
  max: number,
  windowMs: number
): (c: Context<HonoEnv>, next: Next) => Promise<Response | void> {
  return async (c, next) => {
    const key =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for') ??
      'unknown';
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.reset) {
      store.set(key, { count: 1, reset: now + windowMs });
    } else {
      entry.count++;
      if (entry.count > max) {
        return c.json(
          { success: false, error: 'Demasiadas solicitudes, intenta más tarde.' },
          429
        );
      }
    }
    await next();
  };
}
