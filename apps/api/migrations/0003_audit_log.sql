-- NOTA (2026-08-17): esta migración aparece como aplicada en d1_migrations,
-- pero el esquema real en producción NO coincide con el SQL de abajo — la
-- tabla vive con columnas en español: (id, user_id, accion, entidad,
-- entidad_id, detalle, ip, creado_en), sin user_agent ni índices. No se
-- reescribe el CREATE TABLE de abajo porque D1 no vuelve a ejecutar
-- migraciones ya marcadas como aplicadas; lib/audit.ts fue corregido para
-- escribir contra el esquema real. Ver también migrations/0007_*.sql si se
-- necesita alinear la tabla real con este archivo en el futuro.
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log(creado_en);
