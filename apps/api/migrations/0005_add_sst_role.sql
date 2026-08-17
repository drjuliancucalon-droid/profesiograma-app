-- SQLite no permite ALTER de un CHECK existente: hay que recrear la tabla.
-- Se usa el patrón oficial de SQLite (defer_foreign_keys) para no romper
-- la FK de sessions.user_id -> users(id) durante el swap.
PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE users_new (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  nombre              TEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  password_salt       TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 310000,
  rol                 TEXT NOT NULL CHECK(rol IN ('admin','medico','rrhh','sst')),
  activo              INTEGER NOT NULL DEFAULT 1,
  creado_en           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_new (id, email, nombre, password_hash, password_salt, password_iterations, rol, activo, creado_en, actualizado_en)
SELECT id, email, nombre, password_hash, password_salt, password_iterations, rol, activo, creado_en, actualizado_en FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX idx_users_email ON users(email);
