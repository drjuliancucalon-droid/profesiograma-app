-- ==============================================================
-- PROFESIOGRAMA SST — Cloudflare D1 Schema
-- Dr. Julián Cucalón Jurado — Especialista SST & IA
-- ==============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------
-- AUTH: usuarios y sesiones (sin Supabase, nativo D1 + JWT)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK(rol IN ('admin','medico','sst_empresa','rrhh')),
  empresa_id  TEXT,
  activo      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

-- --------------------------------------------------------------
-- EMPRESAS
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nombre       TEXT NOT NULL,
  nit          TEXT UNIQUE,
  responsable  TEXT,
  logo_url     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------
-- PROFESIONALES (médicos SST)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profesionales (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  cedula      TEXT NOT NULL UNIQUE,
  titulo      TEXT NOT NULL,
  licencia    TEXT NOT NULL,
  celular     TEXT,
  correo      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --------------------------------------------------------------
-- PROFESIOGRAMAS (cabecera)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profesiogramas (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  empresa_id      TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  profesional_id  TEXT NOT NULL REFERENCES profesionales(id),
  fecha           TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  estado          TEXT NOT NULL DEFAULT 'borrador'
                  CHECK(estado IN ('borrador','emitido','vigente','vencido')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profesiograma_empresa ON profesiogramas(empresa_id);

-- --------------------------------------------------------------
-- CARGOS (cada fila de la matriz)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cargos (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profesiograma_id     TEXT NOT NULL REFERENCES profesiogramas(id) ON DELETE CASCADE,
  grupo_ocupacional    TEXT NOT NULL,
  cargo                TEXT NOT NULL,
  perfil_descripcion   TEXT,
  perfil_competencias  TEXT,
  perfil_requisitos    TEXT,
  peligros_riesgos     TEXT,
  -- Matriz JSON (almacenada como JSON string en D1)
  matriz_json          TEXT NOT NULL DEFAULT '{}',
  observaciones_json   TEXT NOT NULL DEFAULT '{}',
  fundamentacion_json  TEXT NOT NULL DEFAULT '{}',
  restricciones_json   TEXT NOT NULL DEFAULT '[]',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cargos_profesiograma ON cargos(profesiograma_id);

-- --------------------------------------------------------------
-- HISTORIAL DE VERSIONES (auditoría)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_versiones (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profesiograma_id  TEXT NOT NULL REFERENCES profesiogramas(id) ON DELETE CASCADE,
  version           INTEGER NOT NULL,
  snapshot_json     TEXT NOT NULL,  -- copia completa del estado
  modificado_por    TEXT NOT NULL REFERENCES users(id),
  motivo            TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_historial_profesiograma ON historial_versiones(profesiograma_id);

-- --------------------------------------------------------------
-- ÓRDENES DE SERVICIO
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  empresa_id       TEXT NOT NULL REFERENCES empresas(id),
  profesiograma_id TEXT REFERENCES profesiogramas(id),
  cargo            TEXT NOT NULL,
  tipo_examen      TEXT NOT NULL CHECK(tipo_examen IN ('I','P','R','PI','RL')),
  candidato_nombre TEXT NOT NULL,
  candidato_id     TEXT NOT NULL,
  examenes_json    TEXT NOT NULL DEFAULT '[]',
  emitida_por      TEXT NOT NULL REFERENCES users(id),
  fecha_emision    TEXT NOT NULL DEFAULT (datetime('now')),
  estado           TEXT NOT NULL DEFAULT 'emitida'
                   CHECK(estado IN ('emitida','atendida','vencida'))
);

CREATE INDEX IF NOT EXISTS idx_ordenes_empresa ON ordenes_servicio(empresa_id);
