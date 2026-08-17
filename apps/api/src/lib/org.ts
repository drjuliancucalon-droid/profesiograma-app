import type { Context } from 'hono';
import type { HonoEnv } from '../types/env';

/** Organización del usuario autenticado — el límite real del tenant. */
export function orgId(c: Context<HonoEnv>): string {
  return c.get('user').organizacion_id;
}
