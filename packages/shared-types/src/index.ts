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
  perfillipidico: MomentoMatrix;
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
  perfillipidico?: string;
  laboratorio?: string;
}

export interface FundamentacionTecnica {
  porqueMomentos: string;
  obligatorios: string[];
  electivos: string[];
}

export interface RecomendacionRestriccion {
  factorRiesgo: string;
  condicion: string;
  recomendaciones: string;
  restricciones: string;
  temporalidad: string;
  seguimiento: string;
}

export interface CargoProfesiograma {
  id?: string;
  grupoOcupacional: string;
  cargo: string;
  perfilCargo: {
    descripcion: string;
    competencias: string;
    requisitosFisicos: string;
  };
  peligrosRiesgos: string;
  matriz: MatrizExamenes;
  matrizObservaciones: MatrizObservaciones;
  fundamentacionTecnica: FundamentacionTecnica;
  recomendacionesRestricciones: RecomendacionRestriccion[];
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
