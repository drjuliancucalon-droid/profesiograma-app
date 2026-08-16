-- ==============================================================
-- SEED inicial — Usuario admin + empresa demo
-- Password: Admin2025! (hash bcrypt para pruebas locales)
-- CAMBIAR EN PRODUCCIÓN
-- ==============================================================

INSERT OR IGNORE INTO empresas (id, nombre, nit, responsable)
VALUES (
  'empresa-demo-001',
  'EMPRESA DEMO SST',
  '900.000.001-1',
  'Gerencia de Talento Humano'
);

INSERT OR IGNORE INTO users (id, email, password_hash, nombre, rol, empresa_id)
VALUES (
  'admin-demo-001',
  'admin@profesiograma.co',
  -- Hash de 'Admin2025!' — CAMBIAR con tu propio hash antes de produccion
  '$2a$10$placeholder_change_this_hash_before_production_deploy',
  'Administrador Demo',
  'admin',
  'empresa-demo-001'
);
