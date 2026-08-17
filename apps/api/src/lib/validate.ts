import type { Context } from 'hono';
import type { ZodSchema } from 'zod';

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Parsea y valida el body JSON contra un schema Zod. Devuelve una Response 400 lista para retornar si falla. */
export async function parseBody<T>(c: Context, schema: ZodSchema<T>): Promise<ParseResult<T>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ success: false, error: 'JSON inválido' }, 400) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    return { ok: false, response: c.json({ success: false, error: `Datos inválidos: ${detail}` }, 400) };
  }
  return { ok: true, data: result.data };
}
