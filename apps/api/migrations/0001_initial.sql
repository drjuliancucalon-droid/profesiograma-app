PRAGMA defer_foreign_keys = true;

CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  logo_url TEXT,
  responsable_sg_sst TEXT,
  correo TEXT,
  telefono TEXT,
  ciudad TEXT,
  creado_por TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profesionales (
  id TEXT PRIMARY KEY,
  empresa_id TEXT,
  nombre TEXT NOT NULL,
  cedula TEXT,
  titulo TEXT,
  licencia TEXT,
  celular TEXT,
  correo TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS profesiogramas (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL,
  profesional_id TEXT,
  fecha_emision TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','vigente','archivado')),
  observaciones TEXT,
  creado_por TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (profesional_id) REFERENCES profesionales(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cargos (
  id TEXT PRIMARY KEY,
  profesiograma_id TEXT NOT NULL,
  grupo_ocupacional TEXT,
  cargo TEXT NOT NULL,
  perfil_descripcion TEXT,
  perfil_competencias TEXT,
  perfil_requisitos_fisicos TEXT,
  peligros_riesgos TEXT,
  matriz_json TEXT NOT NULL DEFAULT '{}',
  matriz_observaciones_json TEXT NOT NULL DEFAULT '{}',
  fundamentacion_json TEXT NOT NULL DEFAULT '{}',
  recomendaciones_json TEXT NOT NULL DEFAULT '[]',
  ia_raw_json TEXT,
  orden_index INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profesiograma_id) REFERENCES profesiogramas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id TEXT PRIMARY KEY,
  profesiograma_id TEXT NOT NULL,
  cargo_id TEXT,
  empresa_id TEXT NOT NULL,
  candidato_nombre TEXT,
  candidato_documento TEXT,
  momento TEXT NOT NULL CHECK (momento IN ('I','P','R','PI','RL')),
  examenes_json TEXT NOT NULL DEFAULT '[]',
  restricciones_json TEXT NOT NULL DEFAULT '[]',
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida','vigente','anulada')),
  creado_por TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profesiograma_id) REFERENCES profesiogramas(id) ON DELETE CASCADE,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS historial_versiones (
  id TEXT PRIMARY KEY,
  profesiograma_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  cambio_desc TEXT,
  creado_por TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profesiograma_id) REFERENCES profesiogramas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profesiogramas_empresa ON profesiogramas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cargos_profesiograma ON cargos(profesiograma_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_profesiograma ON ordenes_servicio(profesiograma_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_empresa ON ordenes_servicio(empresa_id);
CREATE INDEX IF NOT EXISTS idx_historial_profesiograma ON historial_versiones(profesiograma_id);
