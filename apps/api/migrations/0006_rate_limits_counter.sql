-- La tabla anterior (una fila por request) tenía una condición de carrera:
-- "SELECT COUNT... luego INSERT" no es atómico bajo concurrencia real, así
-- que varias peticiones simultáneas podían leer el mismo conteo antes de que
-- ninguna terminara de escribir. Se reemplaza por un contador atómico:
-- una sola fila por (ip, window_start) que se incrementa con
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING, que sí es atómico.
DROP TABLE IF EXISTS rate_limits;

CREATE TABLE rate_limits (
  ip           TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  creado_en    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ip, window_start)
);
