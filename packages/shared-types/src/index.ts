// ============================================================
// SHARED TYPES — Profesiograma SST
// Compartidos entre apps/web y apps/api
// ============================================================

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'medico' | 'sst_empresa' | 'rrhh';
  empresa_id?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  responsable: string;
  logo_url?: string;
  created_at: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  cedula: string;
  titulo: string;
  licencia: string;
  celular: string;
  correo: string;
  user_id: string;
}

export interface MomentoMatrix {
  I: boolean;   // Ingreso
  P: boolean;   // Periódico
  R: boolean;   // Retiro
  PI: boolean;  // Post-Incapacidad
  RL: boolean;  // Retorno Laboral
}

export interface MatrizExamenes {
  fisico: MomentoMatrix;
  osteomuscular: MomentoMatrix;
  psicosensometrico: MomentoMatrix;
  audiometria: MomentoMatrix;
  visiometria: MomentoMatrix;
  electrocardiograma: MomentoMatrix;
  glicemia: MomentoMatrix;
  perfil_lipidico: MomentoMatrix;
  laboratorio: string;
}

export interface MatrizObservaciones {
  fisico?: string;
  osteomuscular?: string;
  psicosensometrico?: string;
  audiometria?: string;
  visiometria?: string;
  electrocardiograma?: string;
  glicemia?: string;
  perfil_lipidico?: string;
  laboratorio?: string;
}

export interface FundamentacionTecnica {
  por_que_momentos: string;
  obligatorios: string[];
  electivos: string[];
}

export interface RecomendacionRestriccion {
  factor_riesgo: string;
  condicion: string;
  recomendaciones: string;
  restricciones: string;
  temporalidad: string;
  seguimiento: string;
}

export interface CargoProfesiograma {
  id?: string;
  grupo_ocupacional: string;
  cargo: string;
  perfil_cargo: {
    descripcion: string;
    competencias: string;
    requisitos_fisicos: string;
  };
  peligros_riesgos: string;
  matriz: MatrizExamenes;
  matriz_observaciones: MatrizObservaciones;
  fundamentacion_tecnica: FundamentacionTecnica;
  recomendaciones_restricciones: RecomendacionRestriccion[];
}

export interface Profesiograma {
  id?: string;
  empresa_id: string;
  profesional_id: string;
  fecha: string;
  version: number;
  cargos: CargoProfesiograma[];
  estado: 'borrador' | 'emitido' | 'vigente' | 'vencido';
  created_at?: string;
  updated_at?: string;
}

export interface GenerarProfesiogramaRequest {
  cargos: string[];
  empresa_id: string;
  modo: 'rapido' | 'sofisticado';
}

export interface GenerarOrdenRequest {
  cargo: string;
  tipo: 'I' | 'P' | 'R' | 'PI' | 'RL';
  candidato: { nombre: string; id: string };
  examenes_activos: string[];
  empresa_id: string;
  profesional_id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
