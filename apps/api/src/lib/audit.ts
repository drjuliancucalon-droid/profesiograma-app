import type { Context } from 'hono';
import type { Env, HonoEnv } from '../types/env';
import { newId, nowIso } from './id';

export async function audit(
  env: Env,
  opts: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    ip?: string;
    metadata?: Record<string, unknown>;
  }
) {
  // La tabla real en D1 usa nombres en español y no coincide con la migración
  // 0003 del repo (columnas action/entity_type/entity_id/metadata_json que
  // nunca se aplicaron así en producción): el esquema vivo es
  // (id, user_id, accion, entidad, entidad_id, detalle, ip, creado_en).
  await env.DB.prepare(
    `INSERT INTO audit_log (id, user_id, accion, entidad, entidad_id, detalle, ip, creado_en)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(
      newId(),
      opts.userId ?? null,
      opts.action,
      opts.entityType,
      opts.entityId ?? null,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
      opts.ip ?? null,
      nowIso()
    )
    .run();
}

/**
 * Registra el evento en segundo plano (waitUntil) sin bloquear ni poder
 * romper la respuesta: si la escritura de auditoría falla, la petición ya
 * respondió y el error solo queda en los logs del Worker.
 */
export function auditLog(
  c: Context<HonoEnv>,
  opts: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? undefined;
  c.executionCtx.waitUntil(
    audit(c.env, { ...opts, ip }).catch((err) => {
      console.error('audit_log write failed', err);
    })
  );
}
