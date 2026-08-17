import { z } from 'zod';

// --- auth ---
export const loginSchema = z.object({
  email: z.string().trim().email('email inválido'),
  password: z.string().min(1, 'contraseña requerida'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token requerido'),
});

export const logoutSchema = z.object({
  refresh_token: z.string().optional(),
});

// --- users ---
export const createUserSchema = z.object({
  email: z.string().trim().email('email inválido'),
  password: z.string().min(8, 'la contraseña debe tener al menos 8 caracteres').max(200),
  nombre: z.string().trim().min(1, 'nombre requerido').max(300),
  rol: z.enum(['admin', 'medico', 'rrhh', 'sst']),
});

// --- empresas ---
export const empresaSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(300),
  nit: z.string().trim().max(50).optional(),
  logo_url: z.string().trim().max(500_000).optional(),
  responsable: z.string().trim().max(300).optional(),
});

// --- profesionales ---
export const profesionalSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(300),
  cedula: z.string().trim().max(50).optional(),
  titulo: z.string().trim().max(300).optional(),
  licencia: z.string().trim().max(300).optional(),
  celular: z.string().trim().max(50).optional(),
  correo: z.union([z.string().trim().email('correo inválido'), z.literal('')]).optional(),
  firma_url: z.string().trim().max(500_000).optional(),
});

// --- ordenes ---
export const ordenSchema = z.object({
  profesiograma_id: z.string().min(1, 'profesiograma_id requerido'),
  empresa_id: z.string().min(1, 'empresa_id requerido'),
  cargo_id: z.string().min(1, 'cargo_id requerido'),
  candidato_nombre: z.string().trim().max(300).optional(),
  candidato_id: z.string().trim().max(50).optional(),
  tipo_momento: z.enum(['I', 'P', 'R', 'PI', 'RL']),
  examenes_json: z.array(z.unknown()).optional(),
});

// --- profesiograma ---
export const profesiogramaGenerateSchema = z.object({
  cargo: z.string().trim().min(1, 'cargo requerido').max(500),
  profesiograma_id: z.string().optional(),
});

export const profesiogramaCreateSchema = z.object({
  empresa_id: z.string().min(1, 'empresa_id requerido'),
  profesional_id: z.string().min(1, 'profesional_id requerido'),
  fecha_emision: z.string().optional(),
  cargos_data: z.array(z.record(z.string(), z.unknown())).min(1, 'cargos_data no puede estar vacío'),
});

// --- organizaciones (solo superadmin) ---
export const createOrgSchema = z.object({
  nombre_organizacion: z.string().trim().min(1, 'nombre de la organización requerido').max(300),
  admin_email: z.string().trim().email('email inválido'),
  admin_nombre: z.string().trim().min(1, 'nombre del admin requerido').max(300),
});

// --- settings ---
export const aiKeysSchema = z.object({
  gemini_api_key: z.string().trim().min(1).max(500).optional(),
  openrouter_api_key: z.string().trim().min(1).max(500).optional(),
  mistral_api_key: z.string().trim().min(1).max(500).optional(),
  primary_provider: z.enum(['gemini', 'openrouter', 'mistral']).optional(),
});
