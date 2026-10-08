import { describe, it, expect } from 'vitest';
import { parseCsv, decodeCsvBytes } from './csv';

describe('parseCsv', () => {
  it('lee filas separadas por coma', () => {
    expect(parseCsv('Cargo,Área\nConductor,Operaciones')).toEqual([['Cargo', 'Área'], ['Conductor', 'Operaciones']]);
  });

  it('detecta punto y coma (Excel en español)', () => {
    expect(parseCsv('Item;Cargo\n1;Conductor\n2;Soldador')).toEqual([['Item', 'Cargo'], ['1', 'Conductor'], ['2', 'Soldador']]);
  });

  it('respeta comillas con separadores y saltos de línea dentro', () => {
    expect(parseCsv('Cargo,Nota\n"Auxiliar, bodega","línea1\nlínea2"\n"Dice ""hola""",x'))
      .toEqual([['Cargo', 'Nota'], ['Auxiliar, bodega', 'línea1\nlínea2'], ['Dice "hola"', 'x']]);
  });

  it('soporta CRLF, BOM y líneas vacías finales', () => {
    expect(parseCsv('﻿Cargo\r\nConductor\r\n\r\n')).toEqual([['Cargo'], ['Conductor']]);
  });

  it('devuelve vacío para texto vacío', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('decodeCsvBytes', () => {
  it('decodifica UTF-8', () => {
    expect(decodeCsvBytes(new TextEncoder().encode('Ocupación'))).toBe('Ocupación');
  });

  it('cae a Windows-1252 cuando los bytes no son UTF-8 válido (CSV de Excel)', () => {
    // "Ocupación" en Windows-1252: la "ó" es el byte 0xF3
    const bytes = new Uint8Array([0x4f, 0x63, 0x75, 0x70, 0x61, 0x63, 0x69, 0xf3, 0x6e]);
    expect(decodeCsvBytes(bytes)).toBe('Ocupación');
  });
});
