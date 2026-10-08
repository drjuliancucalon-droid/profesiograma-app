import {
  cargosFromLines, cargosFromRows, cleanCargos, hasCargoHeader, linesFromTextItems,
  type PositionedText,
} from './extractCargos';
import { decodeCsvBytes, parseCsv } from './csv';
import type { SheetData } from 'read-excel-file/browser';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Tope de texto que se envía a la IA (coincide con el límite del endpoint). */
export const MAX_AI_TEXT_CHARS = 30_000;
const MAX_PDF_PAGES = 50;

export type FileKind = 'xlsx' | 'csv' | 'docx' | 'pdf';

export interface ImportResult {
  kind: FileKind;
  /** Cargos detectados por reglas (puede estar vacío). */
  cargos: string[];
  /** Texto plano del documento, recortado, por si el usuario pide análisis con IA. */
  text: string;
}

/** Error con mensaje apto para mostrar directamente al usuario. */
export class ImportError extends Error {}

const UNSUPPORTED_LEGACY: Record<string, string> = {
  xls: 'Los archivos .xls (Excel antiguo) no se pueden leer. Ábrelo en Excel y guárdalo como .xlsx.',
  doc: 'Los archivos .doc (Word antiguo) no se pueden leer. Ábrelo en Word y guárdalo como .docx.',
};

export function detectKind(fileName: string): FileKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx') return 'xlsx';
  if (ext === 'csv') return 'csv';
  if (ext === 'docx') return 'docx';
  if (ext === 'pdf') return 'pdf';
  throw new ImportError(UNSUPPORTED_LEGACY[ext] ?? 'Formato no compatible. Usa Excel (.xlsx), CSV, Word (.docx) o PDF.');
}

function toText(rows: string[][]): string {
  return rows.map((r) => r.filter(Boolean).join(' | ')).filter(Boolean).join('\n').slice(0, MAX_AI_TEXT_CHARS);
}

async function readXlsx(buffer: ArrayBuffer): Promise<ImportResult> {
  const { readSheet } = await import('read-excel-file/browser');
  let sheet: SheetData;
  try {
    sheet = await readSheet(buffer);
  } catch {
    throw new ImportError('No se pudo leer el Excel. Verifica que el archivo no esté dañado ni protegido con contraseña.');
  }
  const rows = sheet.map((row) => row.map((cell) => (cell == null ? '' : String(cell).trim())));
  return { kind: 'xlsx', cargos: cargosFromRows(rows), text: toText(rows) };
}

async function readCsv(buffer: ArrayBuffer): Promise<ImportResult> {
  const rows = parseCsv(decodeCsvBytes(new Uint8Array(buffer)));
  return { kind: 'csv', cargos: cargosFromRows(rows), text: toText(rows) };
}

function elementText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

async function readDocx(buffer: ArrayBuffer): Promise<ImportResult> {
  const mammoth = await import('mammoth/mammoth.browser');
  let html: string;
  try {
    html = (await mammoth.convertToHtml({ arrayBuffer: buffer })).value;
  } catch {
    throw new ImportError('No se pudo leer el Word. Verifica que sea un .docx válido y no esté protegido con contraseña.');
  }

  // El HTML solo se analiza para extraer texto; nunca se inserta en la página.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const fromTables: string[] = [];
  const tableRowsAll: string[][] = [];

  doc.querySelectorAll('table').forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('th,td')).map(elementText));
    tableRowsAll.push(...rows);
    // Solo se confía en una tabla si tiene un encabezado de cargo; las demás (datos de la empresa, etc.) se ignoran.
    if (hasCargoHeader(rows)) fromTables.push(...cargosFromRows(rows));
    table.remove();
  });

  const lines: string[] = [];
  doc.body.querySelectorAll('p,li,h1,h2,h3,h4').forEach((el) => {
    const text = elementText(el);
    if (text) lines.push(el.tagName === 'LI' ? `• ${text}` : text);
  });

  const cargos = cleanCargos([...fromTables, ...cargosFromLines(lines)]);
  const text = [...lines, toText(tableRowsAll)].filter(Boolean).join('\n').slice(0, MAX_AI_TEXT_CHARS);
  return { kind: 'docx', cargos, text };
}

async function readPdf(buffer: ArrayBuffer): Promise<ImportResult> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (err) {
    const isProtected = err instanceof Error && err.name === 'PasswordException';
    throw new ImportError(isProtected
      ? 'El PDF está protegido con contraseña.'
      : 'No se pudo leer el PDF. Verifica que no esté dañado.');
  }

  const allLines: string[] = [];
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  for (let p = 1; p <= pages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: PositionedText[] = content.items.flatMap((item) =>
      'str' in item ? [{ str: item.str, x: item.transform[4], y: item.transform[5] }] : []
    );
    allLines.push(...linesFromTextItems(items));
  }

  if (!allLines.length) {
    throw new ImportError('El PDF no tiene texto seleccionable (parece escaneado como imagen). Usa una versión con texto, Word o Excel.');
  }
  return { kind: 'pdf', cargos: cargosFromLines(allLines), text: allLines.join('\n').slice(0, MAX_AI_TEXT_CHARS) };
}

/** Lee un archivo y devuelve los cargos detectados por reglas más el texto para análisis opcional con IA. */
export async function readCargosFromFile(file: File): Promise<ImportResult> {
  const kind = detectKind(file.name);
  if (file.size === 0) throw new ImportError('El archivo está vacío.');
  if (file.size > MAX_FILE_BYTES) throw new ImportError('El archivo supera el máximo de 5 MB.');

  const buffer = await file.arrayBuffer();
  switch (kind) {
    case 'xlsx': return readXlsx(buffer);
    case 'csv': return readCsv(buffer);
    case 'docx': return readDocx(buffer);
    case 'pdf': return readPdf(buffer);
  }
}
