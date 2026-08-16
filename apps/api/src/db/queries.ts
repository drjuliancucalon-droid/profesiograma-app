// ==============================================================
// D1 QUERIES — Tipadas y reutilizables
// ==============================================================

import type { D1Database } from '@cloudflare/workers-types';

// --- USERS ---
export const userQueries = {
  findByEmail: (db: D1Database, email: string) =>
    db.prepare('SELECT * FROM users WHERE email = ? AND activo = 1').bind(email).first(),

  findById: (db: D1Database, id: string) =>
    db.prepare('SELECT id, email, nombre, rol, empresa_id, created_at FROM users WHERE id = ?').bind(id).first(),

  create: (db: D1Database, data: {
    id: string; email: string; password_hash: string;
    nombre: string; rol: string; empresa_id?: string;
  }) =>
    db.prepare(`
      INSERT INTO users (id, email, password_hash, nombre, rol, empresa_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(data.id, data.email, data.password_hash, data.nombre, data.rol, data.empresa_id ?? null).run(),
};

// --- SESSIONS ---
export const sessionQueries = {
  create: (db: D1Database, userId: string, tokenHash: string, expiresAt: string) =>
    db.prepare(`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, tokenHash, expiresAt).run(),

  findByTokenHash: (db: D1Database, tokenHash: string) =>
    db.prepare(`
      SELECT s.*, u.id as uid, u.email, u.nombre, u.rol, u.empresa_id
      FROM sessions s JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.activo = 1
    `).bind(tokenHash).first(),

  deleteExpired: (db: D1Database) =>
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run(),
};

// --- EMPRESAS ---
export const empresaQueries = {
  findAll: (db: D1Database) =>
    db.prepare('SELECT * FROM empresas ORDER BY nombre ASC').all(),

  findById: (db: D1Database, id: string) =>
    db.prepare('SELECT * FROM empresas WHERE id = ?').bind(id).first(),

  create: (db: D1Database, data: { nombre: string; nit?: string; responsable?: string }) =>
    db.prepare(`
      INSERT INTO empresas (nombre, nit, responsable) VALUES (?, ?, ?)
      RETURNING *
    `).bind(data.nombre, data.nit ?? null, data.responsable ?? null).first(),

  update: (db: D1Database, id: string, data: { nombre?: string; nit?: string; responsable?: string }) =>
    db.prepare(`
      UPDATE empresas SET
        nombre = COALESCE(?, nombre),
        nit = COALESCE(?, nit),
        responsable = COALESCE(?, responsable),
        updated_at = datetime('now')
      WHERE id = ? RETURNING *
    `).bind(data.nombre ?? null, data.nit ?? null, data.responsable ?? null, id).first(),
};

// --- PROFESIOGRAMAS ---
export const profesiogramaQueries = {
  findByEmpresa: (db: D1Database, empresaId: string) =>
    db.prepare(`
      SELECT p.*, e.nombre as empresa_nombre
      FROM profesiogramas p JOIN empresas e ON p.empresa_id = e.id
      WHERE p.empresa_id = ? ORDER BY p.created_at DESC
    `).bind(empresaId).all(),

  findById: (db: D1Database, id: string) =>
    db.prepare('SELECT * FROM profesiogramas WHERE id = ?').bind(id).first(),

  create: (db: D1Database, data: {
    empresa_id: string; profesional_id: string; fecha: string;
  }) =>
    db.prepare(`
      INSERT INTO profesiogramas (empresa_id, profesional_id, fecha)
      VALUES (?, ?, ?) RETURNING *
    `).bind(data.empresa_id, data.profesional_id, data.fecha).first(),

  updateEstado: (db: D1Database, id: string, estado: string) =>
    db.prepare(`
      UPDATE profesiogramas SET estado = ?, updated_at = datetime('now')
      WHERE id = ? RETURNING *
    `).bind(estado, id).first(),
};

// --- CARGOS ---
export const cargoQueries = {
  findByProfesiograma: (db: D1Database, profesiogramaId: string) =>
    db.prepare('SELECT * FROM cargos WHERE profesiograma_id = ? ORDER BY created_at ASC').bind(profesiogramaId).all(),

  upsert: (db: D1Database, data: {
    id?: string; profesiograma_id: string; grupo_ocupacional: string; cargo: string;
    perfil_descripcion?: string; perfil_competencias?: string; perfil_requisitos?: string;
    peligros_riesgos?: string; matriz_json: string; observaciones_json: string;
    fundamentacion_json: string; restricciones_json: string;
  }) =>
    db.prepare(`
      INSERT INTO cargos (
        profesiograma_id, grupo_ocupacional, cargo,
        perfil_descripcion, perfil_competencias, perfil_requisitos,
        peligros_riesgos, matriz_json, observaciones_json,
        fundamentacion_json, restricciones_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.profesiograma_id, data.grupo_ocupacional, data.cargo,
      data.perfil_descripcion ?? null, data.perfil_competencias ?? null, data.perfil_requisitos ?? null,
      data.peligros_riesgos ?? null, data.matriz_json, data.observaciones_json,
      data.fundamentacion_json, data.restricciones_json
    ).first(),
};

// --- HISTORIAL ---
export const historialQueries = {
  create: (db: D1Database, data: {
    profesiograma_id: string; version: number;
    snapshot_json: string; modificado_por: string; motivo?: string;
  }) =>
    db.prepare(`
      INSERT INTO historial_versiones
      (profesiograma_id, version, snapshot_json, modificado_por, motivo)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.profesiograma_id, data.version, data.snapshot_json,
      data.modificado_por, data.motivo ?? null
    ).run(),

  findByProfesiograma: (db: D1Database, profesiogramaId: string) =>
    db.prepare(`
      SELECT h.*, u.nombre as modificado_por_nombre
      FROM historial_versiones h JOIN users u ON h.modificado_por = u.id
      WHERE h.profesiograma_id = ? ORDER BY h.version DESC
    `).bind(profesiogramaId).all(),
};
