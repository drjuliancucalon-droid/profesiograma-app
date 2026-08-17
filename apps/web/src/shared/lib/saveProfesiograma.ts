import { api } from './api';
import type { CargoProfesiograma } from '@profesiograma/shared-types';

interface Empresa { id: string; nombre: string; nit: string | null }

interface EmpresaInfo { nombre: string; nit: string; fecha: string; responsable: string }
interface ProfesionalInfo { nombre: string; cedula: string; titulo: string; licencia: string; celular: string; correo: string }

export interface SavedRecord {
  empresaId: string;
  profesionalId: string;
  profesiogramaId: string;
  cargoIds: Record<string, string>;
}

/** Busca o crea la empresa y el profesional, y persiste el profesiograma con sus cargos. */
export async function guardarProfesiograma(
  empresaInfo: EmpresaInfo,
  profesionalInfo: ProfesionalInfo,
  generatedData: CargoProfesiograma[]
): Promise<SavedRecord> {
  if (!empresaInfo.nombre.trim()) {
    throw new Error('Ingresa el nombre de la empresa antes de guardar (pestaña Configuración).');
  }
  if (!generatedData.length) {
    throw new Error('No hay cargos generados para guardar.');
  }

  // 1. Buscar o crear la empresa
  const listRes = await api.get<{ success: boolean; data?: Empresa[] }>('/empresas');
  const existing = listRes.data?.find((e) =>
    (empresaInfo.nit && e.nit && e.nit.trim() === empresaInfo.nit.trim()) ||
    (!empresaInfo.nit && e.nombre.trim().toLowerCase() === empresaInfo.nombre.trim().toLowerCase())
  );
  let empresaId = existing?.id;
  if (!empresaId) {
    const createRes = await api.post<{ success: boolean; id?: string; error?: string }>('/empresas', {
      nombre: empresaInfo.nombre,
      nit: empresaInfo.nit || undefined,
      responsable: empresaInfo.responsable || undefined,
    });
    if (!createRes.success || !createRes.id) throw new Error(createRes.error ?? 'No se pudo crear la empresa');
    empresaId = createRes.id;
  }

  // 2. Buscar o crear el profesional (el backend lo requiere siempre)
  const profRes = await api.post<{ success: boolean; id?: string; error?: string }>('/profesionales', {
    nombre: profesionalInfo.nombre.trim() || 'No especificado',
    cedula: profesionalInfo.cedula || undefined,
    titulo: profesionalInfo.titulo || undefined,
    licencia: profesionalInfo.licencia || undefined,
    celular: profesionalInfo.celular || undefined,
    correo: profesionalInfo.correo || undefined,
  });
  if (!profRes.success || !profRes.id) throw new Error(profRes.error ?? 'No se pudo guardar el profesional');
  const profesionalId = profRes.id;

  // 3. Guardar el profesiograma con los cargos generados
  const saveRes = await api.post<{ success: boolean; id?: string; cargos?: Array<{ id: string; cargo: string }>; error?: string }>('/profesiograma', {
    empresa_id: empresaId,
    profesional_id: profesionalId,
    fecha_emision: empresaInfo.fecha || undefined,
    cargos_data: generatedData,
  });
  if (!saveRes.success || !saveRes.id) throw new Error(saveRes.error ?? 'No se pudo guardar el profesiograma');

  const cargoIds: Record<string, string> = {};
  for (const c of saveRes.cargos ?? []) cargoIds[c.cargo] = c.id;

  return { empresaId, profesionalId, profesiogramaId: saveRes.id, cargoIds };
}
