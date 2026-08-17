import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';

const settings = new Hono<HonoEnv>();

settings.use('*', requireAuth, requireRole('admin'));

function mask(value?: string): string | null {
  if (!value) return null;
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

// GET /api/settings/ai-keys — nunca devuelve las keys completas, solo si están configuradas
settings.get('/ai-keys', async (c) => {
  const { results } = await c.env.DB
    .prepare("SELECT key, value FROM settings WHERE key IN ('gemini_api_key','openrouter_api_key','mistral_api_key','ai_primary_provider')")
    .all<{ key: string; value: string }>();
  const stored = Object.fromEntries(results.map((r) => [r.key, r.value]));
  return c.json({
    success: true,
    data: {
      gemini_api_key: mask(stored.gemini_api_key),
      openrouter_api_key: mask(stored.openrouter_api_key),
      mistral_api_key: mask(stored.mistral_api_key),
      primary_provider: stored.ai_primary_provider ?? 'gemini',
      gemini_env_fallback: !!c.env.GEMINI_API_KEY,
    },
  });
});

// PUT /api/settings/ai-keys — actualiza solo los campos enviados (no vacíos)
settings.put('/ai-keys', async (c) => {
  const body = await c.req.json<{
    gemini_api_key?: string;
    openrouter_api_key?: string;
    mistral_api_key?: string;
    primary_provider?: 'gemini' | 'openrouter' | 'mistral';
  }>();
  const user = c.get('user');
  const now = new Date().toISOString();

  const upsert = async (key: string, value: string) => {
    await c.env.DB
      .prepare('INSERT INTO settings (key, value, actualizado_por, actualizado_en) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, actualizado_por=excluded.actualizado_por, actualizado_en=excluded.actualizado_en')
      .bind(key, value, user.sub, now)
      .run();
  };

  if (body.gemini_api_key) await upsert('gemini_api_key', body.gemini_api_key);
  if (body.openrouter_api_key) await upsert('openrouter_api_key', body.openrouter_api_key);
  if (body.mistral_api_key) await upsert('mistral_api_key', body.mistral_api_key);
  if (body.primary_provider) await upsert('ai_primary_provider', body.primary_provider);

  return c.json({ success: true });
});

// GET /api/settings/gemini-models — diagnóstico: lista los modelos Gemini realmente
// disponibles para la key configurada (temporal, para depurar límites de cuota por modelo).
settings.get('/gemini-models', async (c) => {
  const { results } = await c.env.DB
    .prepare("SELECT value FROM settings WHERE key = 'gemini_api_key' LIMIT 1")
    .all<{ value: string }>();
  const key = results[0]?.value || c.env.GEMINI_API_KEY;
  if (!key) return c.json({ success: false, error: 'No hay GEMINI_API_KEY configurada' }, 400);

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await resp.json<{ models?: Array<{ name: string; supportedGenerationMethods?: string[]; displayName?: string }> }>();
  const models = (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({ name: m.name.replace('models/', ''), displayName: m.displayName }));
  return c.json({ success: true, data: models });
});

export default settings;
