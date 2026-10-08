const DELIMITERS = [',', ';', '\t'] as const;

/** Decodifica bytes de un CSV: UTF-8 si es válido; si no, Windows-1252 (lo que guarda Excel en español). */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let best: string = DELIMITERS[0];
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** Parser CSV mínimo con soporte de comillas, CRLF, BOM y separador `,` `;` o tabulación. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  if (!text.trim()) return [];
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) endRow();
  return rows;
}
