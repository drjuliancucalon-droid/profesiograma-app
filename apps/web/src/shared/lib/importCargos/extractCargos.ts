/** Máximo de cargos que se aceptan por archivo. */
export const MAX_CARGOS = 100;
/** Mismo tope que valida el servidor para el campo `cargo` (schemas.ts). */
export const MAX_CARGO_LENGTH = 500;

/** Una línea suelta (Word/PDF) solo cuenta como cargo si es corta, salvo que venga con viñeta o numeración. */
const MAX_PLAIN_LINE_LENGTH = 70;
const MAX_PLAIN_LINE_WORDS = 8;
const MAX_MARKED_LINE_WORDS = 12;

const BULLET_PREFIX = /^\s*(?:[•·▪●○◦‣⁃*\-–—]+|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)])\s+/;
const HEADER_WORDS = [
  'cargo', 'cargos', 'puesto', 'puestos', 'ocupacion', 'ocupaciones', 'posicion', 'posiciones',
  'nombre del cargo', 'nombre cargo', 'denominacion del cargo', 'puesto de trabajo', 'cargo/puesto',
  'cargo o puesto', 'listado de cargos', 'lista de cargos',
];
const GENERIC_HEADERS = ['item', 'items', 'n', 'no', 'nro', 'numero', 'nombre', 'descripcion', 'area', 'listado', 'lista', '#'];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[°º.:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isHeaderWord(text: string): boolean {
  return HEADER_WORDS.includes(normalize(text));
}

function isNumeric(text: string): boolean {
  return /^[\d\s.,%-]+$/.test(text.trim());
}

/** Limpia, deduplica (sin distinguir mayúsculas) y descarta lo ya existente. */
export function cleanCargos(candidates: string[], existing: string[] = []): string[] {
  const seen = new Set(existing.map((c) => c.trim().toLowerCase()));
  const result: string[] = [];
  for (const raw of candidates) {
    const cleaned = raw.replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length > MAX_CARGO_LENGTH) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= MAX_CARGOS) break;
  }
  return result;
}

/** ¿Alguna de las primeras filas tiene un encabezado tipo "Cargo/Puesto/Ocupación"? */
export function hasCargoHeader(rows: string[][]): boolean {
  return rows.slice(0, 15).some((row) => row.some((c) => isHeaderWord((c ?? '').toString())));
}

export interface PositionedText {
  str: string;
  x: number;
  y: number;
}

const SAME_LINE_TOLERANCE = 3;

/** Reconstruye líneas de texto a partir de fragmentos con posición (PDF): agrupa por altura y ordena de izquierda a derecha. */
export function linesFromTextItems(items: PositionedText[]): string[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedText[][] = [];
  for (const item of sorted) {
    const current = lines[lines.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= SAME_LINE_TOLERANCE) current.push(item);
    else lines.push([item]);
  }
  return lines.map((line) => line.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(' '));
}

/** Extrae cargos de una tabla (Excel/CSV/tabla de Word): columna con encabezado "Cargo", o la primera con texto. */
export function cargosFromRows(rows: string[][]): string[] {
  const cells = rows.map((row) => row.map((c) => (c ?? '').toString().trim()));

  for (let r = 0; r < Math.min(cells.length, 15); r++) {
    const col = cells[r].findIndex((c) => isHeaderWord(c));
    if (col >= 0) {
      return cleanCargos(cells.slice(r + 1).map((row) => row[col] ?? '').filter((c) => !isNumeric(c)));
    }
  }

  const width = Math.max(0, ...cells.map((row) => row.length));
  for (let col = 0; col < width; col++) {
    const values = cells
      .map((row) => row[col] ?? '')
      .filter((c) => c && !isNumeric(c) && !GENERIC_HEADERS.includes(normalize(c)));
    if (values.length) return cleanCargos(values);
  }
  return [];
}

/** Extrae cargos de líneas de texto libre (Word/PDF): viñetas, numeración y líneas cortas. */
export function cargosFromLines(lines: string[]): string[] {
  const candidates: string[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (!text || isHeaderWord(text)) continue;
    const hasMarker = BULLET_PREFIX.test(text);
    const body = text.replace(BULLET_PREFIX, '').trim();
    if (!body || isNumeric(body) || isHeaderWord(body)) continue;
    const words = body.split(/\s+/).length;
    const looksLikeSentence = /[.;:]$/.test(body) || body.length > MAX_PLAIN_LINE_LENGTH || words > MAX_PLAIN_LINE_WORDS;
    const accepted = hasMarker
      ? body.length <= MAX_CARGO_LENGTH && words <= MAX_MARKED_LINE_WORDS
      : !looksLikeSentence;
    if (accepted) candidates.push(body);
  }
  return cleanCargos(candidates);
}
