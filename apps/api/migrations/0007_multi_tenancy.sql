-- Multi-tenancy: cada organización (clínica/consultorio SST cliente de esta
-- plataforma) es un tenant aislado. organizacion_id se agrega NULLABLE en
-- todas las tablas (SQLite no permite agregar una columna NOT NULL sin
-- default a una tabla con filas sin reconstruirla por completo) — el
-- aislamiento real lo garantiza la aplicación, que nunca inserta ni
-- consulta sin organizacion_id.
--
-- NOTA sobre nit/cedula: lo ideal sería que "nit" en empresas y "cedula" en
-- profesionales fueran únicos por organización (no global) — hoy dos
-- clínicas distintas no podrían registrar la misma empresa cliente o el
-- mismo profesional si coincide el NIT/cédula con lo que ya tiene OTRA
-- clínica. Eso requiere reconstruir esas tablas, y D1 rechaza esa
-- reconstrucción aquí: aunque se desactive `PRAGMA foreign_keys`, D1 sigue
-- verificando las foreign keys de otras tablas (profesiogramas.empresa_id,
-- ordenes_servicio.empresa_id, profesiogramas.profesional_id, todas NOT
-- NULL) al hacer DROP TABLE sobre la tabla referenciada — falla con
-- SQLITE_CONSTRAINT_FOREIGNKEY sin importar el pragma (confirmado con dos
-- intentos reales contra producción). Se deja como limitación conocida:
-- por ahora nit/cedula siguen siendo únicos globalmente. Si en el futuro
-- dos organizaciones necesitan compartir un NIT o cédula, hace falta una
-- migración aparte que también actualice esas foreign keys en el mismo paso.

CREATE TABLE organizaciones (
  id        TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL,
  activo    INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE users ADD COLUMN es_superadmin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE empresas ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE profesionales ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE profesiogramas ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE cargos ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE ordenes_servicio ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE historial_versiones ADD COLUMN organizacion_id TEXT REFERENCES organizaciones(id);
ALTER TABLE audit_log ADD COLUMN organizacion_id TEXT;

-- settings: nada más referencia esta tabla, así que reconstruirla no dispara
-- el problema de FK de arriba. La key ya no es única global (cada
-- organización tiene sus propias API keys de IA / proveedor primario),
-- pasa a ser (organizacion_id, key).
CREATE TABLE settings_new (
  organizacion_id TEXT NOT NULL,
  key             TEXT NOT NULL,
  value           TEXT NOT NULL,
  actualizado_por TEXT,
  actualizado_en  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organizacion_id, key)
);
INSERT INTO settings_new (organizacion_id, key, value, actualizado_por, actualizado_en)
  SELECT '3da721ce-0849-4920-b3af-854723cf2132', key, value, actualizado_por, actualizado_en FROM settings;
DROP TABLE settings;
ALTER TABLE settings_new RENAME TO settings;

-- Backfill: todos los datos existentes pertenecen a la organización del
-- consultorio actual (el único tenant real hasta ahora). El id es fijo
-- para poder referenciarlo en esta misma migración.
INSERT INTO organizaciones (id, nombre, activo, creado_en)
  VALUES ('3da721ce-0849-4920-b3af-854723cf2132', 'Consultorio Principal', 1, CURRENT_TIMESTAMP);

UPDATE users SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE users SET es_superadmin = 1 WHERE email = 'dr.juliancucalon@gmail.com';
UPDATE empresas SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE profesionales SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE profesiogramas SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE cargos SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE ordenes_servicio SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE historial_versiones SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
UPDATE audit_log SET organizacion_id = '3da721ce-0849-4920-b3af-854723cf2132';
