import puppeteer from '@cloudflare/puppeteer';

interface Cargo {
  grupo_ocupacional?: string;
  cargo?: string;
  perfil_cargo?: { descripcion?: string; competencias?: string; requisitos_fisicos?: string };
  peligros_riesgos?: string;
  matriz?: Record<string, Record<string, boolean> | string>;
  matriz_observaciones?: Record<string, string>;
  fundamentacion_tecnica?: { por_que_momentos?: string; obligatorios?: string[]; electivos?: string[] };
  recomendaciones_restricciones?: Array<{
    factor_riesgo?: string; condicion?: string; recomendaciones?: string;
    restricciones?: string; temporalidad?: string; seguimiento?: string;
  }>;
}

interface PdfData {
  profesiograma: { fecha_emision?: string };
  empresa: { nombre?: string; nit?: string; responsable?: string };
  profesional: { nombre?: string; titulo?: string; cedula?: string; licencia?: string } | null;
  cargos: Cargo[];
}

interface OrdenData {
  orden: Record<string, unknown>;
  empresa: Record<string, unknown>;
}

const MOMENTO_COLORS: Record<string, string> = { I: '#2563eb', P: '#059669', R: '#d97706', PI: '#7c3aed', RL: '#db2777' };
const MOMENTOS = ['I', 'P', 'R', 'PI', 'RL'] as const;

const EXAMENES = [
  { key: 'fisico', label: 'Físico' },
  { key: 'osteomuscular', label: 'Osteomus...' },
  { key: 'psicosensometrico', label: 'Psicosenso...' },
  { key: 'audiometria', label: 'Audio...' },
  { key: 'visiometria', label: 'Visio...' },
  { key: 'electrocardiograma', label: 'EKG' },
  { key: 'glicemia', label: 'Glicemia' },
  { key: 'perfil_lipidico', label: 'Lípidos' },
] as const;

const MARCO_LEGAL = [
  { norma: 'Resolución 1843 de 2025', titulo: 'Regulación Evaluaciones Médicas Ocupacionales', descripcion: "Deroga Res. 2346/07. Concepto de 'Perfil de Cargo' obligatorio. Duración mínima de consulta: 20 min. Prohibición de término 'No Apto'. Custodia de HC por IPS/médico (20 años mínimo), NO por empleador." },
  { norma: 'Sentencia T-202 de 2024 / Ley 2114', titulo: 'Medidas Antidiscriminatorias', descripcion: 'Se prohíbe exigir pruebas de Embarazo, VIH o Serología (VDRL) para ingreso. Son consideradas medidas discriminatorias.' },
  { norma: 'Decreto 1072 de 2015', titulo: 'Decreto Único Reglamentario SST', descripcion: 'Obliga a fundamentar exámenes estrictamente en el Perfil del Cargo y la Matriz de Peligros (IPVR).' },
  { norma: 'Resolución 4272 de 2021', titulo: 'Trabajo en Alturas', descripcion: 'Exige Perfil Lipídico, Glicemia, Visiometría y Test de Vértigo. Restricción estricta IMC > 35 y peso > 110kg.' },
  { norma: 'Res. 20223040040595 de 2022', titulo: 'PESV (Conductores)', descripcion: 'Obligatoriedad de pruebas psicosensométricas, médicas y visuales para certificar aptitud.' },
];

