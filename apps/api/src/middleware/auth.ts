import type { MiddlewareHandler } from 'hono';
import { verifyJwt } from '../lib/jwt';
import type { HonoEnv } from '../types/env';

type Role = 'admin' | 'medico' | 'rrhh' | 'sst';

/** Verifica JWT y carga c.get('user'). Usar en cualquier ruta protegida. */
export const requireAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'No autorizado' }, 401);
  }
  const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
  if (!payload) return c.json({ success: false, error: 'Token inválido o expirado' }, 401);
  c.set('user', payload as HonoEnv['Variables']['user']);
  await next();
};

/** Verifica rol después de requireAuth. */
export function requireRole(...roles: Role[]): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.rol)) {
      return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
    }
    await next();
  };
}

/**
 * Verifica que el usuario sea superadmin de la plataforma (no de una
 * organización) después de requireAuth. Es una capacidad aparte del rol
 * normal: un superadmin sigue siendo admin/medico/etc. dentro de su propia
 * organización, pero además puede crear organizaciones nuevas.
 */
export const requireSuperadmin: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user || !user.es_superadmin) {
    return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
  }
  await next();
};

/**
 * authMiddleware — alias legacy compatible.
 * Si se pasan roles, verifica JWT + rol. Sin roles, solo verifica JWT.
 */
export function authMiddleware(roles?: Role[]): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No autorizado' }, 401);
    }
    const payload = await verifyJwt(c.env.JWT_SECRET, header.slice(7));
    if (!payload) return c.json({ success: false, error: 'Token inválido o expirado' }, 401);
    c.set('user', payload as HonoEnv['Variables']['user']);
    if (roles && roles.length > 0) {
      const rol = (payload as Record<string, unknown>).rol as Role;
      if (!roles.includes(rol)) {
        return c.json({ success: false, error: 'Sin permisos suficientes' }, 403);
      }
    }
    await next();
  };
}

export { signJwt as signJWT, verifyJwt as verifyJWT } from '../lib/jwt';
