import puppeteer from '@cloudflare/puppeteer';
import type { Env } from '../types/env';

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MOMENTOS = ['I', 'P', 'R', 'PI', 'RL'] as const;
const MOMENTO_LABELS: Record<string, string> = {
  I: 'Ingreso', P: 'Periódico', R: 'Retiro', PI: 'Post-incapacidad', RL: 'Reintegro laboral'
};

export async function renderProfesiogramaPdf(env: Env, data: {
  id: string;
  empresa_nombre: string;
  nit?: string;
  responsable_sg_sst?: string;
  profesional_nombre?: string;
  profesional_licencia?: string;
  fecha_emision?: string;
  version: number;
  cargos: Array<{
    grupo_ocupacional?: string;
    cargo: string;
    perfil_descripcion?: string;
    peligros_riesgos?: string;
    matriz_json: string;
    recomendaciones_json?: string;
  }>;
}): Promise<Uint8Array> {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();

    const cargoRows = data.cargos.map((c, i) => {
      let matriz: Record<string, Record<string, boolean>> = {};
      try { matriz = JSON.parse(c.matriz_json); } catch { /* ignore */ }
      const examenesNames = Object.keys(matriz);
      const matrizCells = examenesNames.map(ex => {
        const checks = MOMENTOS.map(m =>
          `<td style="text-align:center">${matriz[ex]?.[m] ? '✔' : ''}</td>`
        ).join('');
        return `<tr><td>${esc(i + 1 === 1 ? c.cargo : '')}</td><td>${esc(ex)}</td>${checks}</tr>`;
      }).join('');
      return matrizCells || `<tr><td colspan="7">${esc(c.cargo)}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #1e293b; }
  .wrap { padding: 10mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 4mm; margin-bottom: 5mm; }
  .header-title { font-size: 16pt; font-weight: 700; letter-spacing: 1px; }
  .header-meta { font-size: 8pt; color: #475569; text-align: right; }
  h2 { font-size: 10pt; margin: 4mm 0 2mm; background: #f1f5f9; padding: 2mm 3mm; border-left: 3px solid #0ea5e9; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  th, td { border: 1px solid #cbd5e1; padding: 2mm 3mm; font-size: 8pt; vertical-align: middle; }
  th { background: #0f172a; color: #f8fafc; font-weight: 600; text-align: center; }
  tr:nth-child(even) td { background: #f8fafc; }
  .legal { font-size: 7.5pt; color: #475569; line-height: 1.5; margin-top: 4mm; border-top: 1px solid #e2e8f0; padding-top: 3mm; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin-top: 10mm; }
  .sign-line { border-top: 1px solid #0f172a; padding-top: 2mm; font-size: 8pt; }
  .badge { display: inline-block; background: #0ea5e9; color: #fff; padding: 1mm 3mm; border-radius: 2mm; font-size: 7pt; margin-bottom: 2mm; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <div class="header-title">PROFESIOGRAMA</div>
      <div style="font-size:9pt;margin-top:1mm;">${esc(data.empresa_nombre)}${data.nit ? ` · NIT ${esc(data.nit)}` : ''}</div>
    </div>
    <div class="header-meta">
      <div>Fecha emisión: ${esc(data.fecha_emision ?? new Date().toLocaleDateString('es-CO'))}</div>
      <div>Versión: ${esc(data.version)}</div>
      <div>Elaborado: ${esc(data.profesional_nombre ?? 'Médico Ocupacional')}</div>
      ${data.profesional_licencia ? `<div>Lic. Salud Ocup.: ${esc(data.profesional_licencia)}</div>` : ''}
    </div>
  </div>

  <h2>Matriz de Exámenes Médico-Ocupacionales</h2>
  <table>
    <thead>
      <tr>
        <th>Cargo</th>
        <th>Examen</th>
        ${MOMENTOS.map(m => `<th title="${MOMENTO_LABELS[m]}">${m}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${cargoRows}</tbody>
  </table>

  <div class="legal">
    <strong>Leyenda:</strong>
    ${MOMENTOS.map(m => `<strong>${m}</strong> = ${MOMENTO_LABELS[m]}`).join(' &nbsp;|&nbsp; ')}<br/>
    <strong>Marco legal:</strong> Resolución 2346 de 2007, Resolución 1843 de 2025,
    Decreto 1072 de 2015 (SGSST), Ley 1562 de 2012, Sentencia T-202 de 2024 CSJ.
  </div>

  <div class="signs">
    <div class="sign-line">
      ${esc(data.responsable_sg_sst ?? 'Responsable SG-SST')}<br/>
      <span style="color:#64748b">Responsable SG-SST</span>
    </div>
    <div class="sign-line">
      ${esc(data.profesional_nombre ?? 'Médico Ocupacional')}<br/>
      <span style="color:#64748b">Médico Elaborador</span>
      ${data.profesional_licencia ? `<br/><span style="color:#64748b">Lic: ${esc(data.profesional_licencia)}</span>` : ''}
    </div>
  </div>
</div>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      landscape: true,
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '12mm', left: '8mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="font-size:7pt;width:100%;padding:0 8mm;color:#64748b;
display:flex;justify-content:space-between;">
<span>Profesiograma — ${esc(data.empresa_nombre)}</span>
<span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