const DESCRIPCION_PRUEBAS = [
  { prueba: 'Examen Médico Completo', objetivo: 'Evaluación completa incluyendo antecedentes. Físico general.', indicacion: 'Anual para riesgos altos, 2-3 años para moderados. Mínimo 20 min de consulta.' },
  { prueba: 'Examen Osteomuscular', objetivo: 'Evaluación de articulaciones, postura, rango de movimiento.', indicacion: 'Obligatorio para manipulación de cargas o posturas prolongadas.' },
  { prueba: 'Audiometría Tonal', objetivo: 'Evaluar umbral auditivo (0.5 a 8 kHz).', indicacion: 'Expuestos a ruido >80 dB(A). Reposo auditivo 12h requerido en Ingreso/Retiro.' },
  { prueba: 'Optometría / Visiometría', objetivo: 'Agudeza visual, percepción de colores, profundidad.', indicacion: 'Conductores, Trabajo en Alturas, Operativos con maquinaria de precisión.' },
  { prueba: 'Prueba Psicosensométrica', objetivo: 'Coordinación motriz, atención, tiempo de reacción.', indicacion: 'Obligatorio Conductores y operadores de maquinaria pesada.' },
  { prueba: 'Electrocardiograma (EKG)', objetivo: 'Registro de actividad eléctrica cardiaca.', indicacion: 'Trabajo en alturas, espacios confinados, conductores >50 años.' },
  { prueba: 'Glicemia / Perfil Lipídico', objetivo: 'Nivel de glucosa, colesterol, triglicéridos.', indicacion: 'Prevención de riesgo cardiovascular. Ayuno de 8-12h.' },
];

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function momentoBadges(data: Record<string, boolean> | undefined): string {
  if (!data) return '';
  return MOMENTOS.map((m) => {
    const active = !!data[m];
    const color = MOMENTO_COLORS[m];
    return `<span style="display:inline-block;width:16px;height:14px;line-height:14px;text-align:center;font-size:7px;font-weight:700;border-radius:3px;margin:0 1px;border:1px solid ${active ? color : '#ccc'};background:${active ? color + '22' : 'transparent'};color:${active ? color : '#bbb'};">${m}</span>`;
  }).join('');
}

