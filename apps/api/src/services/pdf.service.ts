import puppeteer from '@cloudflare/puppeteer';

interface PdfData {
  profesiograma: Record<string, unknown>;
  empresa: Record<string, unknown>;
  cargos: Array<Record<string, unknown>>;
}

const MOMENTOS = ['I', 'P', 'R', 'PI', 'RL'] as const;
const EXAMENES = [
  'fisico', 'osteomuscular', 'psicosensometrico', 'audiometria',
  'visiometria', 'electrocardiograma', 'glicemia', 'perfillipidico',
] as const;

function buildHtml(data: PdfData): string {
  const { empresa, cargos } = data;
  const rows = cargos.map(cargo => {
    const matriz = JSON.parse((cargo.matriz_json as string) ?? '{}') as Record<string, Record<string, boolean>>;
    const cells = EXAMENES.map(ex => {
      const m = matriz[ex] ?? {};
      return `<td>${MOMENTOS.map(mo => m[mo] ? `<span class="dot">${mo}</span>` : '').join('')}</td>`;
    }).join('');
    return `<tr><td>${cargo.cargo ?? ''}</td><td>${cargo.grupo_ocupacional ?? ''}</td>${cells}</tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; }
  h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
  .empresa { text-align: center; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; vertical-align: top; }
  th { background: #1e3a5f; color: white; font-size: 10px; }
  td:first-child, td:nth-child(2) { text-align: left; }
  .dot { display: inline-block; background: #1e3a5f; color: white; border-radius: 3px;
         padding: 1px 4px; margin: 1px; font-size: 9px; }
  @page { size: A4 landscape; margin: 15mm; }
</style>
</head>
<body>
  <h1>PROFESIOGRAMA</h1>
  <div class="empresa">
    <strong>${empresa.nombre ?? ''}</strong> — NIT: ${empresa.nit ?? 'N/A'}
  </div>
  <table>
    <thead>
      <tr>
        <th>Cargo</th>
        <th>Grupo Ocupacional</th>
        ${EXAMENES.map(e => `<th>${e.charAt(0).toUpperCase() + e.slice(1)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export async function generateProfesiogramaPdf(
  browser: Fetcher,
  data: PdfData
): Promise<ArrayBuffer> {
  const b = await puppeteer.launch(browser);
  const page = await b.newPage();
  await page.setContent(buildHtml(data), { waitUntil: 'networkidle0' });
  const pdfData = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
  await page.close();
  await b.close();
  // Uint8Array → ArrayBuffer propio (evita byteOffset != 0 en buffers compartidos)
  const arr = pdfData as unknown as Uint8Array;
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}
