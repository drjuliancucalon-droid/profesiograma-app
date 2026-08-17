import type { Context, Next } from 'hono';
import { verifyJwt } from '../lib/jwt';
import type { Env } from '../types/env';

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'No autorizado' }, 401);
  }
  const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
  if (!payload) return c.json({ success: false, error: 'Token inválido o expirado' }, 401);
  c.set('user', payload);
  await next();
}

export function requireRole(...roles: Array<'admin' | 'medico' | 'rrhh'>) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as any;
    if (!user || !roles.includes(user.rol)) {
      return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
    }
    await next();
  };
}
