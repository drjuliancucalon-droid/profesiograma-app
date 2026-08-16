import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { createProfesiograma, createCargo, saveMatrizExamenes, saveProfesiogramaSnapshot, getProfesiogramasByEmpresa } from '../db/queries';

type Env = { DB: D1Database; JWT_SECRET: string; GEMINI_API_KEY: string };
const profesiograma = new Hono<{ Bindings: Env; Variables: { user: any; jwtPayload: any } }>();

const SYSTEM_PROMPT = `ACTÚA COMO MÉDICO ESPECIALISTA EN MEDICINA DEL TRABAJO Y SST EN COLOMBIA CON 15 AÑOS DE EXPERIENCIA.
TU OBJETIVO: Estructurar la matriz de evaluaciones médicas de un Profesiograma con rigor técnico absoluto y fundamentación por momento.

ESTRUCTURA JSON ESTRICTA:
{
  "grupoocupacional": "Categoría general",
  "cargo": "Nombre del cargo",
  "perfilcargo": { "descripcion": "...", "competencias": "...", "requisitosfisicos": "..." },
  "peligrosriesgos": "Detalle técnico de exposición",
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
  "fundamentaciontecnica": {
    "porquemomentos": "...",
    "obligatorios": [],
    "electivos": []
  },
  "recomendacionesrestricciones": []
}`;

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
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

// POST /api/profesiograma/generate — genera IA para un cargo
profesiograma.post('/generate', authMiddleware(['admin', 'medico', 'sst']), async (c) => {
  const { cargo, profesiograma_id } = await c.req.json();
  if (!cargo) return c.json({ error: 'El campo cargo es requerido' }, 400);
  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-25:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Analiza este cargo: ${cargo}. Escríbelo exactamente igual en el JSON devuelto.` }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );
    const data = await response.json() as any;
    if (!data.candidates?.[0]?.content) throw new Error('IA no devolvió respuesta válida');
    let jsonText = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);
    return c.json({ success: true, data: parsed, raw: jsonText });
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Error del motor IA' }, 500);
  }
});

// POST /api/profesiograma — crea profesiograma completo en D1
profesiograma.post('/', authMiddleware(['admin', 'medico']), async (c) => {
  const user = c.get('user') as any;
  const body = await c.req.json();
  const { empresa_id, profesional_id, cargos_data } = body;
  if (!empresa_id || !profesional_id || !cargos_data?.length) {
    return c.json({ error: 'Faltan campos requeridos' }, 400);
  }
  try {
    const prof = await createProfesiograma(c.env.DB, { empresa_id, profesional_id, created_by: user.id }) as any;
    const savedCargos = [];
    for (const cd of cargos_data) {
      const cargo = await createCargo(c.env.DB, {
        profesiograma_id: prof.id,
        grupo_ocupacional: cd.grupoocupacional ?? 'General',
        nombre_cargo: cd.cargo,
        descripcion: cd.perfilcargo?.descripcion,
        competencias: cd.perfilcargo?.competencias,
        requisitos_fisicos: cd.perfilcargo?.requisitosfisicos,
        peligros_riesgos: cd.peligrosriesgos,
        ia_raw_json: JSON.stringify(cd)
      }) as any;
      const examenes = Object.entries(cd.matriz ?? {}).map(([examen, momentos]: [string, any]) => ({
        examen,
        momento_i: !!momentos.I, momento_p: !!momentos.P, momento_r: !!momentos.R,
        momento_pi: !!momentos.PI, momento_rl: !!momentos.RL,
        observacion: cd.matrizobservaciones?.[examen],
        obligatorio: cd.fundamentaciontecnica?.obligatorios?.includes(examen) ?? false
      }));
      await saveMatrizExamenes(c.env.DB, cargo.id, examenes);
      savedCargos.push(cargo);
    }
    await saveProfesiogramaSnapshot(c.env.DB, {
      profesiograma_id: prof.id, version: 1,
      snapshot_json: JSON.stringify(body),
      changed_by: user.id, cambio_desc: 'Creación inicial'
    });
    return c.json({ success: true, profesiograma: prof, cargos: savedCargos }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/profesiograma?empresa_id=xxx
profesiograma.get('/', authMiddleware(), async (c) => {
  const empresaId = c.req.query('empresa_id');
  if (!empresaId) return c.json({ error: 'empresa_id requerido' }, 400);
  const data = await getProfesiogramasByEmpresa(c.env.DB, empresaId);
  return c.json(data);
});

export default profesiograma;
