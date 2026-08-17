import type { Env } from '../types/env';
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
  await env.DB.prepare(
    `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, ip, metadata_json, creado_en)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(
      newId(),
      opts.userId ?? null,
      opts.action,
      opts.entityType,
      opts.entityId ?? null,
      opts.ip ?? null,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
      nowIso()
    )
    .run();
}