function buildProfesiogramaHtml(data: PdfData): string {
  const { empresa, profesional, cargos, profesiograma } = data;
  const empresaNombre = esc(empresa.nombre ?? 'Empresa');

  const matrizRows = cargos.map((cd) => {
    const examCells = EXAMENES.map((e) => {
      const val = cd.matriz?.[e.key];
      const badges = typeof val === 'object' ? momentoBadges(val as Record<string, boolean>) : '';
      const obs = esc(cd.matriz_observaciones?.[e.key] ?? '');
      return `<td style="text-align:center;"><div>${badges}</div>${obs ? `<div style="font-size:7px;color:#4338ca;margin-top:2px;">${obs}</div>` : ''}</td>`;
    }).join('');
    const lab = cd.matriz?.laboratorio;
    const labText = typeof lab === 'string' ? esc(lab) : '';
    const labObs = esc(cd.matriz_observaciones?.laboratorio ?? '');
    return `<tr>
      <td style="font-weight:700;">${esc(cd.grupo_ocupacional)}</td>
      <td style="font-weight:700;font-family:Georgia,serif;">${esc(cd.cargo)}</td>
      <td>
        <div><b>Descripción:</b> ${esc(cd.perfil_cargo?.descripcion)}</div>
        <div style="margin-top:3px;border-top:1px solid #eee;padding-top:3px;"><b>Competencias:</b> ${esc(cd.perfil_cargo?.competencias)}</div>
        <div style="margin-top:3px;border-top:1px solid #eee;padding-top:3px;"><b>Físico:</b> ${esc(cd.perfil_cargo?.requisitos_fisicos)}</div>
      </td>
      <td>${esc(cd.peligros_riesgos)}</td>
      ${examCells}
      <td style="text-align:center;">
        <div style="font-weight:700;">${labText}</div>
        ${labObs ? `<div style="font-size:7px;color:#065f46;margin-top:2px;">${labObs}</div>` : ''}
      </td>
    </tr>`;
  }).join('');

  const fundamentacionBlocks = cargos.map((cd) => `
    <div style="border-bottom:1px solid #e5e7eb;padding:10px 0;page-break-inside:avoid;break-inside:avoid;">
      <h4 style="margin:0 0 6px;color:#4338ca;text-transform:uppercase;font-size:10px;">${esc(cd.cargo)}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9px;">
        <div style="font-style:italic;color:#555;">
          <b style="display:block;text-transform:uppercase;font-size:8px;color:#333;font-style:normal;margin-bottom:2px;">Justificación de periodicidad y momentos</b>
          ${esc(cd.fundamentacion_tecnica?.por_que_momentos)}
        </div>
        <div>
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:6px;margin-bottom:6px;page-break-inside:avoid;break-inside:avoid;">
            <b style="display:block;text-transform:uppercase;font-size:8px;color:#065f46;">Obligatorios</b>
            <span style="color:#065f46;">${(cd.fundamentacion_tecnica?.obligatorios ?? []).map(esc).join(', ') || '—'}</span>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px;page-break-inside:avoid;break-inside:avoid;">
            <b style="display:block;text-transform:uppercase;font-size:8px;color:#92400e;">Electivos</b>
            <span style="color:#92400e;">${(cd.fundamentacion_tecnica?.electivos ?? []).map(esc).join(', ') || '—'}</span>
          </div>
        </div>
      </div>
    </div>`).join('');

  const restriccionesBlocks = cargos.map((cd) => {
    const recs = cd.recomendaciones_restricciones ?? [];
    const rows = recs.length
      ? recs.map((r) => `<tr>
          <td style="font-weight:700;">${esc(r.factor_riesgo)}<br><span style="font-weight:400;color:#777;font-size:8px;">${esc(r.condicion)}</span></td>
          <td>${esc(r.recomendaciones)}</td>
          <td style="color:#b45309;">${esc(r.restricciones)}</td>
          <td>${esc(r.temporalidad)}</td>
          <td>${esc(r.seguimiento)}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;color:#999;font-style:italic;">No hay restricciones estructuradas para este cargo.</td></tr>`;
    return `<div style="margin-bottom:16px;border:1px solid #ddd;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
      <div style="background:#0f172a;color:#fff;padding:8px 12px;font-family:Georgia,serif;font-weight:700;">${esc(cd.cargo)}</div>
      <table style="width:100%;border-collapse:collapse;font-size:9px;">
        <thead><tr style="background:#f3f4f6;text-align:left;">
          <th style="padding:6px;">Factor / Condición</th><th style="padding:6px;">Recomendaciones</th>
          <th style="padding:6px;">Restricciones</th><th style="padding:6px;">Temporalidad</th><th style="padding:6px;">Seguimiento</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  const pruebasBlocks = DESCRIPCION_PRUEBAS.map((p) => `
    <div style="border:1px solid #ddd;border-radius:8px;padding:10px;page-break-inside:avoid;">
      <h4 style="margin:0 0 6px;font-family:Georgia,serif;border-bottom:1px solid #eee;padding-bottom:4px;">${esc(p.prueba)}</h4>
      <p style="margin:0 0 6px;font-size:9px;"><b>Objetivo:</b> ${esc(p.objetivo)}</p>
      <div style="background:#f9fafb;border:1px solid #eee;border-radius:6px;padding:6px;font-size:9px;">
        <span style="color:#b45309;font-weight:700;text-transform:uppercase;font-size:8px;display:block;">Indicación clínica</span>
        ${esc(p.indicacion)}
      </div>
    </div>`).join('');

  const legalBlocks = MARCO_LEGAL.map((l) => `
    <div style="border:1px solid #ddd;border-radius:8px;padding:10px;page-break-inside:avoid;">
      <h5 style="margin:0 0 2px;font-size:10px;">${esc(l.norma)}</h5>
      <div style="color:#b45309;font-weight:700;text-transform:uppercase;font-size:8px;margin-bottom:4px;">${esc(l.titulo)}</div>
      <p style="margin:0;font-size:9px;text-align:justify;">${esc(l.descripcion)}</p>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; }
  .page { padding: 14mm 12mm; }
  .page-break { page-break-before: always; }
  h2.section-title { font-family: Georgia, serif; font-size: 15px; border-bottom: 1px solid #333; padding-bottom: 6px; margin: 0 0 16px; text-transform: uppercase; }
  table.matriz { width: 100%; border-collapse: collapse; font-size: 8px; table-layout: fixed; }
  table.matriz th { background: #1e293b; color: #fff; padding: 5px 3px; font-size: 7px; text-transform: uppercase; white-space: normal; word-break: break-word; line-height: 1.2; }
  table.matriz td { border: 1px solid #ccc; padding: 5px 4px; vertical-align: top; }
  table.matriz tr { page-break-inside: avoid; break-inside: avoid; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="page">
    <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:24px;align-items:center;margin-bottom:20px;">
      <div style="border:2px solid #f59e0b;border-radius:16px;padding:20px;text-align:center;">
        <h1 style="font-family:Georgia,serif;color:#d97706;text-transform:uppercase;font-size:22px;margin:0 0 6px;">Profesiograma</h1>
        <div style="font-style:italic;font-weight:700;font-size:13px;">${empresaNombre}</div>
      </div>
      <div>
        <h2 style="font-family:Georgia,serif;text-transform:uppercase;color:#0369a1;margin:0 0 10px;">Objetivos</h2>
        <ul style="margin:0;padding-left:16px;font-size:10px;line-height:1.5;">
          <li>Presentar los requisitos de las evaluaciones médicas ocupacionales para los trabajadores de la empresa <b>${empresaNombre}</b> con base en el perfil del cargo y los riesgos ocupacionales.</li>
          <li>Definir los criterios técnicos de las evaluaciones.</li>
          <li>Presentar las principales restricciones que pueden darse por tipo de evaluación.</li>
        </ul>
      </div>
    </div>
    <div style="text-align:right;font-size:9px;color:#666;margin-bottom:30px;">Fecha de emisión: ${esc(profesiograma.fecha_emision)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;text-align:center;">
      <div>
        <div style="border-top:2px solid #111;margin-bottom:6px;"></div>
        <div style="font-family:Georgia,serif;font-weight:700;">${esc(empresa.responsable) || 'Responsable SG-SST'}</div>
        <div style="font-size:8px;color:#777;text-transform:uppercase;">Responsable SG-SST (Empresa)</div>
      </div>
      <div>
        <div style="border-top:2px solid #111;margin-bottom:6px;"></div>
        <div style="font-family:Georgia,serif;font-weight:700;">${esc(profesional?.nombre) || 'Dr. / Especialista SST'}</div>
        ${profesional?.titulo ? `<div style="font-size:8px;color:#555;">${esc(profesional.titulo)}</div>` : ''}
        ${profesional?.licencia ? `<div style="font-size:8px;color:#777;">Lic. ${esc(profesional.licencia)}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="page page-break">
    <h2 class="section-title">1. Matriz de Evaluaciones Médicas (I-P-R-PI-RL)</h2>
    <table class="matriz">
      <colgroup>
        <col style="width:8%"><col style="width:8%"><col style="width:17%"><col style="width:15%">
        ${EXAMENES.map(() => '<col style="width:6%">').join('')}
        <col style="width:8%">
      </colgroup>
      <thead><tr>
        <th>Grupo Ocupacional</th><th>Cargo</th><th>Perfil del Cargo</th><th>Peligros y Riesgos</th>
        ${EXAMENES.map((e) => `<th>${e.label}</th>`).join('')}
        <th>Otros Labs</th>
      </tr></thead>
      <tbody>${matrizRows}</tbody>
    </table>
    <div style="margin-top:8px;display:flex;gap:16px;justify-content:center;font-size:8px;font-weight:700;text-transform:uppercase;">
      <span>I: Ingreso</span><span>P: Periódico</span><span>R: Retiro</span><span>PI: Post-Incapacidad</span><span>RL: Retorno Laboral</span>
    </div>
    <div style="margin-top:16px;">
      <div style="background:#0f172a;color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-weight:700;text-transform:uppercase;font-size:9px;">
        Fundamentación Técnica de la Conducta Médica
      </div>
      <div style="border:1px solid #ddd;border-top:none;border-radius:0 0 8px 8px;padding:0 12px;">${fundamentacionBlocks}</div>
    </div>
  </div>

  <div class="page page-break">
    <h2 class="section-title">2. Recomendaciones y Restricciones Laborales</h2>
    <p style="color:#777;text-transform:uppercase;font-size:8px;font-weight:700;margin-top:-10px;">Según Res. 1843/2025, se omiten conceptos de "No Apto".</p>
    ${restriccionesBlocks}
  </div>

  <div class="page page-break">
    <h2 class="section-title">3. Descripción de Pruebas</h2>
    <div class="grid2">${pruebasBlocks}</div>
  </div>

  <div class="page page-break">
    <h2 class="section-title">4. Marco Normativo Vigente</h2>
    <div class="grid2">${legalBlocks}</div>
  </div>
</body>
</html>`;
}

function buildOrdenHtml(data: OrdenData): string {
  const { orden, empresa } = data;
  const examenes: string[] = (() => {
    try { return JSON.parse(orden.examenes_json as string) as string[]; } catch { return []; }
  })();
  const rows = examenes.length
    ? examenes.map((e) => `<tr><td style="padding:8px;border:1px solid #ccc;">${esc(e)}</td><td style="padding:8px;border:1px solid #ccc;width:100px;"></td></tr>`).join('')
    : `<tr><td colspan="2" style="padding:12px;text-align:center;color:#999;">Sin exámenes seleccionados.</td></tr>`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 20mm; color: #111; }
  h1 { font-family: Georgia, serif; font-size: 20px; text-transform: uppercase; margin-bottom: 2px; }
  .sub { color: #777; font-size: 10px; text-transform: uppercase; font-weight: 700; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #ccc; }
</style>
</head>
<body>
  <h1>Orden de Servicio Clínico</h1>
  <div class="sub">Res. 1843 de 2025 - MinTrabajo</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid #ccc;border-radius:8px;padding:14px;background:#f9fafb;">
    <div><span style="display:block;font-size:9px;color:#888;text-transform:uppercase;">Empresa</span><b>${esc(empresa.nombre)}</b></div>
    <div><span style="display:block;font-size:9px;color:#888;text-transform:uppercase;">Motivo</span><b>${esc(orden.tipo_momento)}</b></div>
    <div><span style="display:block;font-size:9px;color:#888;text-transform:uppercase;">Paciente</span><b>${esc(orden.candidato_nombre) || '________________'}</b></div>
    <div><span style="display:block;font-size:9px;color:#888;text-transform:uppercase;">Documento</span><b>${esc(orden.candidato_id) || '________________'}</b></div>
  </div>
  <h3 style="text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:6px;">Panel Clínico Autorizado</h3>
  <table>
    <thead><tr><th>Examen / Prueba</th><th>Firma</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

async function pdfFromHtml(
  browser: Fetcher,
  html: string,
  landscape = false
): Promise<ArrayBuffer> {
  const b    = await puppeteer.launch(browser);
  const page = await b.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdfData = await page.pdf({ format: 'letter', landscape, printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await page.close();
  await b.close();
  const arr = pdfData as unknown as Uint8Array;
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

export async function generateProfesiogramaPdf(
  browser: Fetcher,
  data: PdfData
): Promise<ArrayBuffer> {
  return pdfFromHtml(browser, buildProfesiogramaHtml(data), true);
}

export async function generateOrdenPdf(
  browser: Fetcher,
  data: OrdenData
): Promise<ArrayBuffer> {
  return pdfFromHtml(browser, buildOrdenHtml(data), false);
}
