import type { Env } from '../types/env';
import type { AiKeys, AiProvider } from './aiProviders';
import { decrypt } from './crypto';

const KEY_MAP: Record<keyof AiKeys, string> = {
  gemini: 'gemini_api_key',
  openrouter: 'openrouter_api_key',
  mistral: 'mistral_api_key',
};

async function tryDecrypt(value: string | undefined, encryptionKey: string): Promise<string | undefined> {
  if (!value) return undefined;
  try {
    return await decrypt(value, encryptionKey);
  } catch {
    // Valores guardados antes de activar el cifrado quedan en texto plano;
    // se devuelven tal cual para no romper claves ya configuradas.
    return value;
  }
}

export async function getAiKeys(db: D1Database, env: Env, organizacionId: string): Promise<AiKeys> {
  const { results } = await db
    .prepare("SELECT key, value FROM settings WHERE organizacion_id = ? AND key IN ('gemini_api_key','openrouter_api_key','mistral_api_key')")
    .bind(organizacionId)
    .all<{ key: string; value: string }>();
  const stored = Object.fromEntries(results.map((r) => [r.key, r.value]));
  const [gemini, openrouter, mistral] = await Promise.all([
    tryDecrypt(stored[KEY_MAP.gemini], env.ENCRYPTION_KEY),
    tryDecrypt(stored[KEY_MAP.openrouter], env.ENCRYPTION_KEY),
    tryDecrypt(stored[KEY_MAP.mistral], env.ENCRYPTION_KEY),
  ]);
  return {
    gemini: gemini || env.GEMINI_API_KEY || undefined,
    openrouter: openrouter || env.OPENROUTER_API_KEY || undefined,
    mistral: mistral || env.MISTRAL_API_KEY || undefined,
  };
}

export async function getPrimaryProvider(db: D1Database, organizacionId: string): Promise<AiProvider> {
  const row = await db
    .prepare("SELECT value FROM settings WHERE organizacion_id = ? AND key = 'ai_primary_provider' LIMIT 1")
    .bind(organizacionId)
    .first<{ value: string }>();
  const value = row?.value;
  if (value === 'gemini' || value === 'openrouter' || value === 'mistral') return value;
  return 'gemini';
}

export function providerOrder(primary: AiProvider): AiProvider[] {
  const all: AiProvider[] = ['gemini', 'openrouter', 'mistral'];
  return [primary, ...all.filter((p) => p !== primary)];
}
