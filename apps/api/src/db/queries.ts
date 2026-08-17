// queries.ts — helpers tipados sobre D1
// La mayoría de las rutas usan c.env.DB directamente con .prepare().bind().run()
// Este archivo exporta helpers reutilizables para seed y tests.

export async function findUserByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND activo = 1 LIMIT 1').bind(email).first();
}

export async function createSession(
  db: D1Database,
  userId: string,
  token: string,
  expiresAt: string
): Promise<void> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO sessions (id, user_id, token, expires_at, creado_en) VALUES (?,?,?,?,?)')
    .bind(id, userId, token, expiresAt, now).run();
}

export async function findSession(db: D1Database, token: string) {
  return db.prepare(`
    SELECT s.*, u.email, u.rol, u.activo FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') LIMIT 1
  `).bind(token).first();
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function createProfesiograma(
  db: D1Database,
  data: { empresa_id: string; profesional_id: string; created_by: string }
) {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO profesiogramas (id, empresa_id, profesional_id, version, estado, creado_por, creado_en, actualizado_en)
    VALUES (?,?,?,1,'borrador',?,?,?)
  `).bind(id, data.empresa_id, data.profesional_id, data.created_by, now, now).run();
  return { id };
}

export async function createCargo(
  db: D1Database,
  data: {
    profesiograma_id: string; grupo_ocupacional: string; nombre_cargo: string;
    descripcion?: string | null; competencias?: string | null; requisitos_fisicos?: string | null;
    peligros_riesgos?: string | null; ia_raw_json?: string | null;
  }
) {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO cargos (id, profesiograma_id, grupo_ocupacional, cargo, perfil_descripcion, perfil_competencias, perfil_requisitos_fisicos, peligros_riesgos, ia_raw_json, creado_en, actualizado_en)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, data.profesiograma_id, data.grupo_ocupacional, data.nombre_cargo,
    data.descripcion ?? null, data.competencias ?? null, data.requisitos_fisicos ?? null,
    data.peligros_riesgos ?? null, data.ia_raw_json ?? null, now, now
  ).run();
  return { id };
}

export async function saveMatrizExamenes(
  db: D1Database,
  _cargoId: string,
  _examenes: Array<Record<string, unknown>>
): Promise<void> {
  // La matriz se guarda como JSON en cargos.matriz_json
  // Este helper existe para compatibilidad; la ruta actualiza directamente
}

export async function saveProfesiogramaSnapshot(
  db: D1Database,
  data: {
    profesiograma_id: string; version: number; snapshot_json: string;
    changed_by: string; cambio_desc: string;
  }
): Promise<void> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO historial_versiones (id, profesiograma_id, version, snapshot_json, cambio_desc, creado_por, creado_en)
    VALUES (?,?,?,?,?,?,?)
  `).bind(id, data.profesiograma_id, data.version, data.snapshot_json, data.cambio_desc, data.changed_by, now).run();
}

export async function getProfesiogramasByEmpresa(db: D1Database, empresaId: string) {
  const { results } = await db
    .prepare('SELECT * FROM profesiogramas WHERE empresa_id = ? ORDER BY creado_en DESC')
    .bind(empresaId).all();
  return results;
}
