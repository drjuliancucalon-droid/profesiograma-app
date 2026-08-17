import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateWithFallback } from '../lib/aiProviders';
import { getAiKeys, getPrimaryProvider, providerOrder } from '../lib/settings';

const profesiograma = new Hono<HonoEnv>();

const SYSTEM_PROMPT = `ACTÚA COMO MÉDICO ESPECIALISTA EN MEDICINA DEL TRABAJO Y SST EN COLOMBIA CON 15 AÑOS DE EXPERIENCIA.
TU OBJETIVO: Estructurar la matriz de evaluaciones médicas de un Profesiograma con rigor técnico absoluto y fundamentación por momento.
CRITERIO DE ANÁLISIS MÉDICO-LEGAL:
1. Realiza una investigación profunda del cargo y sus peligros (Biomecánicos, Físicos, Químicos, Psicosociales, Fenómenos Naturales, Seguridad).
2. Determina con FUNDAMENTO TÉCNICO en qué momentos exactos (I, P, R, PI, RL) es NECESARIO realizar cada prueba.
3. Clasifica qué exámenes son OBLIGATORIOS (por ley o riesgo crítico) y cuáles son ELECTIVOS (preventivos o de vigilancia).
4. La fundamentación debe explicar el porqué de la conducta médica para cada momento (I, P, R, PI, RL).
5. En 'matriz_observaciones', proporciona una explicación MUY BREVE (ej. "Obligatorio (Anual)", "Sugerido (Ingreso)"). Si NO ES NECESARIO o no aplica, déjalo ESTRICTAMENTE vacío "".

ESTRUCTURA JSON ESTRICTA:
{
  "grupo_ocupacional": "Categoría general",
  "cargo": "Nombre del cargo",
  "perfil_cargo": {
    "descripcion": "Análisis técnico de la labor",
    "competencias": "Habilidades requeridas",
    "requisitos_fisicos": "Demandas fisiológicas"
  },
  "peligros_riesgos": "Detalle técnico de exposición",
  "matriz": {
    "fisico": {"I":true,"P":true,"R":true,"PI":true,"RL":true},
    "osteomuscular": {"I":true,"P":true,"R":true,"PI":true,"RL":true},
    "psicosensometrico": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "audiometria": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "visiometria": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "electrocardiograma": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "glicemia": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "perfil_lipidico": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "laboratorio": "Menciona laboratorios adicionales"
  },
  "matriz_observaciones": {
    "fisico": "", "osteomuscular": "", "psicosensometrico": "", "audiometria": "",
    "visiometria": "", "electrocardiograma": "", "glicemia": "", "perfil_lipidico": "", "laboratorio": ""
  },
  "fundamentacion_tecnica": {
    "por_que_momentos": "Explicación técnica.",
    "obligatorios": ["Lista de exámenes obligatorios por ley o riesgo"],
    "electivos": ["Lista de exámenes opcionales o de vigilancia recomendada"]
  },
  "recomendaciones_restricciones": [
    {
      "factor_riesgo": "Riesgo",
      "condicion": "Condición potencial",
      "recomendaciones": "Medidas",
      "restricciones": "Limitaciones",
      "temporalidad": "Tiempo",
      "seguimiento": "Plan"
    }
  ]
}`;

// POST /api/profesiograma/generate
profesiograma.post(
  '/generate',
  requireAuth,
  requireRole('admin', 'medico', 'sst'),
  async (c) => {
    const { cargo } = await c.req.json<{ cargo?: string; profesiograma_id?: string }>();
    if (!cargo) return c.json({ success: false, error: 'El campo cargo es requerido' }, 400);
    try {
      const [keys, primary] = await Promise.all([
        getAiKeys(c.env.DB, c.env),
        getPrimaryProvider(c.env.DB),
      ]);
      const { text } = await generateWithFallback(
        keys,
        providerOrder(primary),
        SYSTEM_PROMPT,
        `Analiza este cargo: "${cargo}". Escríbelo exactamente igual en el JSON devuelto.`
      );
      const match = text.replace(/```json/g, '').replace(/```/g, '').trim().match(/\{[\s\S]*\}/);
      const parsed: unknown = JSON.parse(match ? match[0] : text);
      return c.json({ success: true, data: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error del motor IA';
      return c.json({ success: false, error: msg }, 500);
    }
  }
);

// POST /api/profesiograma
profesiograma.post(
  '/',
  requireAuth,
  requireRole('admin', 'medico'),
  async (c) => {
    const user = c.get('user');
    const body = await c.req.json<{
      empresa_id?: string;
      profesional_id?: string;
      fecha_emision?: string;
      cargos_data?: Array<Record<string, unknown>>;
    }>();
    const { empresa_id, profesional_id, cargos_data } = body;
    if (!empresa_id || !profesional_id || !cargos_data?.length) {
      return c.json(
        { success: false, error: 'Faltan campos: empresa_id, profesional_id, cargos_data' },
        400
      );
    }
    try {
      const profId = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB.prepare(`
        INSERT INTO profesiogramas
        (id, empresa_id, profesional_id, fecha_emision, version, estado, creado_por, creado_en, actualizado_en)
        VALUES (?,?,?,?,1,'borrador',?,?,?)
      `).bind(
        profId, empresa_id, profesional_id,
        body.fecha_emision ?? now.slice(0, 10),
        user.sub, now, now
      ).run();

      for (const cd of cargos_data) {
        await c.env.DB.prepare(`
          INSERT INTO cargos
          (id, profesiograma_id, grupo_ocupacional, nombre_cargo, descripcion,
           competencias, requisitos_fisicos, peligros_riesgos, ia_raw_json, creado_en, actualizado_en)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `).bind(
          crypto.randomUUID(), profId,
          cd.grupo_ocupacional ?? 'General',
          cd.cargo ?? '',
          (cd.perfil_cargo as Record<string, unknown>)?.descripcion ?? null,
          (cd.perfil_cargo as Record<string, unknown>)?.competencias ?? null,
          (cd.perfil_cargo as Record<string, unknown>)?.requisitos_fisicos ?? null,
          cd.peligros_riesgos ?? null,
          JSON.stringify(cd),
          now, now
        ).run();
      }

      await c.env.DB.prepare(`
        INSERT INTO historial_versiones
        (id, profesiograma_id, version, snapshot_json, cambiado_por, cambio_desc, creado_en)
        VALUES (?,?,1,?,?,'Creación inicial',?)
      `).bind(crypto.randomUUID(), profId, JSON.stringify(body), user.sub, now).run();

      return c.json({ success: true, id: profId }, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error interno';
      return c.json({ success: false, error: msg }, 500);
    }
  }
);

// GET /api/profesiograma
profesiograma.get('/', requireAuth, async (c) => {
  const empresaId = c.req.query('empresa_id');
  if (!empresaId) return c.json({ success: false, error: 'empresa_id requerido' }, 400);
  const { results } = await c.env.DB
    .prepare('SELECT * FROM profesiogramas WHERE empresa_id = ? ORDER BY creado_en DESC')
    .bind(empresaId).all();
  return c.json({ success: true, data: results });
});

// GET /api/profesiograma/:id
profesiograma.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB
    .prepare('SELECT * FROM profesiogramas WHERE id = ? LIMIT 1')
    .bind(id).first();
  if (!row) return c.json({ success: false, error: 'No encontrado' }, 404);
  const { results: cargos } = await c.env.DB
    .prepare('SELECT * FROM cargos WHERE profesiograma_id = ? ORDER BY orden_index')
    .bind(id).all();
  return c.json({ success: true, data: { ...row, cargos } });
});

export default profesiograma;
