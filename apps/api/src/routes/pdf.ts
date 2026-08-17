import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { generateProfesiogramaPdf } from '../services/pdf.service';

const pdf = new Hono<{ Bindings: Env }>();

pdf.use('*', requireAuth);

// GET /api/pdf/profesiogramas/:id/pdf
pdf.get('/profesiogramas/:id/pdf', async (c) => {
  const id = c.req.param('id');

  // Obtener profesiograma + cargos
  const prof = await c.env.DB
    .prepare('SELECT * FROM profesiogramas WHERE id = ? LIMIT 1')
    .bind(id).first<Record<string, unknown>>();
  if (!prof) return c.json({ success: false, error: 'Profesiograma no encontrado' }, 404);

  const empresa = await c.env.DB
    .prepare('SELECT * FROM empresas WHERE id = ? LIMIT 1')
    .bind(prof.empresa_id as string).first<Record<string, unknown>>();

  const { results: cargos } = await c.env.DB
    .prepare('SELECT * FROM cargos WHERE profesiograma_id = ? ORDER BY orden_index')
    .bind(id).all<Record<string, unknown>>();

  try {
    const pdfBytes = await generateProfesiogramaPdf(c.env.BROWSER, {
      profesiograma: prof,
      empresa: empresa ?? {},
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
    .prepare('SELECT * FROM ordenes_servicio WHERE id = ? LIMIT 1')
    .bind(id).first<Record<string, unknown>>();
  if (!orden) return c.json({ success: false, error: 'Orden no encontrada' }, 404);

  const empresa = await c.env.DB
    .prepare('SELECT * FROM empresas WHERE id = ? LIMIT 1')
    .bind(orden.empresa_id as string).first<Record<string, unknown>>();

  // HTML minimo para la orden
  const html = `<!DOCTYPE html><html><body style="font-family:Arial;padding:2rem">
    <h1>Orden de Servicio</h1>
    <p><b>Candidato:</b> ${orden.candidato_nombre ?? 'N/A'}</p>
    <p><b>Documento:</b> ${orden.candidato_documento ?? 'N/A'}</p>
    <p><b>Momento:</b> ${orden.momento}</p>
    <p><b>Empresa:</b> ${(empresa?.nombre as string) ?? 'N/A'}</p>
    <p><b>Estado:</b> ${orden.estado}</p>
  </body></html>`;

  try {
    const browser = await (c.env.BROWSER as unknown as { launch: () => Promise<{ newPage: () => Promise<{
      setContent: (h: string, o: object) => Promise<void>;
      pdf: (o: object) => Promise<Uint8Array>;
      close: () => Promise<void>;
    }> }> }).launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBytes = await page.pdf({ format: 'A4' });
    await page.close();
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orden-${id}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando PDF';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default pdf;
