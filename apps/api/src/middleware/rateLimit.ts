import type { Context, Next } from 'hono';

// Rate limit simple usando KV o memoria (Workers stateless — usar Durable Objects para producción real)
const requestCounts = new Map<string, { count: number; reset: number }>();

export function rateLimitMiddleware(maxRequests = 30, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip);
    if (!entry || now > entry.reset) {
      requestCounts.set(ip, { count: 1, reset: now + windowMs });
    } else {
      entry.count++;
      if (entry.count > maxRequests) {
        return c.json({ error: 'Demasiadas solicitudes. Intenta en unos segundos.' }, 429);
      }
    }
    await next();
  };
}
