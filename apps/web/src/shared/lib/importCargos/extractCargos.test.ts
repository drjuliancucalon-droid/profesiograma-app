import { describe, it, expect } from 'vitest';
import { cleanCargos, cargosFromRows, cargosFromLines, hasCargoHeader, linesFromTextItems, MAX_CARGOS } from './extractCargos';

describe('hasCargoHeader', () => {
  it('detecta encabezados de cargo y descarta tablas sin ellos', () => {
    expect(hasCargoHeader([['Item', 'Cargo'], ['1', 'Conductor']])).toBe(true);
    expect(hasCargoHeader([['Empresa', 'ACME'], ['NIT', '900123456']])).toBe(false);
  });
});

describe('linesFromTextItems', () => {
  it('agrupa por altura, ordena de arriba a abajo y de izquierda a derecha', () => {
    const items = [
      { str: 'Conductor', x: 50, y: 700 },
      { str: '1.', x: 20, y: 700.5 },
      { str: 'Soldador', x: 50, y: 680 },
      { str: '  ', x: 10, y: 600 },
    ];
    expect(linesFromTextItems(items)).toEqual(['1. Conductor', 'Soldador']);
  });
});

describe('cleanCargos', () => {
  it('quita viñetas, numeración y espacios sobrantes', () => {
    expect(cleanCargos(['• Conductor', '  2.  Auxiliar   Administrativo ', '- Operario', '3) Soldador', 'a) Secretaria']))
      .toEqual(['Conductor', 'Auxiliar Administrativo', 'Operario', 'Soldador', 'Secretaria']);
  });

  it('elimina vacíos y duplicados sin distinguir mayúsculas', () => {
    expect(cleanCargos(['Conductor', 'conductor', '', '   ', 'CONDUCTOR '])).toEqual(['Conductor']);
  });

  it('omite los cargos que ya están en la lista existente', () => {
    expect(cleanCargos(['Conductor', 'Soldador'], ['conductor'])).toEqual(['Soldador']);
  });

  it('descarta textos más largos que el máximo que acepta el servidor', () => {
    expect(cleanCargos(['x'.repeat(501), 'Conductor'])).toEqual(['Conductor']);
  });

  it('limita la cantidad de cargos devueltos', () => {
    const many = Array.from({ length: MAX_CARGOS + 20 }, (_, i) => `Cargo ${i}`);
    expect(cleanCargos(many)).toHaveLength(MAX_CARGOS);
  });
});

describe('cargosFromRows', () => {
  it('usa la columna cuyo encabezado es "Cargo"', () => {
    const rows = [
      ['Item', 'Área', 'Cargo'],
      ['1', 'Operaciones', 'Conductor'],
      ['2', 'Admin', 'Auxiliar Administrativo'],
    ];
    expect(cargosFromRows(rows)).toEqual(['Conductor', 'Auxiliar Administrativo']);
  });

  it('reconoce encabezados con tildes y variantes (Ocupación, Puesto)', () => {
    expect(cargosFromRows([['Ocupación'], ['Soldador'], ['Operario']])).toEqual(['Soldador', 'Operario']);
    expect(cargosFromRows([['N°', 'Puesto de trabajo'], ['1', 'Vigilante']])).toEqual(['Vigilante']);
  });

  it('encuentra el encabezado aunque no esté en la primera fila', () => {
    const rows = [['Listado de cargos 2026'], [''], ['Cargo'], ['Conductor']];
    expect(cargosFromRows(rows)).toEqual(['Conductor']);
  });

  it('sin encabezado reconocible usa la primera columna con texto e ignora números', () => {
    const rows = [['1', 'Conductor'], ['2', 'Soldador']];
    expect(cargosFromRows(rows)).toEqual(['Conductor', 'Soldador']);
  });

  it('devuelve vacío si no hay datos', () => {
    expect(cargosFromRows([])).toEqual([]);
    expect(cargosFromRows([[''], ['']])).toEqual([]);
  });
});

describe('cargosFromLines', () => {
  it('conserva viñetas y líneas cortas, descarta oraciones largas', () => {
    const lines = [
      'Profesiograma de la empresa ACME S.A.S. para el año en curso, elaborado según la norma vigente.',
      '• Conductor',
      '• Auxiliar de bodega',
      '1. Soldador',
      'Los cargos listados a continuación aplican para todas las sedes.',
      'Operario de máquina',
    ];
    expect(cargosFromLines(lines)).toEqual(['Conductor', 'Auxiliar de bodega', 'Soldador', 'Operario de máquina']);
  });

  it('descarta encabezados genéricos como "Cargos"', () => {
    expect(cargosFromLines(['Cargos', 'Conductor'])).toEqual(['Conductor']);
  });
});
