import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';

const profesiograma = new Hono<HonoEnv>();

const SYSTEM_PROMPT = `ACTÚA COMO MÉDICO ESPECIALISTA EN MEDICINA DEL TRABAJO Y SST EN COLOMBIA CON 15 AÑOS DE EXPERIENCIA.
TU OBJETIVO: Estructurar la matriz de evaluaciones médicas de un Profesiograma con rigor técnico.

ESTRUCTURA JSON ESTRICTA:
{
  "grupoocupacional": "Categoría general",
  "cargo": "Nombre del cargo",
  "perfilcargo": { "descripcion": "", "competencias": "", "requisitosfisicos": "" },
  "peligrosriesgos": "",
  "matriz": {
    "fisico": {"I":true,"P":true,"R":true,"PI":true,"RL":true},
    "osteomuscular": {"I":true,"P":true,"R":true,"PI":true,"RL":true},
    "psicosensometrico": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "audiometria": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "visiometria": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "electrocardiograma": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "glicemia": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "perfillipidico": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "laboratorio": ""
  },
  "matrizobservaciones": {},
  "fundamentaciontecnica": { "porquemomentos": "", "obligatorios": [], "electivos": [] },
  "recomendacionesrestricciones": []
}`;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (i === maxRetries - 1) throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
  throw new Error('Max retries reached');
}

// POST /api/profesiograma/generate
profesiograma.post(
  '/generate',
  requireAuth,
  requireRole('admin', 'medico', 'sst'),
  async (c) => {
    const { cargo } = await c.req.json<{ cargo?: string; profesiograma_id?: string }>();
    if (!cargo) return c.json({ success: false, error: 'El campo cargo es requerido' }, 400);
    try {
      const resp = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analiza este cargo: ${cargo}` }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      const data = await resp.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('IA no devolvió respuesta válida');
      const parsed: unknown = JSON.parse(
        text.replace(/```json/g, '').replace(/```/g, '').trim()
      );
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
      observaciones?: string;
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
        (id, empresa_id, profesional_id, fecha_emision, version, estado, observaciones, creado_por, creado_en, actualizado_en)
        VALUES (?,?,?,?,1,'borrador',?,?,?,?)
      `).bind(
        profId, empresa_id, profesional_id,
        body.fecha_emision ?? now.slice(0, 10),
        body.observaciones ?? null, user.sub, now, now
      ).run();

      for (const cd of cargos_data) {
        await c.env.DB.prepare(`
          INSERT INTO cargos
          (id, profesiograma_id, grupo_ocupacional, cargo, perfil_descripcion,
           perfil_competencias, perfil_requisitos_fisicos, peligros_riesgos,
           matriz_json, ia_raw_json, creado_en, actualizado_en)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(
          crypto.randomUUID(), profId,
          cd.grupoocupacional ?? 'General',
          cd.cargo ?? '',
          (cd.perfilcargo as Record<string, unknown>)?.descripcion ?? null,
          (cd.perfilcargo as Record<string, unknown>)?.competencias ?? null,
          (cd.perfilcargo as Record<string, unknown>)?.requisitosfisicos ?? null,
          cd.peligrosriesgos ?? null,
          JSON.stringify(cd.matriz ?? {}),
          JSON.stringify(cd),
          now, now
        ).run();
      }

      await c.env.DB.prepare(`
        INSERT INTO historial_versiones
        (id, profesiograma_id, version, snapshot_json, cambio_desc, creado_por, creado_en)
        VALUES (?,?,1,?,'Creación inicial',?,?)
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
