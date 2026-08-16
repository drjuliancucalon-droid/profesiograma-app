// ==============================================================
// RUTA PROFESIOGRAMA — Generación IA + CRUD
// POST /api/profesiograma/generate  ← llama Gemini (PROTEGIDO)
// POST /api/profesiograma            ← guardar en D1
// GET  /api/profesiograma/:id        ← obtener con cargos
// PUT  /api/profesiograma/:id        ← actualizar
// ==============================================================

import { Hono } from 'hono';
import { requireAuth, requireRole, type Env, type Variables } from '../middleware/auth';
import { profesiogramaQueries, cargoQueries, historialQueries } from '../db/queries';

const profesiograma = new Hono<{ Bindings: Env; Variables: Variables }>();

// Sistema prompt para Gemini (igual al original pero centralizado en backend)
const SYSTEM_PROMPT = `ACTUA COMO MEDICO ESPECIALISTA EN MEDICINA DEL TRABAJO Y SST EN COLOMBIA CON 15 ANOS DE EXPERIENCIA.
TU OBJETIVO: Estructurar la matriz de evaluaciones medicas de un Profesiograma con rigor tecnico absoluto y fundamentacion por momento.

CRITERIO DE ANALISIS MEDICO-LEGAL:
1. Realiza una investigacion profunda del cargo y sus peligros: Biomecanicos, Fisicos, Quimicos, Psicosociales, Fenomenos Naturales, Seguridad.
2. Determina con FUNDAMENTO TECNICO en que momentos exactos (I, P, R, PI, RL) es NECESARIO realizar cada prueba.
3. Clasifica que examenes son OBLIGATORIOS por ley o riesgo critico y cuales son ELECTIVOS.
4. La fundamentacion debe explicar el porque de la conducta medica para cada momento.
5. En matrizObservaciones, proporciona una explicacion MUY BREVE. Si NO ES NECESARIO, dejalo ESTRICTAMENTE vacio "".

ESTRUCTURA JSON ESTRICTA:
{
  "grupoOcupacional": "Categoria general",
  "cargo": "Nombre exacto del cargo",
  "perfilCargo": { "descripcion": "...", "competencias": "...", "requisitosFisicos": "..." },
  "peligrosRiesgos": "Detalle tecnico de exposicion",
  "matriz": {
    "fisico": {"I":true,"P":true,"R":true,"PI":true,"RL":true},
    "osteomuscular": {"I":true,"P":true,"R":true,"PI":true,"RL":true},
    "psicosensometrico": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "audiometria": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "visiometria": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "electrocardiograma": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "glicemia": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "perfillipidico": {"I":false,"P":false,"R":false,"PI":false,"RL":false},
    "laboratorio": "Menciona laboratorios adicionales o vacio"
  },
  "matrizObservaciones": { "fisico": "Breve nota", "osteomuscular": "..." },
  "fundamentacionTecnica": {
    "porqueMomentos": "Explicacion tecnica detallada.",
    "obligatorios": ["lista"],
    "electivos": ["lista"]
  },
  "recomendacionesRestricciones": [
    {"factorRiesgo":"","condicion":"","recomendaciones":"","restricciones":"","temporalidad":"","seguimiento":""}
  ]
}`;

async function callGemini(apiKey: string, cargo: string): Promise<any> {
  const maxRetries = 3;
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-25:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Analiza este cargo: ${cargo}. Escríbelo exactamente igual en el JSON devuelto.` }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      if (res.ok) return res.json();
      if (i < maxRetries - 1) { await new Promise(r => setTimeout(r, delay)); delay *= 2; }
      else throw new Error(`Gemini HTTP ${res.status}`);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, delay)); delay *= 2;
    }
  }
}

// POST /api/profesiograma/generate — Genera via IA (requiere auth)
profesiograma.post('/generate', requireAuth, async (c) => {
  try {
    const { cargos, modo } = await c.req.json();
    if (!cargos || !Array.isArray(cargos) || cargos.length === 0) {
      return c.json({ success: false, error: 'Lista de cargos requerida' }, 400);
    }
    if (cargos.length > 20) {
      return c.json({ success: false, error: 'Máximo 20 cargos por solicitud' }, 400);
    }
    const results: any[] = [];
    for (const cargo of cargos) {
      const data = await callGemini(c.env.GEMINI_API_KEY, cargo);
      if (!data?.candidates?.[0]?.content) {
        results.push({ cargo, error: 'IA no respondió para este cargo' });
        continue;
      }
      let jsonText = data.candidates[0].content.parts[0].text
        .replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        const parsed = JSON.parse(jsonText);
        results.push(parsed);
      } catch {
        results.push({ cargo, error: 'Error parseando respuesta IA' });
      }
    }
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message ?? 'Error generando profesiograma' }, 500);
  }
});

// POST /api/profesiograma — Guardar profesiograma completo
profesiograma.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { empresa_id, profesional_id, fecha, cargos } = await c.req.json();
    if (!empresa_id || !profesional_id || !fecha || !cargos?.length) {
      return c.json({ success: false, error: 'Datos incompletos' }, 400);
    }
    const nuevo = await profesiogramaQueries.create(c.env.DB, { empresa_id, profesional_id, fecha }) as any;
    for (const cargo of cargos) {
      await cargoQueries.upsert(c.env.DB, {
        profesiograma_id: nuevo.id,
        grupo_ocupacional: cargo.grupoOcupacional ?? '',
        cargo: cargo.cargo ?? '',
        perfil_descripcion: cargo.perfilCargo?.descripcion,
        perfil_competencias: cargo.perfilCargo?.competencias,
        perfil_requisitos: cargo.perfilCargo?.requisitosFisicos,
        peligros_riesgos: cargo.peligrosRiesgos,
        matriz_json: JSON.stringify(cargo.matriz ?? {}),
        observaciones_json: JSON.stringify(cargo.matrizObservaciones ?? {}),
        fundamentacion_json: JSON.stringify(cargo.fundamentacionTecnica ?? {}),
        restricciones_json: JSON.stringify(cargo.recomendacionesRestricciones ?? []),
      });
    }
    // Guardar snapshot en historial
    await historialQueries.create(c.env.DB, {
      profesiograma_id: nuevo.id,
      version: 1,
      snapshot_json: JSON.stringify({ empresa_id, profesional_id, fecha, cargos }),
      modificado_por: user.id,
      motivo: 'Creación inicial',
    });
    return c.json({ success: true, data: { id: nuevo.id }, message: 'Profesiograma guardado' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/profesiograma/:id
profesiograma.get('/:id', requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const header = await profesiogramaQueries.findById(c.env.DB, id);
    if (!header) return c.json({ success: false, error: 'No encontrado' }, 404);
    const cargosRaw = await cargoQueries.findByProfesiograma(c.env.DB, id);
    const cargos = (cargosRaw.results ?? []).map((r: any) => ({
      ...r,
      matriz: JSON.parse(r.matriz_json),
      matrizObservaciones: JSON.parse(r.observaciones_json),
      fundamentacionTecnica: JSON.parse(r.fundamentacion_json),
      recomendacionesRestricciones: JSON.parse(r.restricciones_json),
    }));
    return c.json({ success: true, data: { ...header, cargos } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default profesiograma;
