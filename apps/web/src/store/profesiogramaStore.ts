import { create } from 'zustand';
import type { CargoProfesiograma } from '@profesiograma/shared-types';

interface EmpresaInfo {
  nombre: string;
  nit: string;
  fecha: string;
  responsable: string;
  logo?: string;
}

interface ProfesionalInfo {
  nombre: string;
  cedula: string;
  titulo: string;
  licencia: string;
  celular: string;
  correo: string;
}

interface ProfesiogramaState {
  jobsList: string[];
  addJob: (job: string) => void;
  removeJob: (index: number) => void;

  generatedData: CargoProfesiograma[];
  setGeneratedData: (data: CargoProfesiograma[]) => void;
  updateCargo: (index: number, path: string, value: unknown) => void;
  toggleMomento: (index: number, examKey: string, momentoKey: string, value: boolean) => void;

  isLoading: boolean;
  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;

  empresaInfo: EmpresaInfo;
  setEmpresaInfo: (partial: Partial<EmpresaInfo>) => void;
  profesionalInfo: ProfesionalInfo;
  setProfesionalInfo: (partial: Partial<ProfesionalInfo>) => void;

  logoStyles: { size: number; align: 'left' | 'center' | 'right'; marginY: number };
  setLogoStyles: (partial: Partial<{ size: number; align: 'left' | 'center' | 'right'; marginY: number }>) => void;

  /** IDs reales en D1 una vez que el profesiograma actual se guardó. */
  savedRecord: { empresaId: string; profesionalId: string; profesiogramaId: string; cargoIds: Record<string, string> } | null;
  setSavedRecord: (record: ProfesiogramaState['savedRecord']) => void;
}

function setByPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone: Record<string, unknown> = { ...obj };
  let cursor = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    cursor[key] = { ...(cursor[key] as Record<string, unknown> | undefined) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}

export const useProfesiogramaStore = create<ProfesiogramaState>((set) => ({
  jobsList: [],
  addJob: (job) => set((s) => ({ jobsList: [...s.jobsList, job] })),
  removeJob: (index) => set((s) => ({ jobsList: s.jobsList.filter((_, i) => i !== index) })),

  generatedData: [],
  setGeneratedData: (data) => set({ generatedData: data, savedRecord: null }),
  updateCargo: (index, path, value) =>
    set((s) => ({
      generatedData: s.generatedData.map((row, i) =>
        i === index ? setByPath(row as unknown as Record<string, unknown>, path, value) as unknown as CargoProfesiograma : row
      ),
    })),
  toggleMomento: (index, examKey, momentoKey, value) =>
    set((s) => ({
      generatedData: s.generatedData.map((row, i) => {
        if (i !== index) return row;
        const matriz = { ...(row.matriz as unknown as Record<string, Record<string, boolean>>) };
        matriz[examKey] = { ...(matriz[examKey] ?? {}), [momentoKey]: value };
        return { ...row, matriz: matriz as unknown as CargoProfesiograma['matriz'] };
      }),
    })),

  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),
  error: null,
  setError: (v) => set({ error: v }),

  empresaInfo: { nombre: '', nit: '', fecha: '', responsable: '' },
  setEmpresaInfo: (partial) => set((s) => ({ empresaInfo: { ...s.empresaInfo, ...partial } })),
  profesionalInfo: { nombre: '', cedula: '', titulo: '', licencia: '', celular: '', correo: '' },
  setProfesionalInfo: (partial) => set((s) => ({ profesionalInfo: { ...s.profesionalInfo, ...partial } })),

  logoStyles: { size: 96, align: 'center', marginY: 0 },
  setLogoStyles: (partial) => set((s) => ({ logoStyles: { ...s.logoStyles, ...partial } })),

  savedRecord: null,
  setSavedRecord: (record) => set({ savedRecord: record }),
}));
