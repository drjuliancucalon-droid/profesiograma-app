import { Hono } from 'hono';
import type { HonoEnv } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { generateProfesiogramaPdf, generateOrdenPdf } from '../services/pdf.service';
import { orgId } from '../lib/org';

const pdf = new Hono<HonoEnv>();

pdf.use('*', requireAuth);

// GET /api/pdf/profesiogramas/:id/pdf
pdf.get('/profesiogramas/:id/pdf', async (c) => {
  const id = c.req.param('id');

  const prof = await c.env.DB
    .prepare('SELECT * FROM profesiogramas WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(id, orgId(c)).first<Record<string, unknown>>();
  if (!prof) return c.json({ success: false, error: 'Profesiograma no encontrado' }, 404);

  const empresa = await c.env.DB
    .prepare('SELECT * FROM empresas WHERE id = ? LIMIT 1')
    .bind(prof.empresa_id as string).first<Record<string, unknown>>();

  const profesional = prof.profesional_id
    ? await c.env.DB.prepare('SELECT * FROM profesionales WHERE id = ? LIMIT 1').bind(prof.profesional_id as string).first<Record<string, unknown>>()
    : null;

  const { results: cargoRows } = await c.env.DB
    .prepare('SELECT * FROM cargos WHERE profesiograma_id = ? ORDER BY creado_en')
    .bind(id).all<{ ia_raw_json: string }>();

  const cargos = cargoRows.map((row) => {
    try {
      return JSON.parse(row.ia_raw_json) as Record<string, unknown>;
    } catch {
      return {};
    }
  });

  try {
    const pdfBytes = await generateProfesiogramaPdf(c.env.BROWSER, {
      profesiograma: prof,
      empresa: empresa ?? {},
      profesional,
      cargos,
    });
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="profesiograma-${id}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando PDF';
    return c.json({ success: false, error: msg }, 500);
  }
});

// GET /api/pdf/ordenes/:id/pdf
pdf.get('/ordenes/:id/pdf', async (c) => {
  const id = c.req.param('id');

  const orden = await c.env.DB
    .prepare('SELECT * FROM ordenes_servicio WHERE id = ? AND organizacion_id = ? LIMIT 1')
    .bind(id, orgId(c)).first<Record<string, unknown>>();
  if (!orden) return c.json({ success: false, error: 'Orden no encontrada' }, 404);

  const empresa = await c.env.DB
    .prepare('SELECT * FROM empresas WHERE id = ? LIMIT 1')
    .bind(orden.empresa_id as string).first<Record<string, unknown>>();

  try {
    const pdfBytes = await generateOrdenPdf(c.env.BROWSER, {
      orden,
      empresa: empresa ?? {},
    });
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orden-${id}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando PDF';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default pdf;
