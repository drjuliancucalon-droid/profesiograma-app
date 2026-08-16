-- ============================================================
-- PROFESIOGRAMA DB — Cloudflare D1 Schema
-- Dr. Julián Cucalón — OcupaSalud
-- ============================================================

PRAGMA journal_mode = WAL;

-- USUARIOS (auth nativo con D1 + JWT)
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','medico','sst','viewer')),
  empresa_id  TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- SESIONES JWT (refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PROFESIONALES MÉDICOS
CREATE TABLE IF NOT EXISTS profesionales (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT REFERENCES users(id),
  nombre      TEXT NOT NULL,
  cedula      TEXT NOT NULL UNIQUE,
  titulo      TEXT NOT NULL,
  licencia    TEXT NOT NULL,
  celular     TEXT,
  correo      TEXT,
  firma_url   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- EMPRESAS
CREATE TABLE IF NOT EXISTS empresas (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nombre      TEXT NOT NULL,
  nit         TEXT UNIQUE,
  responsable TEXT,
  logo_url    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PROFESIOGRAMAS (cabecera)
CREATE TABLE IF NOT EXISTS profesiogramas (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  empresa_id      TEXT NOT NULL REFERENCES empresas(id),
  profesional_id  TEXT NOT NULL REFERENCES profesionales(id),
  fecha_emision   TEXT NOT NULL DEFAULT (date('now')),
  version         INTEGER NOT NULL DEFAULT 1,
  estado          TEXT NOT NULL DEFAULT 'borrador' CHECK(estado IN ('borrador','vigente','archivado')),
  created_by      TEXT NOT NULL REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CARGOS del profesiograma
CREATE TABLE IF NOT EXISTS cargos (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profesiograma_id    TEXT NOT NULL REFERENCES profesiogramas(id) ON DELETE CASCADE,
  grupo_ocupacional   TEXT NOT NULL,
  nombre_cargo        TEXT NOT NULL,
  descripcion         TEXT,
  competencias        TEXT,
  requisitos_fisicos  TEXT,
  peligros_riesgos    TEXT,
  ia_raw_json         TEXT,  -- JSON crudo devuelto por Gemini
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- MATRIZ DE EXÁMENES por cargo
CREATE TABLE IF NOT EXISTS matriz_examenes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cargo_id    TEXT NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  examen      TEXT NOT NULL,  -- 'fisico','osteomuscular','audiometria', etc.
  momento_i   INTEGER NOT NULL DEFAULT 0,  -- Ingreso
  momento_p   INTEGER NOT NULL DEFAULT 0,  -- Periódico
  momento_r   INTEGER NOT NULL DEFAULT 0,  -- Retiro
  momento_pi  INTEGER NOT NULL DEFAULT 0,  -- Post-Incapacidad
  momento_rl  INTEGER NOT NULL DEFAULT 0,  -- Retorno Laboral
  observacion TEXT,
  obligatorio INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- HISTORIAL DE VERSIONES
CREATE TABLE IF NOT EXISTS historial_versiones (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profesiograma_id TEXT NOT NULL REFERENCES profesiogramas(id),
  version         INTEGER NOT NULL,
  snapshot_json   TEXT NOT NULL,  -- JSON completo del profesiograma en ese momento
  changed_by      TEXT NOT NULL REFERENCES users(id),
  cambio_desc     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ÓRDENES DE SERVICIO
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profesiograma_id TEXT NOT NULL REFERENCES profesiogramas(id),
  cargo_id        TEXT NOT NULL REFERENCES cargos(id),
  tipo_momento    TEXT NOT NULL CHECK(tipo_momento IN ('I','P','R','PI','RL')),
  candidato_nombre TEXT NOT NULL,
  candidato_id    TEXT NOT NULL,
  examenes_json   TEXT NOT NULL,  -- Array de exámenes activos
  generado_por    TEXT NOT NULL REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_profesiogramas_empresa ON profesiogramas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cargos_profesiograma ON cargos(profesiograma_id);
CREATE INDEX IF NOT EXISTS idx_matriz_cargo ON matriz_examenes(cargo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_profesiograma ON ordenes_servicio(profesiograma_id);

-- USUARIO ADMIN INICIAL (cambiar password después del primer deploy)
-- password: Admin2025! => bcrypt hash (generado offline)
INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role)
VALUES (
  'admin-00000000000000000000000000000001',
  'admin@ocupasalud.com',
  '$2b$10$rOzJqBmKQ5vQ1k7nM3LfKuT8sW2xP4yG6hE9dF0bC1aN5mJ7lI3eK',
  'Administrador Sistema',
  'admin'
);
