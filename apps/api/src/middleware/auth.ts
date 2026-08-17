import type { Context, Next } from 'hono';
import { verifyJwt } from '../lib/jwt';
import type { Env } from '../types/env';

type UserPayload = {
  sub: string;
  email: string;
  rol: 'admin' | 'medico' | 'rrhh';
  iat: number;
  exp: number;
};

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'No autorizado' }, 401);
  }
  const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
  if (!payload) return c.json({ success: false, error: 'Token inválido o expirado' }, 401);
  c.set('user', payload as unknown as UserPayload);
  await next();
}

export function requireRole(...roles: Array<'admin' | 'medico' | 'rrhh'>) {
  return async (c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> => {
    const user = c.get('user') as UserPayload | undefined;
    if (!user || !roles.includes(user.rol)) {
      return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
    }
    await next();
  };
}

// Alias para compatibilidad con rutas que usen authMiddleware
export const authMiddleware = (roles?: Array<'admin' | 'medico' | 'rrhh' | 'sst'>) => {
  return async (c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No autorizado' }, 401);
    }
    const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
    if (!payload) return c.json({ success: false, error: 'Token inválido o expirado' }, 401);
    c.set('user', payload as unknown as UserPayload);
    if (roles && roles.length > 0) {
      const userRol = (payload as Record<string, unknown>).rol as string;
      if (!roles.includes(userRol as 'admin' | 'medico' | 'rrhh' | 'sst')) {
        return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
      }
    }
    await next();
  };
};

// Exporta signJWT / verifyJWT como alias para rutas legacy
export { signJwt as signJWT, verifyJwt as verifyJWT } from '../lib/jwt';
