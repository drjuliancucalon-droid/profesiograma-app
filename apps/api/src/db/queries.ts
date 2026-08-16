import type { D1Database } from '@cloudflare/workers-types';

// ─── AUTH ────────────────────────────────────────────────────
export async function findUserByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').bind(email).first();
}

export async function findUserById(db: D1Database, id: string) {
  return db.prepare('SELECT id, email, full_name, role, empresa_id FROM users WHERE id = ? AND is_active = 1').bind(id).first();
}

export async function createSession(db: D1Database, userId: string, refreshToken: string, expiresAt: string) {
  return db.prepare(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)'
  ).bind(userId, refreshToken, expiresAt).run();
}

export async function findSession(db: D1Database, refreshToken: string) {
  return db.prepare(
    'SELECT s.*, u.email, u.full_name, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.refresh_token = ? AND s.expires_at > datetime("now")'
  ).bind(refreshToken).first();
}

export async function deleteSession(db: D1Database, refreshToken: string) {
  return db.prepare('DELETE FROM sessions WHERE refresh_token = ?').bind(refreshToken).run();
}

// ─── EMPRESAS ────────────────────────────────────────────────
export async function getEmpresas(db: D1Database) {
  return db.prepare('SELECT * FROM empresas ORDER BY nombre ASC').all();
}

export async function createEmpresa(db: D1Database, data: { nombre: string; nit?: string; responsable?: string }) {
  return db.prepare(
    'INSERT INTO empresas (nombre, nit, responsable) VALUES (?, ?, ?) RETURNING *'
  ).bind(data.nombre, data.nit ?? null, data.responsable ?? null).first();
}

// ─── PROFESIOGRAMAS ──────────────────────────────────────────
export async function getProfesiogramasByEmpresa(db: D1Database, empresaId: string) {
  return db.prepare(
    `SELECT p.*, e.nombre as empresa_nombre, pr.nombre as profesional_nombre
     FROM profesiogramas p
     JOIN empresas e ON p.empresa_id = e.id
     JOIN profesionales pr ON p.profesional_id = pr.id
     WHERE p.empresa_id = ?
     ORDER BY p.created_at DESC`
  ).bind(empresaId).all();
}

export async function createProfesiograma(db: D1Database, data: {
  empresa_id: string;
  profesional_id: string;
  created_by: string;
}) {
  return db.prepare(
    'INSERT INTO profesiogramas (empresa_id, profesional_id, created_by) VALUES (?, ?, ?) RETURNING *'
  ).bind(data.empresa_id, data.profesional_id, data.created_by).first();
}

export async function saveProfesiogramaSnapshot(db: D1Database, data: {
  profesiograma_id: string;
  version: number;
  snapshot_json: string;
  changed_by: string;
  cambio_desc?: string;
}) {
  return db.prepare(
    'INSERT INTO historial_versiones (profesiograma_id, version, snapshot_json, changed_by, cambio_desc) VALUES (?, ?, ?, ?, ?)'
  ).bind(data.profesiograma_id, data.version, data.snapshot_json, data.changed_by, data.cambio_desc ?? null).run();
}

// ─── CARGOS ──────────────────────────────────────────────────
export async function createCargo(db: D1Database, data: {
  profesiograma_id: string;
  grupo_ocupacional: string;
  nombre_cargo: string;
  descripcion?: string;
  competencias?: string;
  requisitos_fisicos?: string;
  peligros_riesgos?: string;
  ia_raw_json?: string;
}) {
  return db.prepare(
    `INSERT INTO cargos (profesiograma_id, grupo_ocupacional, nombre_cargo, descripcion, competencias, requisitos_fisicos, peligros_riesgos, ia_raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    data.profesiograma_id, data.grupo_ocupacional, data.nombre_cargo,
    data.descripcion ?? null, data.competencias ?? null,
    data.requisitos_fisicos ?? null, data.peligros_riesgos ?? null,
    data.ia_raw_json ?? null
  ).first();
}

export async function saveMatrizExamenes(db: D1Database, cargoId: string, examenes: Array<{
  examen: string;
  momento_i: boolean; momento_p: boolean; momento_r: boolean;
  momento_pi: boolean; momento_rl: boolean;
  observacion?: string;
  obligatorio?: boolean;
}>) {
  const stmt = db.prepare(
    `INSERT INTO matriz_examenes (cargo_id, examen, momento_i, momento_p, momento_r, momento_pi, momento_rl, observacion, obligatorio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const batch = examenes.map(e =>
    stmt.bind(
      cargoId, e.examen,
      e.momento_i ? 1 : 0, e.momento_p ? 1 : 0, e.momento_r ? 1 : 0,
      e.momento_pi ? 1 : 0, e.momento_rl ? 1 : 0,
      e.observacion ?? null, e.obligatorio ? 1 : 0
    )
  );
  return db.batch(batch);
}
